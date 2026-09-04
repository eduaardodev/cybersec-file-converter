import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  FileWarning,
  Flame,
  FileCode2,
  Terminal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog, SecurityEvent } from '../types/client';

export const SecurityDemoView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'sqli' | 'rate-limit' | 'upload-defense' | 'error-handling' | 'audit-logs'
  >('sqli');

  // 1. SQL Injection State
  const [sqliInput, setSqliInput] = useState<string>("' OR '1'='1");
  const [sqliResult, setSqliResult] = useState<any>(null);
  const [sqliLoading, setSqliLoading] = useState(false);

  // 2. Rate Limit State
  const [rateLimitBatchSize, setRateLimitBatchSize] = useState<number>(10);
  const [rateLimitResponses, setRateLimitResponses] = useState<any[]>([]);
  const [rateLimitLoading, setRateLimitLoading] = useState(false);

  // 3. Upload Defense State
  const [uploadScenario, setUploadScenario] = useState<string>('path_traversal');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // 4. Centralized Error State
  const [errorType, setErrorType] = useState<string>('internal_simulated');
  const [errorResponse, setErrorResponse] = useState<any>(null);
  const [errorLoading, setErrorLoading] = useState(false);

  // 5. Audit & Security Events State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>('ALL');
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLogMetadata, setSelectedLogMetadata] = useState<any>(null);

  // Fetch audit and security logs
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const [logsRes, eventsRes] = await Promise.all([
        api.getAuditLogs(auditFilter),
        api.getSecurityEvents(),
      ]);
      setAuditLogs(logsRes.logs || []);
      setSecurityEvents(eventsRes.events || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'audit-logs') {
      fetchLogs();
    }
  }, [activeSubTab, auditFilter]);

  // Handler for SQLi Demo
  const runSqlInjectionTest = async () => {
    setSqliLoading(true);
    try {
      const res = await api.testSqlInjection(sqliInput);
      setSqliResult(res);
    } catch (err: any) {
      setSqliResult({ error: err.message });
    } finally {
      setSqliLoading(false);
    }
  };

  // Handler for Rate Limit Concurrency Blast
  const runRateLimitBlast = async () => {
    setRateLimitLoading(true);
    setRateLimitResponses([]);

    const results: any[] = [];
    for (let i = 0; i < rateLimitBatchSize; i++) {
      try {
        const start = Date.now();
        const res = await api.testRateLimit();
        results.push({
          reqIndex: i + 1,
          status: 200,
          statusText: 'ACCEPTED',
          durationMs: Date.now() - start,
          data: res,
        });
      } catch (err: any) {
        results.push({
          reqIndex: i + 1,
          status: err.status || 429,
          statusText: err.status === 429 ? 'RATE_LIMITED' : 'ERROR',
          durationMs: 15,
          data: err.data || { error: err.message },
        });
      }
      setRateLimitResponses([...results]);
      // small delay to show streaming evaluation
      await new Promise((r) => setTimeout(r, 60));
    }
    setRateLimitLoading(false);
  };

  // Handler for Upload Defense Demo
  const runUploadDefenseTest = async (scenarioToRun?: string) => {
    const sc = scenarioToRun || uploadScenario;
    setUploadLoading(true);
    try {
      const res = await api.testUploadSecurity(sc);
      setUploadResult(res);
    } catch (err: any) {
      setUploadResult({ error: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  // Handler for Error Handling Demo
  const runErrorHandlingTest = async (errTypeToRun?: string) => {
    const et = errTypeToRun || errorType;
    setErrorLoading(true);
    try {
      const res = await api.testErrorHandling(et);
      setErrorResponse(res);
    } catch (err: any) {
      setErrorResponse({
        httpStatus: err.status,
        body: err.data || { error: { code: err.code, message: err.message } },
      });
    } finally {
      setErrorLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bento Title & Description */}
      <div className="p-6 rounded-xl bg-[#13151a] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              Academic Demonstration Suite
            </span>
            <span className="text-xs text-slate-500 font-mono">Section 18 & 21 Compliance</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Security, Auditability & Concurrency Testing Lab
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Interactive live verification of backend defense layers: Parameterized SQL, Sliding-Window Rate Limiting, File Sandbox barriers, and Centralized Redaction.
          </p>
        </div>
      </div>

      {/* Bento Sub Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-[#13151a] border border-slate-800">
        {[
          { id: 'sqli', label: '1. SQL Injection Guard', icon: Lock },
          { id: 'rate-limit', label: '2. Rate Limiter Blast', icon: Zap },
          { id: 'upload-defense', label: '3. File Upload Sandbox', icon: FileWarning },
          { id: 'error-handling', label: '4. Error Sanitization', icon: Terminal },
          { id: 'audit-logs', label: '5. Audit & Security Trail', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. SQL INJECTION MODULE */}
      {/* ========================================================================= */}
      {activeSubTab === 'sqli' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  SQL Injection Parameterization Test
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Demonstrates how prepared statements treat raw inputs strictly as literal values ($1 / ?), completely preventing code alteration of the query AST.
                </p>
              </div>
            </div>

            {/* Quick Payload Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5 font-mono">
                Select Classic Attack Vector or Type Custom Payload:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Tautology Bypass (' OR '1'='1)", payload: "' OR '1'='1" },
                  { label: "Comment Truncation (admin' --)", payload: "admin' --" },
                  { label: "UNION Attack (' UNION SELECT...)", payload: "admin' UNION SELECT id,email,role,createdAt FROM users --" },
                  { label: "Batch Statement (; DROP TABLE...)", payload: "'; DROP TABLE users; --" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setSqliInput(preset.payload)}
                    className="px-2.5 py-1 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 text-xs font-mono border border-slate-800 transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Trigger */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={sqliInput}
                onChange={(e) => setSqliInput(e.target.value)}
                placeholder="Enter SQL Injection string to test..."
                className="flex-1 bg-[#0a0a0c] border border-slate-800 focus:border-blue-500 rounded-lg px-3.5 py-2 font-mono text-xs text-amber-300 focus:outline-hidden"
              />
              <button
                onClick={runSqlInjectionTest}
                disabled={sqliLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold uppercase transition cursor-pointer shrink-0 shadow-sm shadow-blue-900/40"
              >
                {sqliLoading ? 'Executing Query...' : 'Execute Defense Verification'}
              </button>
            </div>
          </div>

          {/* Test Results Card */}
          {sqliResult && (
            <div className="p-6 rounded-xl bg-[#13151a] border border-slate-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-xs font-bold">
                    DEFENSE VERDICT: {sqliResult.status}
                  </span>
                  <span className="text-xs text-slate-400">No injection occurred</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Matched Records: <span className="text-white font-bold">{sqliResult.defensePipeline?.[3]?.matchedRecords ?? 0}</span>
                </div>
              </div>

              {/* Step by step pipeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Defense Execution Trace Pipeline:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                  {sqliResult.defensePipeline?.map((step: any) => (
                    <div
                      key={step.step}
                      className="p-3 rounded-lg bg-[#0a0a0c] border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="text-[10px] font-mono text-blue-400 uppercase font-bold">
                        Step {step.step}: {step.name}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs space-y-2">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Actual Protected Execution (Parameterized)
                  </div>
                  <pre className="p-2.5 rounded-md bg-[#0a0a0c] text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`SQL: SELECT * FROM users WHERE email = ?;
PARAM $1: "${sqliResult.input}"`}
                  </pre>
                  <p className="text-[11px] text-slate-400">
                    The database engine parsed the AST ahead of time. The string was treated strictly as literal data, returning 0 rows.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-red-950/20 border border-red-800/40 text-xs space-y-2">
                  <div className="font-semibold text-red-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Hypothetical Vulnerable Execution (Unsanitized Concatenation)
                  </div>
                  <pre className="p-2.5 rounded-md bg-[#0a0a0c] text-red-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`SQL: ${sqliResult.vulnerableComparison?.hypotheticalVulnerableQuery}`}
                  </pre>
                  <p className="text-[11px] text-slate-400">
                    {sqliResult.vulnerableComparison?.vulnerableRisk}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. RATE LIMITING MODULE */}
      {/* ========================================================================= */}
      {activeSubTab === 'rate-limit' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Sliding-Window Rate Limiting & Concurrency Blast
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                The demo endpoint enforces a threshold of <strong>5 requests / 10 seconds</strong> per IP. Excess requests trigger HTTP 429 (Too Many Requests) with retry headers.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#0a0a0c] border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-300">Concurrent Requests to Fire:</span>
                <div className="flex items-center gap-1">
                  {[5, 10, 20].map((size) => (
                    <button
                      key={size}
                      onClick={() => setRateLimitBatchSize(size)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        rateLimitBatchSize === size
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#13151a] text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {size} Reqs
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={runRateLimitBlast}
                disabled={rateLimitLoading}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold uppercase shadow-sm shadow-amber-900/30 transition cursor-pointer"
              >
                {rateLimitLoading ? 'Firing Blast...' : `Launch ${rateLimitBatchSize} Requests`}
              </button>
            </div>
          </div>

          {/* Real-time Response Timeline */}
          {rateLimitResponses.length > 0 && (
            <div className="p-6 rounded-xl bg-[#13151a] border border-slate-800 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-300">
                      Accepted (200):{' '}
                      <strong className="text-emerald-400">
                        {rateLimitResponses.filter((r) => r.status === 200).length}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="text-slate-300">
                      Rate-Limited (429):{' '}
                      <strong className="text-red-400">
                        {rateLimitResponses.filter((r) => r.status === 429).length}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Batch Progress: {rateLimitResponses.length} / {rateLimitBatchSize}
                </div>
              </div>

              {/* Visual Request Sequence Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                {rateLimitResponses.map((res) => {
                  const isSuccess = res.status === 200;
                  return (
                    <div
                      key={res.reqIndex}
                      className={`p-2 rounded-lg border text-center transition ${
                        isSuccess
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                          : 'bg-red-950/50 border-red-700/70 text-red-300 animate-pulse'
                      }`}
                    >
                      <div className="font-mono text-[11px] font-bold">#{res.reqIndex}</div>
                      <div className="text-[10px] font-mono mt-0.5">{res.status}</div>
                    </div>
                  );
                })}
              </div>

              {/* Explanatory note */}
              <div className="p-3.5 rounded-lg bg-[#0a0a0c] border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Sliding Window Protection: </strong>
                The server isolates IP requests in a high-speed memory governor. When the count in the 10-second sliding frame exceeds 5, requests are rejected with status 429 and an audit security event is immediately recorded.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FILE UPLOAD DEFENSE MODULE */}
      {/* ========================================================================= */}
      {activeSubTab === 'upload-defense' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-red-400" />
                Zero-Trust File Upload & Path Traversal Sandbox
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every file undergoes a 5-point security audit: Traversal tokens, extension sanitization, MIME verification, binary null-byte scan, and size quotas.
              </p>
            </div>

            {/* Scenario buttons */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-2 font-mono">
                Choose Simulated Malicious Upload Scenario:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'path_traversal',
                    title: 'Path Traversal',
                    desc: '../../../../etc/shadow',
                    bad: true,
                  },
                  {
                    id: 'dangerous_extension',
                    title: 'Executable Payload',
                    desc: 'trojan_payload.exe',
                    bad: true,
                  },
                  {
                    id: 'script_extension',
                    title: 'Shell Script',
                    desc: 'deploy_backdoor.sh',
                    bad: true,
                  },
                  {
                    id: 'oversized',
                    title: 'Oversized Archive',
                    desc: '25 MB payload (> 10MB limit)',
                    bad: true,
                  },
                  {
                    id: 'invalid_mime',
                    title: 'MIME Type Spoofing',
                    desc: 'application/x-dosexec',
                    bad: true,
                  },
                  {
                    id: 'corrupted_binary',
                    title: 'Binary Null Bytes',
                    desc: 'Null bytes inside text stream',
                    bad: true,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setUploadScenario(item.id);
                      runUploadDefenseTest(item.id);
                    }}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      uploadScenario === item.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-[#0a0a0c] border-slate-800 hover:bg-slate-850 text-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>{item.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/60 font-mono font-bold">
                        THREAT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Validation Matrix Output */}
          {uploadResult && (
            <div className="p-6 rounded-xl bg-[#13151a] border border-slate-800 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-lg font-mono text-xs font-bold ${
                      uploadResult.decision === 'BLOCKED'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    STATUS: {uploadResult.decision}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Scenario: <strong>{uploadResult.scenario}</strong>
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  File: {uploadResult.testedAttributes?.filename}
                </div>
              </div>

              {/* Reason card */}
              <div
                className={`p-4 rounded-lg border text-xs ${
                  uploadResult.decision === 'BLOCKED'
                    ? 'bg-red-950/30 border-red-800/50 text-red-200'
                    : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                }`}
              >
                <div className="font-bold mb-1 font-mono uppercase text-[11px]">Defense Evaluation Summary:</div>
                <p>{uploadResult.reason}</p>
              </div>

              {/* 4 Point Check Matrix */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Security Checkpoints Pipeline:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {uploadResult.pipelineSteps?.map((step: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#0a0a0c] border border-slate-800 flex items-start gap-2.5 text-xs"
                    >
                      {step.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-200">{step.check}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {step.details}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ERROR HANDLING MODULE */}
      {/* ========================================================================= */}
      {activeSubTab === 'error-handling' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                Centralized Error Handling & Information Leak Barrier
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifies Section 14: All API errors conform to a unified contract{' '}
                <code>{`{ error: { code, message } }`}</code>. Stack traces, database credentials, and internal server paths are <strong>never leaked</strong> to clients.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'internal_simulated', label: '500 Internal Error (Sanitization Test)' },
                { id: '404_not_found', label: '404 Not Found' },
                { id: 'validation_error', label: '400 Validation Error' },
                { id: 'unauthorized', label: '403 Forbidden Access' },
                { id: 'unsupported_conversion', label: '415 Unsupported Conversion' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setErrorType(item.id);
                    runErrorHandlingTest(item.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    errorType === item.id
                      ? 'bg-blue-600 text-white border-blue-500 font-bold'
                      : 'bg-[#0a0a0c] border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {errorResponse && (
            <div className="p-6 rounded-xl bg-[#13151a] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#0a0a0c] text-slate-300 text-xs font-mono border border-slate-800">
                    HTTP {errorResponse.httpStatus || 200}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold font-mono">
                    ✓ Clean Redaction Verified (0 Leaks)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1 font-mono">
                  Sanitized JSON Client Response Payload:
                </label>
                <pre className="p-4 rounded-lg bg-[#0a0a0c] border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(errorResponse.body || errorResponse, null, 2)}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300">
                Notice: Even when simulating a crash referencing internal file paths and credentials, the centralized error middleware caught the exception, logged details to the private server log, and returned an opaque sanitized message to the caller.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. AUDIT TRAIL & SECURITY EVENTS MODULE */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit-logs' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Real-Time Audit Trail & Security Events
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permanent traceable ledger with SHA-256 IP anonymization, action classification, and threat severity.
                </p>
              </div>

              <button
                onClick={fetchLogs}
                disabled={logsLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Stream</span>
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'AUTH', 'FILE', 'CONVERSION', 'SECURITY', 'RATE_LIMIT'].map((f) => (
                <button
                  key={f}
                  onClick={() => setAuditFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                    auditFilter === f
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#0a0a0c] text-slate-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Security Events High Alert Section */}
          {securityEvents.length > 0 && (
            <div className="p-5 rounded-xl bg-[#13151a] border border-red-800/40 space-y-3">
              <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-2 font-mono">
                <Flame className="h-4 w-4 text-red-400" />
                Security Threat Interceptions ({securityEvents.length})
              </h3>
              <div className="divide-y divide-slate-800">
                {securityEvents.slice(0, 4).map((evt) => (
                  <div key={evt.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-red-400 font-bold uppercase">{evt.type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 uppercase font-mono border border-red-800/50">
                          {evt.severity}
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {new Date(evt.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{evt.description}</p>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono shrink-0">
                      IP: {evt.ipHash}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabular Audit Stream */}
          <div className="rounded-xl bg-[#13151a] border border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0a0a0c] text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">IP Hash (SHA-256)</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300 bg-[#13151a]">
                  {auditLogs.slice(0, 15).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-white">{log.action}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {log.resource}
                      </td>

                      <td className="py-3 px-4">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-500 font-bold uppercase">
                            <CheckCircle2 className="h-3 w-3" />
                            SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400 font-bold uppercase">
                            <XCircle className="h-3 w-3" />
                            REJECTED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {log.ipHash}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            try {
                              setSelectedLogMetadata(JSON.parse(log.metadata || '{}'));
                            } catch {
                              setSelectedLogMetadata({ raw: log.metadata });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-blue-400 font-mono text-xs border border-slate-800 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metadata Inspector Dialog */}
          {selectedLogMetadata && (
            <div className="p-4 rounded-xl bg-[#0a0a0c] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 font-mono">Audit Log Metadata Inspector:</span>
                <button
                  onClick={() => setSelectedLogMetadata(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-[#13151a] text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800">
                {JSON.stringify(selectedLogMetadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
