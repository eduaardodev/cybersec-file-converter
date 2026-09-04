import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DatabaseService } from './server/db/database';
import { FileSecurity } from './server/security/file-security';
import { requestLogger } from './server/logger/request-logger';
import { handleAppError, AppError } from './server/errors/app-error';

// Import Route Handlers
import authRoutes from './server/routes/auth-routes';
import fileRoutes from './server/routes/file-routes';
import conversionRoutes from './server/routes/conversion-routes';
import auditRoutes from './server/routes/audit-routes';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Initialize DB and Storage
  const db = DatabaseService.getInstance();
  await db.init();
  FileSecurity.initStorageDirectories();

  // Core Middlewares
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(requestLogger);

  // Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // API Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'File System Converter API',
      timestamp: new Date().toISOString(),
      security: {
        sqlInjectionProtection: 'ACTIVE (Parameterized Queries)',
        rateLimiting: 'ACTIVE (Sliding Window)',
        fileSecurity: 'ACTIVE (Path Traversal & Mime Guard)',
        concurrencyGovernor: 'ACTIVE (Worker Queue)',
      },
    });
  });

  // Mount API Sub-Routers
  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/conversions', conversionRoutes);
  app.use('/api', auditRoutes);

  // Fallback 404 for undefined /api routes
  app.use('/api/*', (req: Request, res: Response) => {
    handleAppError(AppError.notFound(`Endpoint "${req.originalUrl}" does not exist.`), res);
  });

  // Vite middleware for frontend client in development, or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized Express Error Handler
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    handleAppError(err, res);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 File System Converter API running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});
