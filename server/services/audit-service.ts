import crypto from 'crypto';
import { Request } from 'express';
import { DatabaseService } from '../db/database';
import { AuditLog, SecurityEvent } from '../types';

export class AuditService {
  private static instance: AuditService;
  private db = DatabaseService.getInstance();

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  // Anonymize IP address with SHA-256 hash prefix for privacy
  public static hashIp(ip: string): string {
    const cleanIp = ip.replace(/^::ffff:/, '') || '127.0.0.1';
    return crypto.createHash('sha256').update(cleanIp).digest('hex').slice(0, 16);
  }

  public static getRequestIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  }

  public static sanitizeUserAgent(ua?: string): string {
    if (!ua) return 'unknown';
    return ua.slice(0, 80);
  }

  // Filter sensitive fields from metadata (passwords, tokens, file contents)
  private sanitizeMetadata(meta: Record<string, unknown>): string {
    const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'buffer', 'content'];
    const safe: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(meta)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        safe[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        safe[key] = JSON.parse(JSON.stringify(value));
      } else {
        safe[key] = value;
      }
    }
    return JSON.stringify(safe);
  }

  public logAction(options: {
    userId?: string | null;
    action: string;
    resource: string;
    resourceId?: string | null;
    req?: Request;
    success: boolean;
    metadata?: Record<string, unknown>;
  }): AuditLog {
    const ip = options.req ? AuditService.getRequestIp(options.req) : '127.0.0.1';
    const ua = options.req ? AuditService.sanitizeUserAgent(options.req.headers['user-agent']) : 'internal';

    const log: AuditLog = {
      id: crypto.randomUUID(),
      userId: options.userId || null,
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId || null,
      ipHash: AuditService.hashIp(ip),
      userAgent: ua,
      success: options.success,
      metadata: this.sanitizeMetadata(options.metadata || {}),
      createdAt: new Date().toISOString(),
    };

    try {
      this.db.createAuditLog(log);
    } catch (err) {
      console.error('AuditLog insert failure:', err);
    }

    return log;
  }

  public logSecurityEvent(options: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string | null;
    req?: Request;
    endpoint: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): SecurityEvent {
    const ip = options.req ? AuditService.getRequestIp(options.req) : '127.0.0.1';

    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type: options.type,
      severity: options.severity,
      userId: options.userId || null,
      ipHash: AuditService.hashIp(ip),
      endpoint: options.endpoint,
      description: options.description,
      metadata: this.sanitizeMetadata(options.metadata || {}),
      createdAt: new Date().toISOString(),
    };

    try {
      this.db.createSecurityEvent(event);
    } catch (err) {
      console.error('SecurityEvent insert failure:', err);
    }

    return event;
  }
}
