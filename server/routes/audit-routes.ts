import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../auth/auth-middleware';
import { DatabaseService } from '../db/database';
import { ConversionQueue } from '../queue/conversion-queue';
import { AuditService } from '../services/audit-service';
import { handleAppError, AppError } from '../errors/app-error';

const router = Router();
const db = DatabaseService.getInstance();
const queue = ConversionQueue.getInstance();
const audit = AuditService.getInstance();

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

// List all users with statistics and status - STRICTLY ADMIN ONLY
router.get('/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = db.getAllUsersWithStats();
    res.json({ users });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Soft-delete / Ban User - STRICTLY ADMIN ONLY
router.post('/admin/users/:id/ban', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { reason } = req.body;

    // Prevent admin self-ban
    if (req.user?.id === targetUserId) {
      throw AppError.forbidden('Você não pode banir a sua própria conta de administrador.');
    }

    const targetUser = db.findUserById(targetUserId);
    if (!targetUser) {
      throw AppError.notFound('Usuário não encontrado.');
    }

    db.banUser(targetUserId, reason);

    audit.logAction({
      userId: req.user?.id,
      action: 'USER_BAN',
      resource: 'user',
      resourceId: targetUserId,
      req,
      success: true,
      metadata: {
        targetUserEmail: targetUser.email,
        targetUserId,
        reason: reason || 'Banned by admin',
      },
    });

    res.json({
      success: true,
      message: `Usuário ${targetUser.email} banido com sucesso.`,
    });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Restore / Unban User - STRICTLY ADMIN ONLY
router.post('/admin/users/:id/unban', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = db.findUserById(targetUserId);
    if (!targetUser) {
      throw AppError.notFound('Usuário não encontrado.');
    }

    db.unbanUser(targetUserId);

    audit.logAction({
      userId: req.user?.id,
      action: 'USER_UNBAN_RESTORE',
      resource: 'user',
      resourceId: targetUserId,
      req,
      success: true,
      metadata: {
        targetUserEmail: targetUser.email,
        targetUserId,
        accountReactivated: true,
      },
    });

    res.json({
      success: true,
      message: `Usuário ${targetUser.email} reativado com sucesso.`,
    });
  } catch (err) {
    handleAppError(err, res);
  }
});

export default router;

