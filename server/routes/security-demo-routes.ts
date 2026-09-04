import { Router, Request, Response } from 'express';
import { requireAdmin } from '../auth/auth-middleware';
import { RateLimiter } from '../security/rate-limiter';
import { FileSecurity } from '../security/file-security';
import { DatabaseService } from '../db/database';
import { AuditService } from '../services/audit-service';
import { AppError, handleAppError } from '../errors/app-error';

const router = Router();
const db = DatabaseService.getInstance();
const audit = AuditService.getInstance();

// Strictly restrict security testing lab tools to admin users
router.use(requireAdmin);

// 1. SQL Injection Demo
router.post('/sql-injection', (req: Request, res: Response) => {
  try {
    const rawInput = String(req.body?.testInput || '').trim();
    if (!rawInput) {
      throw AppError.validation('testInput string is required for the security demonstration.');
    }

    // Pattern analysis (for educational demonstration visualization)
    const sqliPatterns = [
      /('|\b)(OR|AND)\b.+(=|<|>|\bin\b)/i,
      /UNION(\s+ALL)?\s+SELECT/i,
      /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)\b/i,
      /--|\/\*|\*\/|#/i,
      /EXEC(\s|\()+xp_/i,
    ];

    const detectedThreats = sqliPatterns
      .map((pattern) => (pattern.test(rawInput) ? pattern.source : null))
      .filter(Boolean);

    const isMaliciousPattern = detectedThreats.length > 0;

    // Real Parameterized Query Execution
    // The database engine treats rawInput strictly as data/literal, not code!
    const parameterizedSql = 'SELECT id, email, role, createdAt FROM users WHERE email = ?';
    const executedResults = db.query(parameterizedSql, [rawInput]);

    // Construct explanation of what would happen if vulnerable
    const vulnerableSqlExample = `SELECT * FROM users WHERE email = '${rawInput}'`;

    // Log the test in audit logs
    audit.logAction({
      action: 'SECURITY_TEST_SQLI',
      resource: 'security_demo',
      req,
      success: true,
      metadata: {
        rawInput: rawInput.slice(0, 50),
        threatsDetected: detectedThreats,
        parameterized: true,
        matchedRowsCount: executedResults.length,
      },
    });

    if (isMaliciousPattern) {
      audit.logSecurityEvent({
        type: 'SQL_INJECTION_TEST_INTERCEPTED',
        severity: 'high',
        req,
        endpoint: '/api/security-demo/sql-injection',
        description: `SQL Injection pattern tested and neutralized by parameterized query: "${rawInput.slice(0, 60)}"`,
        metadata: { rawInput, threats: detectedThreats },
      });
    }

    res.json({
      status: 'PROTECTED',
      input: rawInput,
      threatAnalysis: {
        isMaliciousPattern,
        detectedPatterns: detectedThreats,
      },
      defensePipeline: [
        {
          step: 1,
          name: 'Input Receipt',
          description: 'Payload received by Express router and isolated in memory.',
        },
        {
          step: 2,
          name: 'Pattern Inspection',
          description: isMaliciousPattern
            ? 'Threat patterns detected (e.g. quote escapes, boolean logic, or comments).'
            : 'Standard input string parsed.',
        },
        {
          step: 3,
          name: 'Parameterized Query Binding',
          description:
            'Input is passed into DB engine as a bind parameter ($1 / ?), NEVER concatenated into the SQL statement.',
          sqlStatement: parameterizedSql,
          boundParameter: rawInput,
        },
        {
          step: 4,
          name: 'Database Engine Execution',
          description:
            'SQL parser compiles AST independently of parameter values. The payload cannot alter the query structure.',
          matchedRecords: executedResults.length,
        },
        {
          step: 5,
          name: 'Audit Trace Generated',
          description: 'Security event and audit trail permanently logged with SHA-256 IP identifier.',
        },
      ],
      vulnerableComparison: {
        hypotheticalVulnerableQuery: vulnerableSqlExample,
        vulnerableRisk: isMaliciousPattern
          ? 'An unparameterized query would have evaluated the injected SQL condition and bypassed authentication or leaked records.'
          : 'Normal execution.',
      },
    });
  } catch (err) {
    handleAppError(err, res);
  }
});

// 2. Rate Limiting Demo (Subjected to strict 5 requests / 10 seconds limit)
router.post('/rate-limit', RateLimiter.demoTestLimiter, (req: Request, res: Response) => {
  const remaining = res.getHeader('X-RateLimit-Remaining');
  const limit = res.getHeader('X-RateLimit-Limit');
  const reset = res.getHeader('X-RateLimit-Reset');

  res.json({
    status: 'ACCEPTED',
    message: 'Request accepted within rate threshold.',
    rateLimit: {
      limit,
      remaining,
      resetSeconds: reset,
    },
    timestamp: new Date().toISOString(),
  });
});

// 3. File Upload Security Demo
router.post('/upload', (req: Request, res: Response) => {
  try {
    const { scenario, customFilename, customMime, customSize } = req.body;

    let filename = 'test_document.csv';
    let mimeType = 'text/csv';
    let size = 2048;
    let buffer: Buffer | undefined = Buffer.from('id,name\n1,Alice\n2,Bob');

    if (scenario === 'path_traversal') {
      filename = '../../../../etc/shadow';
      mimeType = 'text/plain';
    } else if (scenario === 'dangerous_extension') {
      filename = 'trojan_payload.exe';
      mimeType = 'application/x-msdownload';
    } else if (scenario === 'script_extension') {
      filename = 'deploy_backdoor.sh';
      mimeType = 'application/x-sh';
    } else if (scenario === 'oversized') {
      filename = 'huge_archive.json';
      size = 25 * 1024 * 1024; // 25 MB
      mimeType = 'application/json';
    } else if (scenario === 'invalid_mime') {
      filename = 'fake_report.csv';
      mimeType = 'application/x-dosexec';
    } else if (scenario === 'corrupted_binary') {
      filename = 'corrupted_test.json';
      mimeType = 'application/json';
      buffer = Buffer.from([0x00, 0x01, 0x02, 0xff]); // binary with null bytes
    } else if (scenario === 'custom') {
      filename = customFilename || 'custom.txt';
      mimeType = customMime || 'text/plain';
      size = Number(customSize) || 1024;
    }

    const validation = FileSecurity.validateFile({
      rawFilename: filename,
      mimeType,
      size,
      buffer,
      req,
    });

    res.json({
      scenario: scenario || 'custom',
      testedAttributes: {
        filename,
        mimeType,
        sizeBytes: size,
      },
      decision: validation.isValid ? 'ACCEPTED' : 'BLOCKED',
      reason: validation.error ? validation.error.message : 'File passed all security validation checkpoints.',
      errorCode: validation.error ? validation.error.code : null,
      pipelineSteps: [
        {
          check: 'Path Traversal Detection',
          passed: !FileSecurity.checkPathTraversal(filename),
          details: 'Scanned for directory traversal tokens (../, null bytes, backslashes, absolute paths).',
        },
        {
          check: 'Extension Blacklist & Whitelist',
          passed:
            !FileSecurity.DANGEROUS_EXTENSIONS.has(validation.normalizedExtension) &&
            FileSecurity.ALLOWED_EXTENSIONS.has(validation.normalizedExtension),
          details: `Extension "${validation.normalizedExtension}" evaluated against dangerous/allowed sets.`,
        },
        {
          check: 'File Size Quota',
          passed: size <= FileSecurity.MAX_FILE_SIZE,
          details: `Size ${size} bytes vs max allowed ${FileSecurity.MAX_FILE_SIZE} bytes (10 MB).`,
        },
        {
          check: 'MIME Type Inspection',
          passed: FileSecurity.ALLOWED_MIME_TYPES.has(mimeType.toLowerCase()),
          details: `MIME "${mimeType}" matched against permitted content types.`,
        },
      ],
      auditLogged: true,
    });
  } catch (err) {
    handleAppError(err, res);
  }
});

// 4. Centralized Error Handling Demo
router.post('/errors', (req: Request, res: Response) => {
  const { errorType } = req.body;

  switch (errorType) {
    case '404_not_found':
      handleAppError(AppError.notFound('Conversion job with ID "conv_987654" does not exist.'), res);
      break;

    case 'validation_error':
      handleAppError(AppError.validation('Target format "EXE" is invalid. Allowed: JSON, CSV, PDF, HTML, YAML.'), res);
      break;

    case 'unauthorized':
      handleAppError(AppError.authorization('Forbidden: You do not own file "confidential_financials.csv".'), res);
      break;

    case 'unsupported_conversion':
      handleAppError(AppError.unsupportedFileType('Cannot convert direct binary audio stream to CSV format.'), res);
      break;

    case 'internal_simulated':
      // Deliberately simulate an internal exception with sensitive paths to verify sanitization
      try {
        throw new Error('DatabaseConnectionTimeout: at /private/var/db/credentials/master.key: line 42: socket closed');
      } catch (internalErr) {
        // AppError handler MUST redact this completely!
        handleAppError(internalErr, res);
      }
      break;

    default:
      res.json({
        message: 'Provide errorType: 404_not_found | validation_error | unauthorized | unsupported_conversion | internal_simulated',
      });
  }
});

export default router;
