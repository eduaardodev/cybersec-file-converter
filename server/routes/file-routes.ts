import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../auth/auth-middleware';
import { RateLimiter } from '../security/rate-limiter';
import { FileSecurity } from '../security/file-security';
import { DatabaseService } from '../db/database';
import { AuditService } from '../services/audit-service';
import { AppError, handleAppError } from '../errors/app-error';
import { StoredFile } from '../types';

const router = Router();
const db = DatabaseService.getInstance();
const audit = AuditService.getInstance();

// Configure multer memory storage with 15MB hard limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB maximum
  },
});

const { uploadDir } = FileSecurity.initStorageDirectories();

// Upload file
router.post(
  '/upload',
  requireAuth,
  RateLimiter.uploadLimiter,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        throw AppError.validation('No file was provided in the upload request.');
      }

      const userId = req.user!.id;
      const rawFilename = req.file.originalname;
      const mimeType = req.file.mimetype;
      const size = req.file.size;
      const buffer = req.file.buffer;

      // Validate through FileSecurity pipeline
      const validation = FileSecurity.validateFile({
        rawFilename,
        mimeType,
        size,
        buffer,
        userId,
        req,
      });

      if (!validation.isValid) {
        audit.logAction({
          userId,
          action: 'FILE_UPLOAD_REJECTED',
          resource: 'file',
          req,
          success: false,
          metadata: {
            rawFilename: rawFilename.slice(0, 80),
            reason: validation.error?.message,
            mimeType,
            size,
          },
        });
        throw validation.error || AppError.validation('File rejected by security validation.');
      }

      // Store file with safe random UUID name in private storage
      const destinationPath = path.join(uploadDir, validation.safeStoredName);
      fs.writeFileSync(destinationPath, buffer);

      const fileRecord: StoredFile = {
        id: crypto.randomUUID(),
        userId,
        originalName: validation.sanitizedOriginalName,
        storedName: validation.safeStoredName,
        mimeType: validation.detectedMime,
        size,
        status: 'uploaded',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      db.createFile(fileRecord);

      audit.logAction({
        userId,
        action: 'FILE_UPLOAD_SUCCESS',
        resource: 'file',
        resourceId: fileRecord.id,
        req,
        success: true,
        metadata: {
          originalName: fileRecord.originalName,
          size: fileRecord.size,
          mimeType: fileRecord.mimeType,
        },
      });

      res.status(201).json({
        message: 'File uploaded and validated successfully',
        file: fileRecord,
      });
    } catch (err) {
      handleAppError(err, res);
    }
  }
);

// List current user's files
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = db.findFilesByUserId(req.user!.id);
    res.json({ files });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Get single file info (Strict Authorization: check ownership)
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const file = db.findFileById(req.params.id);
    if (!file) {
      throw AppError.notFound('File not found');
    }

    if (file.userId !== req.user!.id) {
      audit.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'high',
        userId: req.user!.id,
        req,
        endpoint: `/api/files/${req.params.id}`,
        description: `User tried to access file ${req.params.id} belonging to user ${file.userId}`,
      });
      throw AppError.authorization('You are not authorized to view this file.');
    }

    res.json({ file });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Delete file
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const file = db.findFileById(req.params.id);
    if (!file) {
      throw AppError.notFound('File not found');
    }

    if (file.userId !== req.user!.id) {
      audit.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'high',
        userId: req.user!.id,
        req,
        endpoint: `/api/files/${req.params.id}`,
        description: `User tried to delete file ${req.params.id} belonging to user ${file.userId}`,
      });
      throw AppError.authorization('You are not authorized to delete this file.');
    }

    // Delete disk file safely
    const filePath = path.join(uploadDir, file.storedName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to unlink file on disk:', e);
      }
    }

    db.deleteFile(file.id);

    audit.logAction({
      userId: req.user!.id,
      action: 'FILE_DELETE',
      resource: 'file',
      resourceId: file.id,
      req,
      success: true,
      metadata: { originalName: file.originalName },
    });

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    handleAppError(err, res);
  }
});

export default router;
