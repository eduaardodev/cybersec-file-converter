import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { ConverterRegistry } from '../converters/converter-registry';
import { AuditService } from '../services/audit-service';
import { ConversionJob, StoredFile } from '../types';
import { AppError } from '../errors/app-error';

interface QueueTask {
  conversionId: string;
  userId: string;
  fileId: string;
  sourceFormat: string;
  targetFormat: string;
  enqueuedAt: number;
}

export class ConversionQueue {
  private static instance: ConversionQueue;
  private queue: QueueTask[] = [];
  private activeJobsCount = 0;
  private userActiveCount: Map<string, number> = new Map();

  // Concurrency & abuse configuration
  private readonly maxGlobalConcurrency = 4;
  private readonly maxUserConcurrency = 2;
  private readonly jobTimeoutMs = 30000; // 30 seconds

  private db = DatabaseService.getInstance();
  private registry = ConverterRegistry.getInstance();
  private audit = AuditService.getInstance();

  public static getInstance(): ConversionQueue {
    if (!ConversionQueue.instance) {
      ConversionQueue.instance = new ConversionQueue();
    }
    return ConversionQueue.instance;
  }

  // Enqueue a conversion job
  public async enqueue(options: {
    userId: string;
    file: StoredFile;
    targetFormat: string;
  }): Promise<ConversionJob> {
    const { userId, file, targetFormat } = options;

    // Check user active conversions limit
    const currentUserActive = this.userActiveCount.get(userId) || 0;
    if (currentUserActive >= this.maxUserConcurrency) {
      this.audit.logSecurityEvent({
        type: 'RESOURCE_ABUSE_PREVENTION',
        severity: 'medium',
        userId,
        endpoint: '/api/conversions',
        description: `User exceeded maximum concurrent conversion limit (${this.maxUserConcurrency}).`,
        metadata: { currentActive: currentUserActive, maxAllowed: this.maxUserConcurrency },
      });

      throw AppError.validation(
        `Concurrency limit reached: You have ${currentUserActive} conversions currently processing. Maximum allowed is ${this.maxUserConcurrency}. Please wait for them to finish.`
      );
    }

    // Check if converter is available
    const ext = path.extname(file.originalName).toLowerCase().replace(/^\./, '');
    const cleanTarget = targetFormat.toLowerCase().replace(/^\./, '');

    const converter = this.registry.findConverter(ext, cleanTarget);
    if (!converter) {
      throw AppError.unsupportedFileType(
        `Conversion from "${ext.toUpperCase()}" to "${cleanTarget.toUpperCase()}" is not supported.`
      );
    }

    // Create persistent job record in DB
    const conversionId = crypto.randomUUID();
    const job: ConversionJob = {
      id: conversionId,
      userId,
      fileId: file.id,
      sourceFormat: ext,
      targetFormat: cleanTarget,
      status: 'pending',
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.db.createConversion(job);

    this.audit.logAction({
      userId,
      action: 'CONVERSION_QUEUED',
      resource: 'conversion',
      resourceId: conversionId,
      success: true,
      metadata: { fileId: file.id, sourceFormat: ext, targetFormat: cleanTarget },
    });

    // Add task to queue
    this.queue.push({
      conversionId,
      userId,
      fileId: file.id,
      sourceFormat: ext,
      targetFormat: cleanTarget,
      enqueuedAt: Date.now(),
    });

    // Trigger queue processing worker
    process.nextTick(() => this.processNext());

    return job;
  }

  // Worker loop pulling and executing tasks with concurrency governance
  private async processNext(): Promise<void> {
    if (this.queue.length === 0) return;
    if (this.activeJobsCount >= this.maxGlobalConcurrency) return;

    // Find first task whose user has not exceeded maxUserConcurrency
    const taskIndex = this.queue.findIndex((task) => {
      const userActive = this.userActiveCount.get(task.userId) || 0;
      return userActive < this.maxUserConcurrency;
    });

    if (taskIndex === -1) return; // All tasks in queue belong to saturated users

    const [task] = this.queue.splice(taskIndex, 1);

    // Track concurrency
    this.activeJobsCount++;
    this.userActiveCount.set(task.userId, (this.userActiveCount.get(task.userId) || 0) + 1);

    // Update job status to 'processing'
    this.db.updateConversion({
      id: task.conversionId,
      status: 'processing',
    });

    // Execute job with strict timeout
    try {
      await this.executeJobWithTimeout(task);
    } catch (err: any) {
      console.error(`Conversion job ${task.conversionId} failed:`, err);
    } finally {
      // Release concurrency counters
      this.activeJobsCount--;
      const current = this.userActiveCount.get(task.userId) || 1;
      if (current <= 1) {
        this.userActiveCount.delete(task.userId);
      } else {
        this.userActiveCount.set(task.userId, current - 1);
      }

      // Chain process next task in queue
      process.nextTick(() => this.processNext());
    }
  }

  private async executeJobWithTimeout(task: QueueTask): Promise<void> {
    const file = this.db.findFileById(task.fileId);
    if (!file) {
      this.failJob(task.conversionId, task.userId, 'FILE_NOT_FOUND', 'Source file was deleted or cannot be found.');
      return;
    }

    const uploadPath = path.resolve(process.cwd(), 'storage', 'uploads', file.storedName);
    if (!fs.existsSync(uploadPath)) {
      this.failJob(task.conversionId, task.userId, 'FILE_MISSING_DISK', 'File does not exist on disk.');
      return;
    }

    const conversionPromise = (async () => {
      const inputBuffer = fs.readFileSync(uploadPath);
      const result = await this.registry.execute(
        task.sourceFormat,
        task.targetFormat,
        inputBuffer,
        file.originalName
      );

      // Save converted output safely to private storage
      const convertedDir = path.resolve(process.cwd(), 'storage', 'converted');
      const outputStoredName = `${crypto.randomUUID()}.${result.outputExtension}`;
      const outputPath = path.join(convertedDir, outputStoredName);

      fs.writeFileSync(outputPath, result.buffer);

      // Create new File entry for converted file
      const outputFileId = crypto.randomUUID();
      const outputFile: StoredFile = {
        id: outputFileId,
        userId: task.userId,
        originalName: result.suggestedFilename,
        storedName: outputStoredName,
        mimeType: result.mimeType,
        size: result.buffer.length,
        status: 'converted',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      this.db.createFile(outputFile);

      // Update Conversion record to completed
      this.db.updateConversion({
        id: task.conversionId,
        status: 'completed',
        outputFileId,
        outputFileName: result.suggestedFilename,
        outputStoredName,
        completedAt: new Date().toISOString(),
      });

      this.audit.logAction({
        userId: task.userId,
        action: 'CONVERSION_SUCCESS',
        resource: 'conversion',
        resourceId: task.conversionId,
        success: true,
        metadata: {
          outputFileName: result.suggestedFilename,
          outputSize: result.buffer.length,
          durationMs: Date.now() - task.enqueuedAt,
        },
      });
    })();

    // Timeout guard promise
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Conversion timed out after ${this.jobTimeoutMs / 1000}s limit.`));
      }, this.jobTimeoutMs);
      conversionPromise.finally(() => clearTimeout(timer));
    });

    try {
      await Promise.race([conversionPromise, timeoutPromise]);
    } catch (err: any) {
      const isTimeout = err.message && err.message.includes('timed out');
      this.failJob(
        task.conversionId,
        task.userId,
        isTimeout ? 'CONVERSION_TIMEOUT' : 'CONVERSION_FAILED',
        err.message || 'Conversion execution failed'
      );
    }
  }

  private failJob(conversionId: string, userId: string, errorCode: string, errorMessage: string): void {
    this.db.updateConversion({
      id: conversionId,
      status: 'failed',
      errorCode,
      errorMessage,
      completedAt: new Date().toISOString(),
    });

    this.audit.logAction({
      userId,
      action: 'CONVERSION_FAILED',
      resource: 'conversion',
      resourceId: conversionId,
      success: false,
      metadata: { errorCode, errorMessage },
    });
  }

  // Status inspection for demo and monitoring
  public getQueueStats(): {
    enqueuedCount: number;
    activeWorkers: number;
    maxGlobalConcurrency: number;
    maxUserConcurrency: number;
  } {
    return {
      enqueuedCount: this.queue.length,
      activeWorkers: this.activeJobsCount,
      maxGlobalConcurrency: this.maxGlobalConcurrency,
      maxUserConcurrency: this.maxUserConcurrency,
    };
  }
}
