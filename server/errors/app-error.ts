import { Response } from 'express';
import { ErrorCode } from '../types';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, 400, details);
  }

  public static authentication(message: string = 'Authentication required'): AppError {
    return new AppError('AUTHENTICATION_ERROR', message, 401);
  }

  public static authorization(message: string = 'Forbidden: Access denied'): AppError {
    return new AppError('AUTHORIZATION_ERROR', message, 403);
  }

  public static forbidden(message: string = 'Forbidden: Access denied'): AppError {
    return new AppError('AUTHORIZATION_ERROR', message, 403);
  }

  public static fileTooLarge(message: string = 'The uploaded file exceeds the allowed size limit (10 MB).'): AppError {
    return new AppError('FILE_TOO_LARGE', message, 413);
  }

  public static unsupportedFileType(message: string = 'Unsupported file type or format.'): AppError {
    return new AppError('UNSUPPORTED_FILE_TYPE', message, 415);
  }

  public static rateLimitExceeded(message: string = 'Too many requests. Please try again later.'): AppError {
    return new AppError('RATE_LIMIT_EXCEEDED', message, 429);
  }

  public static conversionFailed(message: string = 'Conversion failed due to invalid source structure or parsing error.'): AppError {
    return new AppError('CONVERSION_FAILED', message, 422);
  }

  public static notFound(message: string = 'Resource not found'): AppError {
    return new AppError('RESOURCE_NOT_FOUND', message, 404);
  }

  public static internal(message: string = 'An unexpected internal error occurred.'): AppError {
    return new AppError('INTERNAL_SERVER_ERROR', message, 500);
  }
}

export function handleAppError(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Generic unhandled error - strictly hide stack traces & internal paths
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred. Please try again later.',
    },
  });
}
