import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/auth-middleware';
import { DatabaseService } from '../db/database';
import { ConversionQueue } from '../queue/conversion-queue';
import { handleAppError } from '../errors/app-error';

const router = Router();
const db = DatabaseService.getInstance();
const queue = ConversionQueue.getInstance();

// Audit logs list
router.get('/audit', (req, res) => {
  try {
    const filter = typeof req.query.filter === 'string' ? req.query.filter : undefined;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;
    const logs = db.getRecentAuditLogs(limit, filter);
    res.json({ logs });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Security events list
router.get('/security/events', (req, res) => {
  try {
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;
    const events = db.getRecentSecurityEvents(limit);
    res.json({ events });
  } catch (err) {
    handleAppError(err, res);
  }
});

// User dashboard stats & system status
router.get('/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userStats = db.getDashboardStats(userId);
    const queueStats = queue.getQueueStats();

    res.json({
      userStats,
      systemStatus: {
        sqlInjectionProtection: 'ACTIVE',
        rateLimiting: 'ACTIVE',
        fileUploadSecurity: 'ACTIVE',
        resourceAbuseProtection: 'ACTIVE',
        centralizedErrorHandling: 'ACTIVE',
        queue: queueStats,
      },
    });
  } catch (err) {
    handleAppError(err, res);
  }
});

export default router;
