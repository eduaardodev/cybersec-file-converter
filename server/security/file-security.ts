import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { AppError } from '../errors/app-error';
import { AuditService } from '../services/audit-service';

export interface FileValidationResult {
  isValid: boolean;
  sanitizedOriginalName: string;
  safeStoredName: string;
  normalizedExtension: string;
  detectedMime: string;
  error?: AppError;
}

export class FileSecurity {
  private static audit = AuditService.getInstance();

  public static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  public static readonly ALLOWED_EXTENSIONS = new Set([
    '.csv',
    '.json',
    '.txt',
    '.md',
    '.markdown',
    '.yaml',
    '.yml',
    '.html',
    '.pdf',
  ]);

  public static readonly DANGEROUS_EXTENSIONS = new Set([
    '.exe',
    '.sh',
    '.bat',
    '.cmd',
    '.js',
    '.mjs',
    '.py',
    '.php',
    '.vbs',
    '.dll',
    '.bin',
    '.elf',
    '.com',
    '.ps1',
    '.scr',
    '.jar',
    '.apk',
    '.wasm',
    '.msi',
    '.reg',
  ]);

  public static readonly ALLOWED_MIME_TYPES = new Set([
    'text/csv',
    'application/csv',
    'text/plain',
    'application/json',
    'text/markdown',
    'text/x-markdown',
    'application/x-yaml',
    'text/yaml',
    'text/html',
    'application/pdf',
    'application/octet-stream', // often sent by browsers for .csv or .yaml
  ]);

  // Ensure storage directories exist in private local path
  public static initStorageDirectories(): { uploadDir: string; convertedDir: string } {
    const baseDir = path.resolve(process.cwd(), 'storage');
    const uploadDir = path.join(baseDir, 'uploads');
    const convertedDir = path.join(baseDir, 'converted');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(convertedDir)) {
      fs.mkdirSync(convertedDir, { recursive: true });
    }

