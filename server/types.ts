// Common types for File System Converter
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface StoredFile {
  id: string;
  userId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  status: 'uploaded' | 'converted' | 'deleted' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface ConversionJob {
  id: string;
  userId: string;
  fileId: string;
  sourceFormat: string;
  targetFormat: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputFileId?: string;
  outputFileName?: string;
  outputStoredName?: string;
  startedAt: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipHash: string;
  userAgent: string;
  success: boolean;
  metadata: string;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string | null;
  ipHash: string;
  endpoint: string;
  description: string;
  metadata: string;
  createdAt: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONVERSION_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}
