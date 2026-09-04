import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DatabaseService } from './db/database';
import { FileSecurity } from './security/file-security';

async function seed() {
  console.log('🌱 Starting academic database seed...');
  const db = DatabaseService.getInstance();
  await db.init();

  const { uploadDir, convertedDir } = FileSecurity.initStorageDirectories();

  // 1. Create or update Demo User
  const demoEmail = 'demo@converter.local';
  let demoUser = db.findUserByEmail(demoEmail);

  if (!demoUser) {
    const passwordHash = await bcrypt.hash('Demo1234!', 10);
    demoUser = {
      id: crypto.randomUUID(),
      email: demoEmail,
      passwordHash,
      role: 'admin',
      createdAt: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.createUser(demoUser);
    console.log(`✅ Demo user created: ${demoEmail} (Password: Demo1234!)`);
  } else {
    console.log(`ℹ️ Demo user already exists: ${demoEmail}`);
  }

  // 2. Create sample files & sample conversion history
  const sampleCsvContent = `id,name,department,salary,status
101,Ana Silva,Engineering,8500,Active
102,Carlos Santos,Security,9200,Active
103,Mariana Costa,DevOps,8900,Active
104,Rafael Lima,Data Science,9100,Active
105,Beatriz Rocha,Architecture,9800,Active`;

  const sampleCsvStoredName = `${crypto.randomUUID()}.csv`;
  fs.writeFileSync(path.join(uploadDir, sampleCsvStoredName), sampleCsvContent);

  const sampleFileId = crypto.randomUUID();
  db.createFile({
    id: sampleFileId,
    userId: demoUser.id,
    originalName: 'employees_q3_report.csv',
    storedName: sampleCsvStoredName,
    mimeType: 'text/csv',
    size: Buffer.byteLength(sampleCsvContent),
    status: 'converted',
    createdAt: new Date(Date.now() - 3600 * 12 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 12 * 1000).toISOString(),
  });

  // Sample Converted JSON output file
  const sampleJsonOutput = JSON.stringify(
    [
      { id: '101', name: 'Ana Silva', department: 'Engineering', salary: '8500', status: 'Active' },
      { id: '102', name: 'Carlos Santos', department: 'Security', salary: '9200', status: 'Active' },
      { id: '103', name: 'Mariana Costa', department: 'DevOps', salary: '8900', status: 'Active' },
      { id: '104', name: 'Rafael Lima', department: 'Data Science', salary: '9100', status: 'Active' },
      { id: '105', name: 'Beatriz Rocha', department: 'Architecture', salary: '9800', status: 'Active' },
    ],
    null,
    2
  );

  const sampleJsonStoredName = `${crypto.randomUUID()}.json`;
  fs.writeFileSync(path.join(convertedDir, sampleJsonStoredName), sampleJsonOutput);

  const convertedFileId = crypto.randomUUID();
  db.createFile({
    id: convertedFileId,
    userId: demoUser.id,
    originalName: 'employees_q3_report.json',
    storedName: sampleJsonStoredName,
    mimeType: 'application/json',
    size: Buffer.byteLength(sampleJsonOutput),
    status: 'converted',
    createdAt: new Date(Date.now() - 3600 * 11 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 13 * 1000).toISOString(),
  });

  // Sample conversion job records
  db.createConversion({
    id: crypto.randomUUID(),
    userId: demoUser.id,
    fileId: sampleFileId,
    sourceFormat: 'csv',
    targetFormat: 'json',
    status: 'completed',
    outputFileId: convertedFileId,
    outputFileName: 'employees_q3_report.json',
    outputStoredName: sampleJsonStoredName,
    startedAt: new Date(Date.now() - 3600 * 11 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 3600 * 11 * 1000 + 450).toISOString(),
    createdAt: new Date(Date.now() - 3600 * 11 * 1000).toISOString(),
  });

  // Sample Markdown file
  const sampleMd = `# Academic Security Report
## Abstract
This prototype validates multi-tenant file system conversions under strict parameterized SQL integrity, rate limiting, and private storage isolation.

- Parameterized SQL execution
- Sliding window rate limiting
- File system traversal barrier`;

  const mdStoredName = `${crypto.randomUUID()}.md`;
  fs.writeFileSync(path.join(uploadDir, mdStoredName), sampleMd);
  const mdFileId = crypto.randomUUID();
  db.createFile({
    id: mdFileId,
    userId: demoUser.id,
    originalName: 'security_brief.md',
    storedName: mdStoredName,
    mimeType: 'text/markdown',
    size: Buffer.byteLength(sampleMd),
    status: 'uploaded',
    createdAt: new Date(Date.now() - 3600 * 5 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 19 * 1000).toISOString(),
  });

  db.createConversion({
    id: crypto.randomUUID(),
    userId: demoUser.id,
    fileId: mdFileId,
    sourceFormat: 'md',
    targetFormat: 'html',
    status: 'completed',
    outputFileName: 'security_brief.html',
    outputStoredName: mdStoredName,
    startedAt: new Date(Date.now() - 3600 * 5 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 3600 * 5 * 1000 + 120).toISOString(),
    createdAt: new Date(Date.now() - 3600 * 5 * 1000).toISOString(),
  });

  // 3. Seed Realistic Audit Logs
  const ipHash = crypto.createHash('sha256').update('192.168.1.100').digest('hex').slice(0, 16);

  const initialAuditLogs = [
    { action: 'AUTH_REGISTER', resource: 'user', success: true, metadata: { email: demoEmail } },
    { action: 'AUTH_LOGIN_SUCCESS', resource: 'user', success: true, metadata: { email: demoEmail } },
    { action: 'FILE_UPLOAD_SUCCESS', resource: 'file', success: true, metadata: { filename: 'employees_q3_report.csv', size: 284 } },
    { action: 'CONVERSION_QUEUED', resource: 'conversion', success: true, metadata: { sourceFormat: 'csv', targetFormat: 'json' } },
    { action: 'CONVERSION_SUCCESS', resource: 'conversion', success: true, metadata: { durationMs: 450, output: 'employees_q3_report.json' } },
    { action: 'FILE_DOWNLOAD', resource: 'conversion', success: true, metadata: { filename: 'employees_q3_report.json' } },
    { action: 'RATE_LIMIT_TRIGGERED', resource: 'rate_limiter', success: false, metadata: { limiter: 'auth', max: 5 } },
  ];

  initialAuditLogs.forEach((item, idx) => {
    db.createAuditLog({
      id: crypto.randomUUID(),
      userId: demoUser.id,
      action: item.action,
      resource: item.resource,
      resourceId: null,
      ipHash,
      userAgent: 'Mozilla/5.0 (Academic Demo Session)',
      success: item.success,
      metadata: JSON.stringify(item.metadata),
      createdAt: new Date(Date.now() - (10 - idx) * 120000).toISOString(),
    });
  });

  // 4. Seed Realistic Security Events
  const initialSecurityEvents = [
    {
      type: 'SQL_INJECTION_ATTEMPT',
      severity: 'high' as const,
      description: 'SQL injection string sanitized and passed safely through parameterized statement: "admin\' OR \'1\'=\'1"',
      endpoint: '/api/security-demo/sql-injection',
      metadata: { input: "admin' OR '1'='1", technique: 'Tautology bypass neutralized' },
    },
    {
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'medium' as const,
      description: 'IP exceeded threshold on /api/auth/login (5 requests per 60s)',
      endpoint: '/api/auth/login',
      metadata: { limiter: 'auth', attempts: 6 },
    },
    {
      type: 'PATH_TRAVERSAL_ATTEMPT',
      severity: 'critical' as const,
      description: 'Blocked relative directory traversal attempt: "../../../../etc/shadow"',
      endpoint: '/api/files/upload',
      metadata: { filename: '../../../../etc/shadow' },
    },
    {
      type: 'DANGEROUS_FILE_EXTENSION',
      severity: 'high' as const,
      description: 'Blocked executable upload: "reverse_shell.sh"',
      endpoint: '/api/files/upload',
      metadata: { filename: 'reverse_shell.sh', extension: '.sh' },
    },
  ];

  initialSecurityEvents.forEach((item, idx) => {
    db.createSecurityEvent({
      id: crypto.randomUUID(),
      type: item.type,
      severity: item.severity,
      userId: demoUser.id,
      ipHash,
      endpoint: item.endpoint,
      description: item.description,
      metadata: JSON.stringify(item.metadata),
      createdAt: new Date(Date.now() - (6 - idx) * 300000).toISOString(),
    });
  });

  console.log('✅ Academic database seeded successfully with demo user, conversions, audit logs, and security events.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
