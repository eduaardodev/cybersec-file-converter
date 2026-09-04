import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth-service';
import { DatabaseService } from '../db/database';
import { AppError } from '../errors/app-error';
import { User } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'passwordHash'>;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.authentication('Authorization token missing or invalid format.');
  }

  const token = authHeader.slice(7).trim();
  const authService = AuthService.getInstance();
  const db = DatabaseService.getInstance();

  try {
    const payload = authService.verifyToken(token);
    const user = db.findUserById(payload.userId);
    if (!user) {
      throw AppError.authentication('User associated with token no longer exists.');
    }

    if (user.isBanned) {
      throw AppError.forbidden('Esta conta foi suspensa pelo administrador.');
    }

    const { passwordHash: _, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw AppError.authentication('Invalid or expired authentication token.');
  }
}

// Optional auth helper (for public or demo routes that can benefit from knowing user if present)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7).trim();
      const payload = AuthService.getInstance().verifyToken(token);
      const user = DatabaseService.getInstance().findUserById(payload.userId);
      if (user) {
        const { passwordHash: _, ...safeUser } = user;
        req.user = safeUser;
      }
    } catch {
      // ignore
    }
  }
  next();
}

// Require admin privilege for audit and security testing tools
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      throw AppError.authorization('Acesso restrito: Privilégios de Administrador são necessários para visualizar auditoria.');
    }
    next();
  });
}

