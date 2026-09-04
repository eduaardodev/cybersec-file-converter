export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  isBanned?: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  isBanned: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
  conversionsCount: number;
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
  userEmail?: string;
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
  success: boolean | number;
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

export interface DashboardStats {
  userStats: {
    totalConversions: number;
    successfulConversions: number;
    failedConversions: number;
    filesUploaded: number;
  };
  systemStatus: {
    sqlInjectionProtection: string;
    rateLimiting: string;
    fileUploadSecurity: string;
    resourceAbuseProtection: string;
    centralizedErrorHandling: string;
    queue: {
      enqueuedCount: number;
      activeWorkers: number;
      maxGlobalConcurrency: number;
      maxUserConcurrency: number;
    };
  };
}

export interface ConversionCapability {
  source: string;
  targets: string[];
}
