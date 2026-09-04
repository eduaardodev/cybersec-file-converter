import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit-service';

interface RateLimitConfig {
  windowMs: number; // Duration of window in ms
  max: number; // Max requests allowed in window
  keyGenerator?: (req: Request) => string;
  name: string;
}

interface RateLimitRecord {
  timestamps: number[];
}

export class RateLimiter {
  private static store: Map<string, RateLimitRecord> = new Map();
  private static audit = AuditService.getInstance();

  // Periodically purge expired records every 2 minutes
  static {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of RateLimiter.store.entries()) {
        const active = record.timestamps.filter((t) => now - t < 120000);
        if (active.length === 0) {
          RateLimiter.store.delete(key);
        } else {
          record.timestamps = active;
        }
      }
    }, 120000).unref();
  }

  public static create(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const now = Date.now();
      const ip = AuditService.getRequestIp(req);
      const identifier = config.keyGenerator ? config.keyGenerator(req) : ip;
      const key = `${config.name}:${identifier}`;

      let record = RateLimiter.store.get(key);
      if (!record) {
        record = { timestamps: [] };
        RateLimiter.store.set(key, record);
      }

      // Filter timestamps within window
      const windowStart = now - config.windowMs;
      record.timestamps = record.timestamps.filter((t) => t > windowStart);

      const remaining = Math.max(0, config.max - record.timestamps.length);
      const resetTime = Math.ceil(((record.timestamps[0] ? record.timestamps[0] + config.windowMs : now + config.windowMs) - now) / 1000);

      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime > 0 ? resetTime : Math.ceil(config.windowMs / 1000));

      if (record.timestamps.length >= config.max) {
        // Rate limit exceeded!
        const userId = (req as any).user?.id || null;

        // Log audit and security event
        RateLimiter.audit.logAction({
          userId,
          action: 'RATE_LIMIT_TRIGGERED',
          resource: 'rate_limiter',
          resourceId: config.name,
          req,
          success: false,
          metadata: {
            limiter: config.name,
            max: config.max,
            windowMs: config.windowMs,
            requestsInWindow: record.timestamps.length,
          },
        });

        RateLimiter.audit.logSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          severity: 'medium',
          userId,
          req,
          endpoint: req.originalUrl || req.url,
          description: `Exceeded ${config.name} limit (${config.max} requests per ${config.windowMs / 1000}s)`,
          metadata: {
            limiter: config.name,
            totalHits: record.timestamps.length,
          },
        });

        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        });
        return;
      }

      record.timestamps.push(now);
      next();
    };
  }

  // Preset limiters according to specification:
  // 1. Auth/Login: 5 attempts / minute / IP
  public static authLimiter = RateLimiter.create({
    name: 'auth',
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => AuditService.getRequestIp(req),
  });

  // 2. Upload: 10 uploads / minute / user (or IP)
  public static uploadLimiter = RateLimiter.create({
    name: 'upload',
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => (req as any).user?.id || AuditService.getRequestIp(req),
  });

  // 3. Conversion: 20 conversions / minute / user (or IP)
  public static conversionLimiter = RateLimiter.create({
    name: 'conversion',
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => (req as any).user?.id || AuditService.getRequestIp(req),
  });

  // 4. General API: 100 requests / minute / user or IP
  public static generalLimiter = RateLimiter.create({
    name: 'api',
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (req) => (req as any).user?.id || AuditService.getRequestIp(req),
  });
}
