import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../auth/auth-middleware';
import { DatabaseService } from '../db/database';
import { ConversionQueue } from '../queue/conversion-queue';
import { handleAppError } from '../errors/app-error';

const router = Router();
const db = DatabaseService.getInstance();
const queue = ConversionQueue.getInstance();

// Audit logs list - STRICTLY ADMIN ONLY
router.get('/audit', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const filter = typeof req.query.filter === 'string' ? req.query.filter : undefined;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;
    const logs = db.getRecentAuditLogs(limit, filter);
    res.json({ logs });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Security events list - STRICTLY ADMIN ONLY
router.get('/security/events', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;
    const events = db.getRecentSecurityEvents(limit);
    res.json({ events });
  } catch (err) {
    handleAppError(err, res);
  }
});

// User dashboard stats - Technical systemStatus only provided to admin role
router.get('/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userStats = db.getDashboardStats(userId);
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      // Clean non-technical metrics for regular user
      return res.json({
        userStats: {
          totalConversions: userStats.totalConversions,
          successfulConversions: userStats.successfulConversions,
          failedConversions: userStats.failedConversions,
          filesUploaded: userStats.filesUploaded,
        },
      });
    }

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

