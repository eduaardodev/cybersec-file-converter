import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../auth/auth-middleware';
import { RateLimiter } from '../security/rate-limiter';
import { DatabaseService } from '../db/database';
import { ConversionQueue } from '../queue/conversion-queue';
import { ConverterRegistry } from '../converters/converter-registry';
import { AuditService } from '../services/audit-service';
import { AppError, handleAppError } from '../errors/app-error';

const router = Router();
const db = DatabaseService.getInstance();
const queue = ConversionQueue.getInstance();
const registry = ConverterRegistry.getInstance();
const audit = AuditService.getInstance();

// Supported transformation matrix
router.get('/capabilities', (req, res) => {
  res.json({
    capabilities: registry.getAllCapabilities(),
  });
});

// Enqueue conversion
router.post('/', requireAuth, RateLimiter.conversionLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId, targetFormat } = req.body;
    if (!fileId || !targetFormat) {
      throw AppError.validation('fileId and targetFormat are required.');
    }

    const userId = req.user!.id;
    const file = db.findFileById(fileId);
    if (!file) {
      throw AppError.notFound('Source file not found.');
    }

    // Strict Authorization check
    if (file.userId !== userId) {
      audit.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'high',
        userId,
        req,
        endpoint: '/api/conversions',
        description: `User ${userId} attempted conversion on unowned file ${fileId}`,
      });
      throw AppError.authorization('You do not have permission to convert this file.');
    }

    const job = await queue.enqueue({
      userId,
      file,
      targetFormat,
    });

    res.status(202).json({
      message: 'Conversion job queued successfully',
      conversion: job,
    });
  } catch (err) {
    handleAppError(err, res);
  }
});

// List user conversions
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversions = db.findConversionsByUserId(req.user!.id);
    res.json({ conversions });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Get conversion details and current status
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversion = db.findConversionById(req.params.id);
    if (!conversion) {
      throw AppError.notFound('Conversion job not found.');
    }

    // Strict Authorization
    if (conversion.userId !== req.user!.id) {
      audit.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'high',
        userId: req.user!.id,
        req,
        endpoint: `/api/conversions/${req.params.id}`,
        description: `User tried to access conversion job ${req.params.id} belonging to ${conversion.userId}`,
      });
      throw AppError.authorization('You are not authorized to view this conversion.');
    }

    res.json({ conversion });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Download converted file
router.get('/:id/download', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversion = db.findConversionById(req.params.id);
    if (!conversion) {
      throw AppError.notFound('Conversion job not found.');
    }

    // Strict Authorization
    if (conversion.userId !== req.user!.id) {
      audit.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'high',
        userId: req.user!.id,
        req,
        endpoint: `/api/conversions/${req.params.id}/download`,
        description: `Unauthorized download attempt for conversion ${req.params.id}`,
      });
      throw AppError.authorization('You are not authorized to download this file.');
    }

    if (conversion.status !== 'completed' || !conversion.outputStoredName) {
      throw AppError.validation('Conversion is not yet completed or has failed.');
    }

    const convertedPath = path.resolve(process.cwd(), 'storage', 'converted', conversion.outputStoredName);
    if (!fs.existsSync(convertedPath)) {
      throw AppError.notFound('Converted file not found on disk.');
    }

    const downloadName = conversion.outputFileName || 'converted_file';

    audit.logAction({
      userId: req.user!.id,
      action: 'FILE_DOWNLOAD',
      resource: 'conversion',
      resourceId: conversion.id,
      req,
      success: true,
      metadata: { filename: downloadName },
    });

    res.download(convertedPath, downloadName, (err) => {
      if (err) {
        console.error('File download streaming error:', err);
      }
    });
  } catch (err) {
    handleAppError(err, res);
  }
});

export default router;
