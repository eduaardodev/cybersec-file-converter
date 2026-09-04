import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { User, StoredFile, ConversionJob, AuditLog, SecurityEvent } from '../types';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private dbFilePath: string;

  private constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'converter.db');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async init(): Promise<void> {
    if (this.db) return;

    this.SQL = await initSqlJs();

    if (fs.existsSync(this.dbFilePath)) {
      const fileBuffer = fs.readFileSync(this.dbFilePath);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
      this.persist();
    }

    this.runMigrations();
  }

  private persist(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbFilePath, buffer);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Create tables with parameterized statements and indexes
    this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        originalName TEXT NOT NULL,
        storedName TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        size INTEGER NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS conversions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        fileId TEXT NOT NULL,
        sourceFormat TEXT NOT NULL,
        targetFormat TEXT NOT NULL,
        status TEXT NOT NULL,
        outputFileId TEXT,
        outputFileName TEXT,
        outputStoredName TEXT,
        startedAt TEXT NOT NULL,
        completedAt TEXT,
        errorCode TEXT,
        errorMessage TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (fileId) REFERENCES files (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        userId TEXT,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resourceId TEXT,
        ipHash TEXT NOT NULL,
        userAgent TEXT NOT NULL,
        success INTEGER NOT NULL,
        metadata TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS security_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        userId TEXT,
        ipHash TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_files_user ON files (userId);
      CREATE INDEX IF NOT EXISTS idx_conversions_user ON conversions (userId);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_security_created ON security_events (createdAt DESC);
    `);

    this.persist();
  }

  // Safe parameterized query executing prepared statement
  public query<T>(sql: string, params: (string | number | boolean | null)[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');

    // Convert boolean to number (1/0) for SQLite compatibility
    const sanitizedParams = params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(sanitizedParams);
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  public queryOne<T>(sql: string, params: (string | number | boolean | null)[] = []): T | null {
    const results = this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  // Safe parameterized execute
  public execute(sql: string, params: (string | number | boolean | null)[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    const sanitizedParams = params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(sanitizedParams);
      stmt.step();
    } finally {
      stmt.free();
    }
    this.persist();
  }

  // USER REPOSITORY
  public createUser(user: User): void {
    this.execute(
      `INSERT INTO users (id, email, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.passwordHash, user.role, user.createdAt, user.updatedAt]
    );
  }

  public findUserByEmail(email: string): User | null {
    return this.queryOne<User>(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
  }

  public findUserById(id: string): User | null {
    return this.queryOne<User>(`SELECT * FROM users WHERE id = ?`, [id]);
  }

  // FILE REPOSITORY
  public createFile(file: StoredFile): void {
    this.execute(
      `INSERT INTO files (id, userId, originalName, storedName, mimeType, size, status, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [file.id, file.userId, file.originalName, file.storedName, file.mimeType, file.size, file.status, file.createdAt, file.expiresAt]
    );
  }

  public findFileById(id: string): StoredFile | null {
    return this.queryOne<StoredFile>(`SELECT * FROM files WHERE id = ?`, [id]);
  }

  public findFilesByUserId(userId: string): StoredFile[] {
    return this.query<StoredFile>(`SELECT * FROM files WHERE userId = ? ORDER BY createdAt DESC`, [userId]);
  }

  public deleteFile(id: string): void {
    this.execute(`DELETE FROM files WHERE id = ?`, [id]);
  }

  // CONVERSION REPOSITORY
  public createConversion(conversion: ConversionJob): void {
    this.execute(
      `INSERT INTO conversions (id, userId, fileId, sourceFormat, targetFormat, status, outputFileId, outputFileName, outputStoredName, startedAt, completedAt, errorCode, errorMessage, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversion.id,
        conversion.userId,
        conversion.fileId,
        conversion.sourceFormat,
        conversion.targetFormat,
        conversion.status,
        conversion.outputFileId || null,
        conversion.outputFileName || null,
        conversion.outputStoredName || null,
        conversion.startedAt,
        conversion.completedAt || null,
        conversion.errorCode || null,
        conversion.errorMessage || null,
        conversion.createdAt,
      ]
    );
  }

  public updateConversion(conversion: Partial<ConversionJob> & { id: string }): void {
    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (conversion.status !== undefined) {
      fields.push('status = ?');
      values.push(conversion.status);
    }
    if (conversion.outputFileId !== undefined) {
      fields.push('outputFileId = ?');
      values.push(conversion.outputFileId);
    }
    if (conversion.outputFileName !== undefined) {
      fields.push('outputFileName = ?');
      values.push(conversion.outputFileName);
    }
    if (conversion.outputStoredName !== undefined) {
      fields.push('outputStoredName = ?');
      values.push(conversion.outputStoredName);
    }
    if (conversion.completedAt !== undefined) {
      fields.push('completedAt = ?');
      values.push(conversion.completedAt);
    }
    if (conversion.errorCode !== undefined) {
      fields.push('errorCode = ?');
      values.push(conversion.errorCode);
    }
    if (conversion.errorMessage !== undefined) {
      fields.push('errorMessage = ?');
      values.push(conversion.errorMessage);
    }

    if (fields.length === 0) return;

    values.push(conversion.id);
    this.execute(`UPDATE conversions SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  public findConversionById(id: string): ConversionJob | null {
    return this.queryOne<ConversionJob>(`SELECT * FROM conversions WHERE id = ?`, [id]);
  }

  public findConversionsByUserId(userId: string): ConversionJob[] {
    return this.query<ConversionJob>(`SELECT * FROM conversions WHERE userId = ? ORDER BY createdAt DESC`, [userId]);
  }

  public getAllConversionsWithUser(limit: number = 200): (ConversionJob & { userEmail?: string })[] {
    return this.query<ConversionJob & { userEmail?: string }>(
      `SELECT c.*, u.email as userEmail 
       FROM conversions c 
       LEFT JOIN users u ON c.userId = u.id 
       ORDER BY c.createdAt DESC 
       LIMIT ?`,
      [limit]
    );
  }

  public countUserActiveConversions(userId: string): number {
    const res = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM conversions WHERE userId = ? AND status IN ('pending', 'processing')`,
      [userId]
    );
    return res?.count || 0;
  }

  // AUDIT LOG REPOSITORY
  public createAuditLog(log: AuditLog): void {
    this.execute(
      `INSERT INTO audit_logs (id, userId, action, resource, resourceId, ipHash, userAgent, success, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.id, log.userId, log.action, log.resource, log.resourceId, log.ipHash, log.userAgent, log.success ? 1 : 0, log.metadata, log.createdAt]
    );
  }

  public getRecentAuditLogs(limit: number = 100, filterType?: string): AuditLog[] {
    if (filterType && filterType !== 'ALL') {
      return this.query<AuditLog>(
        `SELECT * FROM audit_logs WHERE action LIKE ? ORDER BY createdAt DESC LIMIT ?`,
        [`%${filterType}%`, limit]
      );
    }
    return this.query<AuditLog>(`SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT ?`, [limit]);
  }

  // SECURITY EVENT REPOSITORY
  public createSecurityEvent(event: SecurityEvent): void {
    this.execute(
      `INSERT INTO security_events (id, type, severity, userId, ipHash, endpoint, description, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [event.id, event.type, event.severity, event.userId, event.ipHash, event.endpoint, event.description, event.metadata, event.createdAt]
    );
  }

  public getRecentSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.query<SecurityEvent>(`SELECT * FROM security_events ORDER BY createdAt DESC LIMIT ?`, [limit]);
  }

  // AGGREGATE STATS
  public getDashboardStats(userId: string): {
    totalConversions: number;
    successfulConversions: number;
    failedConversions: number;
    filesUploaded: number;
  } {
    const total = this.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM conversions WHERE userId = ?`, [userId])?.count || 0;
    const success = this.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM conversions WHERE userId = ? AND status = 'completed'`, [userId])?.count || 0;
    const failed = this.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM conversions WHERE userId = ? AND status = 'failed'`, [userId])?.count || 0;
    const files = this.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM files WHERE userId = ?`, [userId])?.count || 0;

    return {
      totalConversions: total,
      successfulConversions: success,
      failedConversions: failed,
      filesUploaded: files,
    };
  }
}