    return { uploadDir, convertedDir };
  }

  // Detect and block path traversal attempts
  public static checkPathTraversal(filename: string): boolean {
    if (!filename) return false;
    // Check for null bytes, directory separators, relative traversal
    if (filename.includes('\0')) return true;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return true;
    if (filename.includes('%2e%2e') || filename.includes('%2f') || filename.includes('%5c')) return true;
    if (filename.toLowerCase().includes('/etc/') || filename.toLowerCase().includes('c:\\')) return true;
    return false;
  }

  // Sanitize filename to safe alphanumeric + dot + hyphen
  public static sanitizeFilename(rawName: string): string {
    // Extract only basename
    const base = path.basename(rawName);
    // Replace dangerous chars with underscore
    const sanitized = base
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.') // prevent multiple consecutive dots
      .slice(0, 100); // cap length

    return sanitized || 'unnamed_file';
  }

  // Validate uploaded file buffer, extension and metadata
  public static validateFile(options: {
    rawFilename: string;
    mimeType: string;
    size: number;
    buffer?: Buffer;
    userId?: string;
    req?: any;
  }): FileValidationResult {
    const { rawFilename, mimeType, size, buffer, userId, req } = options;

    // 1. Path Traversal Check
    if (this.checkPathTraversal(rawFilename)) {
      this.audit.logSecurityEvent({
        type: 'PATH_TRAVERSAL_ATTEMPT',
        severity: 'critical',
        userId,
        req,
        endpoint: req ? req.originalUrl || req.url : '/upload',
        description: `Path traversal pattern detected in filename: "${rawFilename.slice(0, 50)}"`,
        metadata: { rawFilename },
      });

      return {
        isValid: false,
        sanitizedOriginalName: 'blocked',
        safeStoredName: '',
        normalizedExtension: '',
        detectedMime: mimeType,
        error: AppError.validation('Invalid filename: path traversal sequence detected.'),
      };
    }

    // 2. Extract and check extension
    const ext = path.extname(rawFilename).toLowerCase();

    // Check for dangerous executable extension
    if (this.DANGEROUS_EXTENSIONS.has(ext)) {
      this.audit.logSecurityEvent({
        type: 'DANGEROUS_FILE_EXTENSION',
        severity: 'high',
        userId,
        req,
        endpoint: req ? req.originalUrl || req.url : '/upload',
        description: `Blocked dangerous file extension "${ext}" for file "${rawFilename}"`,
        metadata: { extension: ext, rawFilename },
      });

      return {
        isValid: false,
        sanitizedOriginalName: 'blocked',
        safeStoredName: '',
        normalizedExtension: ext,
        detectedMime: mimeType,
        error: AppError.unsupportedFileType(`File extension "${ext}" is strictly forbidden for security reasons.`),
      };
    }

    // Whitelist check
    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      return {
        isValid: false,
        sanitizedOriginalName: 'unsupported',
        safeStoredName: '',
        normalizedExtension: ext,
        detectedMime: mimeType,
        error: AppError.unsupportedFileType(`Unsupported file extension "${ext}". Allowed: CSV, JSON, TXT, MD, YAML.`),
      };
    }

    // 3. File Size Check
    if (size > this.MAX_FILE_SIZE) {
      this.audit.logSecurityEvent({
        type: 'OVERSIZED_PAYLOAD',
        severity: 'medium',
        userId,
        req,
        endpoint: req ? req.originalUrl || req.url : '/upload',
        description: `Uploaded file size ${size} exceeds limit ${this.MAX_FILE_SIZE}`,
        metadata: { size, maxSize: this.MAX_FILE_SIZE },
      });

      return {
        isValid: false,
        sanitizedOriginalName: 'too_large',
        safeStoredName: '',
        normalizedExtension: ext,
        detectedMime: mimeType,
        error: AppError.fileTooLarge(),
      };
    }

    // 4. MIME Type check
    if (mimeType && !this.ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      return {
        isValid: false,
        sanitizedOriginalName: 'unsupported_mime',
        safeStoredName: '',
        normalizedExtension: ext,
        detectedMime: mimeType,
        error: AppError.unsupportedFileType(`Unsupported MIME type "${mimeType}".`),
      };
    }

    // 5. Content sanity validation (Deep inspection)
    if (buffer) {
      // Check for binary null-byte executable injection inside text/json/csv
      if (['.json', '.csv', '.txt', '.md', '.yaml', '.yml'].includes(ext)) {
        if (buffer.slice(0, 1024).includes(0)) {
          this.audit.logSecurityEvent({
            type: 'CORRUPTED_PAYLOAD',
            severity: 'high',
            userId,
            req,
            endpoint: req ? req.originalUrl || req.url : '/upload',
            description: `Binary/null bytes detected in plain text/JSON file "${rawFilename}"`,
          });

          return {
            isValid: false,
            sanitizedOriginalName: 'corrupted',
            safeStoredName: '',
            normalizedExtension: ext,
            detectedMime: mimeType,
            error: AppError.validation('File content contains binary or corrupted bytes unsuited for text conversion.'),
          };
        }
      }

      // JSON syntactic validation
      if (ext === '.json') {
        try {
          JSON.parse(buffer.toString('utf-8'));
        } catch (err: any) {
          return {
            isValid: false,
            sanitizedOriginalName: 'invalid_json',
            safeStoredName: '',
            normalizedExtension: ext,
            detectedMime: mimeType,
            error: AppError.validation('Malformed JSON syntax: Unable to parse file content.'),
          };
        }
      }
    }

    // Safe random internal name (UUID + extension)
    const sanitizedName = this.sanitizeFilename(rawFilename);
    const safeStoredName = `${crypto.randomUUID()}${ext}`;

    return {
      isValid: true,
      sanitizedOriginalName: sanitizedName,
      safeStoredName,
      normalizedExtension: ext,
      detectedMime: mimeType || 'application/octet-stream',
    };
  }
}
