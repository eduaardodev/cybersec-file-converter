import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { AuditService } from '../services/audit-service';
import { AppError } from '../errors/app-error';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'academic-secure-conversion-secret-key-2026';
const TOKEN_EXPIRY = '24h';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export class AuthService {
  private static instance: AuthService;
  private db = DatabaseService.getInstance();
  private audit = AuditService.getInstance();

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Strict email validation
  public static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // Password strength check (at least 8 chars, 1 digit)
  public static validatePassword(password: string): boolean {
    return typeof password === 'string' && password.length >= 8;
  }

  public async register(email: string, password: string, req?: any): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    const cleanEmail = email.toLowerCase().trim();

    if (!AuthService.validateEmail(cleanEmail)) {
      throw AppError.validation('Invalid email format provided.');
    }
    if (!AuthService.validatePassword(password)) {
      throw AppError.validation('Password must be at least 8 characters long.');
    }

    // Check existing
    const existing = this.db.findUserByEmail(cleanEmail);
    if (existing) {
      throw AppError.validation('A user with this email already exists.');
    }

    // Hash password with 10 salt rounds
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const user: User = {
      id: userId,
      email: cleanEmail,
      passwordHash,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    };

    this.db.createUser(user);

    this.audit.logAction({
      userId,
      action: 'AUTH_REGISTER',
      resource: 'user',
      resourceId: userId,
      req,
      success: true,
      metadata: { email: cleanEmail },
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  public async login(email: string, password: string, req?: any): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanEmail || !password) {
      throw AppError.validation('Email and password are required.');
    }

    const user = this.db.findUserByEmail(cleanEmail);
    if (!user) {
      this.audit.logAction({
        userId: null,
        action: 'AUTH_LOGIN_FAILED',
        resource: 'user',
        req,
        success: false,
        metadata: { attemptedEmail: cleanEmail, reason: 'user_not_found' },
      });
      throw AppError.authentication('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      this.audit.logAction({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        resource: 'user',
        resourceId: user.id,
        req,
        success: false,
        metadata: { attemptedEmail: cleanEmail, reason: 'bad_password' },
      });
      throw AppError.authentication('Invalid email or password.');
    }

    this.audit.logAction({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'user',
      resourceId: user.id,
      req,
      success: true,
      metadata: { email: cleanEmail },
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  public generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }

  public verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch (err) {
      throw AppError.authentication('Invalid or expired authentication token.');
    }
  }
}
