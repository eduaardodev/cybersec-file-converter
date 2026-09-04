import assert from 'assert';
import path from 'path';
import { DatabaseService } from '../db/database';
import { AuthService } from '../auth/auth-service';
import { FileSecurity } from '../security/file-security';
import { ConverterRegistry } from '../converters/converter-registry';
import { RateLimiter } from '../security/rate-limiter';
import { AuditService } from '../services/audit-service';

async function runTests() {
  console.log('🧪 Starting Automated Security & Conversion Tests...\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  const db = DatabaseService.getInstance();
  await db.init();
  const authService = AuthService.getInstance();
  const registry = ConverterRegistry.getInstance();

  console.log('--- 1. Security Tests: SQL Injection Protection ---');
  await test('Neutralizes tautology SQL injection ("\' OR \'1\'=\'1")', () => {
    const maliciousInput = "' OR '1'='1";
    // Parameterized prepared query executes safely
    const results = db.query('SELECT * FROM users WHERE email = ?', [maliciousInput]);
    assert.strictEqual(results.length, 0, 'Injected boolean logic must not return records');
  });

  await test('Neutralizes UNION SELECT attacks', () => {
    const unionInput = "admin@example.com' UNION SELECT * FROM users --";
    const results = db.query('SELECT * FROM users WHERE email = ?', [unionInput]);
    assert.strictEqual(results.length, 0, 'UNION attack must not leak data');
  });

  await test('Handles semicolon batch queries safely (; DROP TABLE)', () => {
    const dropInput = "test'; DROP TABLE users; --";
    const results = db.query('SELECT * FROM users WHERE email = ?', [dropInput]);
    assert.strictEqual(results.length, 0);
    // Verify table still exists
    const users = db.query('SELECT count(*) as count FROM users');
    assert(users.length > 0, 'Table must remain intact');
  });

  console.log('\n--- 2. Security Tests: File Upload & Path Traversal ---');
  await test('Blocks relative path traversal (../../etc/passwd)', () => {
    const isTraversal = FileSecurity.checkPathTraversal('../../etc/passwd');
    assert.strictEqual(isTraversal, true, 'Path traversal must be flagged true');
    const result = FileSecurity.validateFile({
      rawFilename: '../../etc/passwd',
      mimeType: 'text/plain',
      size: 500,
    });
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.error?.code, 'VALIDATION_ERROR');
  });

  await test('Blocks null byte injection in filename', () => {
    const nullByte = FileSecurity.checkPathTraversal('safe.txt\0.exe');
    assert.strictEqual(nullByte, true, 'Null byte must trigger traversal check');
  });

  await test('Blocks dangerous executable extensions (.exe, .sh, .bat)', () => {
    const dangerous = ['.exe', '.sh', '.bat', '.cmd', '.py', '.php'];
    for (const ext of dangerous) {
      const res = FileSecurity.validateFile({
        rawFilename: `trojan${ext}`,
        mimeType: 'application/octet-stream',
        size: 100,
      });
      assert.strictEqual(res.isValid, false, `Extension ${ext} must be blocked`);
      assert.strictEqual(res.error?.code, 'UNSUPPORTED_FILE_TYPE');
    }
  });

  await test('Rejects oversized files (> 10MB)', () => {
    const res = FileSecurity.validateFile({
      rawFilename: 'large.csv',
      mimeType: 'text/csv',
      size: 11 * 1024 * 1024,
    });
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.error?.code, 'FILE_TOO_LARGE');
  });

  await test('Detects binary null bytes inside plain text files', () => {
    const corruptedBuffer = Buffer.from([0x68, 0x65, 0x6c, 0x00, 0x6c, 0x6f]); // 'hel\0lo'
    const res = FileSecurity.validateFile({
      rawFilename: 'document.txt',
      mimeType: 'text/plain',
      size: corruptedBuffer.length,
      buffer: corruptedBuffer,
    });
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.error?.code, 'VALIDATION_ERROR');
  });

  console.log('\n--- 3. Authentication & Authorization Tests ---');
  const testEmail = `test_${Date.now()}@test.local`;
  let testUserToken = '';

  await test('Registers user with salted bcrypt hash', async () => {
    const res = await authService.register(testEmail, 'StrongPassword123!');
    assert.strictEqual(res.user.email, testEmail);
    assert.ok(res.token, 'Token must be issued');
    testUserToken = res.token;

    const inDb = db.findUserByEmail(testEmail);
    assert.ok(inDb, 'User must exist in DB');
    assert.notStrictEqual(inDb.passwordHash, 'StrongPassword123!', 'Password must NOT be in plaintext');
    assert.ok(inDb.passwordHash.startsWith('$2'), 'Must be bcrypt hash');
  });

  await test('Rejects login with invalid password', async () => {
    try {
      await authService.login(testEmail, 'WrongPassword!');
      assert.fail('Should have thrown authentication error');
    } catch (err: any) {
      assert.strictEqual(err.code, 'AUTHENTICATION_ERROR');
    }
  });

  await test('Verifies and decodes valid JWT token', () => {
    const payload = authService.verifyToken(testUserToken);
    assert.strictEqual(payload.email, testEmail);
  });

  console.log('\n--- 4. Conversion Engine Tests ---');
  await test('Converts CSV to JSON accurately', async () => {
    const csvData = 'id,product,price\n1,Laptop,1200\n2,Mouse,25';
    const result = await registry.execute('csv', 'json', Buffer.from(csvData), 'catalog.csv');
    assert.strictEqual(result.outputExtension, 'json');
    const parsed = JSON.parse(result.buffer.toString('utf-8'));
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].product, 'Laptop');
  });

  await test('Converts JSON to CSV accurately', async () => {
    const jsonData = JSON.stringify([{ city: 'Sao Paulo', pop: '12M' }, { city: 'Curitiba', pop: '2M' }]);
    const result = await registry.execute('json', 'csv', Buffer.from(jsonData), 'cities.json');
    assert.strictEqual(result.outputExtension, 'csv');
    const text = result.buffer.toString('utf-8');
    assert(text.includes('city,pop'));
    assert(text.includes('Sao Paulo,12M'));
  });

  await test('Converts Markdown to clean styled HTML', async () => {
    const md = '# Academic Title\n\nThis is a **secure** conversion prototype.';
    const result = await registry.execute('md', 'html', Buffer.from(md), 'doc.md');
    assert.strictEqual(result.outputExtension, 'html');
    const html = result.buffer.toString('utf-8');
    assert(html.includes('<h1>Academic Title</h1>'));
    assert(html.includes('<strong>secure</strong>'));
  });

  await test('Converts TXT to PDF binary buffer', async () => {
    const txt = 'Official Academic Audit Report - All systems verified.';
    const result = await registry.execute('txt', 'pdf', Buffer.from(txt), 'report.txt');
    assert.strictEqual(result.outputExtension, 'pdf');
    assert.strictEqual(result.mimeType, 'application/pdf');
    assert(result.buffer.length > 500, 'PDF buffer must contain valid PDF stream');
    assert.strictEqual(result.buffer.slice(0, 4).toString(), '%PDF', 'PDF magic number header required');
  });

  await test('Converts JSON to YAML and YAML to JSON', async () => {
    const jsonStr = JSON.stringify({ server: 'express', port: 3000, secure: true });
    const yamlRes = await registry.execute('json', 'yaml', Buffer.from(jsonStr), 'config.json');
    assert.strictEqual(yamlRes.outputExtension, 'yaml');

    const jsonRes = await registry.execute('yaml', 'json', yamlRes.buffer, 'config.yaml');
    const roundTrip = JSON.parse(jsonRes.buffer.toString('utf-8'));
    assert.strictEqual(roundTrip.server, 'express');
    assert.strictEqual(roundTrip.port, 3000);
  });

  await test('Throws UNSUPPORTED_FILE_TYPE on non-existent conversion', async () => {
    try {
      await registry.execute('exe', 'pdf', Buffer.from('binary'), 'virus.exe');
      assert.fail('Should fail on unsupported conversion');
    } catch (err: any) {
      assert.strictEqual(err.code, 'UNSUPPORTED_FILE_TYPE');
    }
  });

  console.log('\n--- 5. Audit & Traceability Tests ---');
  await test('Logs audit event with SHA-256 anonymized IP and sanitized metadata', () => {
    const auditService = AuditService.getInstance();
    const log = auditService.logAction({
      userId: 'test-user-id',
      action: 'SECURITY_UNIT_TEST',
      resource: 'test',
      success: true,
      metadata: {
        safeField: 'ok',
        password: 'SUPER_SECRET_PLAINTEXT_SHOULD_BE_REDACTED',
      },
    });

    assert.ok(log.id);
    assert.ok(log.ipHash);
    assert.notStrictEqual(log.ipHash, '127.0.0.1', 'IP must be hashed');
    assert(!log.metadata.includes('SUPER_SECRET_PLAINTEXT'), 'Passwords in metadata must be redacted');
  });

  console.log(`\n========================================`);
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
