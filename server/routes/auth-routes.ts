import { Router, Request, Response } from 'express';
import { AuthService } from '../auth/auth-service';
import { requireAuth, AuthenticatedRequest } from '../auth/auth-middleware';
import { RateLimiter } from '../security/rate-limiter';
import { AuditService } from '../services/audit-service';
import { handleAppError } from '../errors/app-error';

const router = Router();
const authService = AuthService.getInstance();
const audit = AuditService.getInstance();

// Register
router.post('/register', RateLimiter.authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password, req);
    res.status(201).json(result);
  } catch (err) {
    handleAppError(err, res);
  }
});

// Login
router.post('/login', RateLimiter.authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, req);
    res.json(result);
  } catch (err) {
    handleAppError(err, res);
  }
});

// Logout
router.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    audit.logAction({
      userId: req.user?.id,
      action: 'AUTH_LOGOUT',
      resource: 'user',
      resourceId: req.user?.id,
      req,
      success: true,
      metadata: { email: req.user?.email },
    });
    res.json({ message: 'Successfully logged out' });
  } catch (err) {
    handleAppError(err, res);
  }
});

// Me (current authenticated user profile)
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
