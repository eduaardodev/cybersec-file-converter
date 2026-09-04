import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  // Attach correlation ID to request and response
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  // When response finishes, log structured data
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Skip noisy static asset requests in development
    if (url.startsWith('/@') || url.startsWith('/src') || url.includes('.vite') || url.endsWith('.ico')) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method,
      endpoint: url,
      statusCode,
      durationMs: duration,
    };

    if (statusCode >= 500) {
      console.error(`[HTTP] ${method} ${url} ${statusCode} - ${duration}ms (req: ${requestId.slice(0, 8)})`);
    } else {
      console.log(`[HTTP] ${method} ${url} ${statusCode} - ${duration}ms (req: ${requestId.slice(0, 8)})`);
    }
  });

  next();
}
