import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Search,
  RefreshCw,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Server,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog, SecurityEvent, DashboardStats } from '../types/client';

interface AdminAuditDashboardProps {
  stats: DashboardStats | null;
}

export const AdminAuditDashboard: React.FC<AdminAuditDashboardProps> = ({
  stats,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const [logsRes, eventsRes] = await Promise.all([
        api.getAuditLogs(filterCategory === 'ALL' ? undefined : filterCategory, 150),
        api.getSecurityEvents(50),
      ]);
      setAuditLogs(logsRes.logs || []);
      setSecurityEvents(eventsRes.events || []);
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [filterCategory]);

  // Compute audit metrics
  const totalLogs = auditLogs.length;
  const successfulOps = auditLogs.filter((l) => l.success === true || l.success === 1).length;
  const successRate = totalLogs > 0 ? Math.round((successfulOps / totalLogs) * 100) : 100;
  const totalSecurityEvents = securityEvents.length;

  // Filter logs by search query
  const filteredLogs = auditLogs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.userId || '').toLowerCase().includes(q) ||
      log.ipHash.toLowerCase().includes(q) ||
      log.resource.toLowerCase().includes(q) ||
      (log.metadata || '').toLowerCase().includes(q)
    );
  });

  const getActionBadgeColor = (action: string, success: boolean | number) => {
    const isSuccess = success === true || success === 1;
    if (!isSuccess) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (action.startsWith('AUTH_')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (action.startsWith('CONVERSION_')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action.startsWith('FILE_')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (action.includes('SECURITY') || action.includes('RATE_LIMIT'))
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-950 text-red-300 border-red-800';
      case 'high':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'medium':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      default:
        return 'bg-blue-950 text-blue-300 border-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Bento Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-[#13151a] border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-bold uppercase">
              Auditoria Central & Compliance
            </span>
            <span className="text-xs text-slate-500 font-mono">Modo Administrador</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Painel Central de Auditoria do Sistema
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Supervisão contínua de transações, trilha imutável de logs, integridade estrutural e contenção de ameaças.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAuditData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono uppercase transition cursor-pointer disabled:opacity-50"
            title="Recarregar registros de auditoria"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 4 Bento Metrics Cards (Auditoria & Segurança) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Trilha de Auditoria</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-white font-mono">{totalLogs}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Ações registradas no SQLite</p>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full w-full" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Taxa de Conformidade</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-emerald-400 font-mono">{successRate}%</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Operações íntegras validadas</p>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Ameaças Interceptadas</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-amber-400 font-mono">{totalSecurityEvents}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Tentativas de violação contidas</p>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (totalSecurityEvents || 1) * 20)}%` }}
            />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Camadas Ativas</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-purple-400 font-mono">4 / 4</div>
            <p className="text-[11px] text-slate-500 mt-0.5">SQLi, Limiter, Sandbox, Queue</p>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full w-full" />
          </div>
        </div>
      </div>

      {/* Main Grid: Audit Trail (2 Cols) + Security Events & Controls (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Span 2: Comprehensive Audit Trail */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Trilha de Auditoria do Sistema
                </h2>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'AUTH', label: 'Auth' },
                  { id: 'FILE', label: 'Arquivos' },
                  { id: 'CONVERSION', label: 'Conversões' },
                  { id: 'SECURITY', label: 'Segurança' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase transition cursor-pointer ${
                      filterCategory === tab.id
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-[#0a0a0c] text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search filter input */}
            <div className="relative mb-4">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por ação, usuário, IP hash, recurso ou metadados..."
                className="w-full bg-[#0a0a0c] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Audit Logs Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs bg-[#0a0a0c]">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-white font-semibold">Nenhum log encontrado para este filtro</p>
                  <p className="text-slate-500 mt-1">
                    Execute ações no sistema para gerar novas entradas de auditoria.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#0a0a0c] z-10 border-b border-slate-800">
                      <tr className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Status / Ação</th>
                        <th className="py-2.5 px-3">Usuário</th>
                        <th className="py-2.5 px-3">Recurso</th>
                        <th className="py-2.5 px-3">Origem (IP Hash)</th>
                        <th className="py-2.5 px-3">Data/Hora</th>
                        <th className="py-2.5 px-3 text-right">Inspecionar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300 bg-[#13151a]">
                      {filteredLogs.map((log) => {
                        const isSuccess = log.success === true || log.success === 1;
                        return (
                          <tr key={log.id} className="hover:bg-slate-800/30 transition">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                {isSuccess ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded font-mono text-[10px] border font-bold ${getActionBadgeColor(
                                    log.action,
                                    log.success
                                  )}`}
                                >
                                  {log.action}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                              {log.userId ? (
                                <span className="text-blue-300" title={log.userId}>
                                  {log.userId.slice(0, 8)}...
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Anônimo/Sistema</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                              <div>{log.resource}</div>
                              {log.resourceId && (
                                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                  {log.resourceId}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                              <span title={`IP Hash: ${log.ipHash}`}>
                                {log.ipHash.slice(0, 10)}...
                              </span>
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-mono text-[10px] uppercase transition cursor-pointer"
                                title="Ver payload e metadados estruturados"
                              >
                                <Eye className="h-3 w-3 text-blue-400" />
                                <span>Detalhes</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Span 1: Security Events & Active Controls */}
        <div className="space-y-6">
          {/* Recent Security Incidents Card */}
          <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Ameaças Interceptadas
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                {securityEvents.length} Alertas
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {securityEvents.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs bg-[#0a0a0c] rounded-lg border border-slate-800">
                  <ShieldCheck className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
                  <p className="text-slate-300 font-semibold text-[11px]">Nenhuma ameaça detectada</p>
                  <p className="text-[10px] text-slate-500">O sistema está operando sem violações</p>
                </div>
              ) : (
                securityEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getSeverityBadge(
                          event.severity
                        )}`}
                      >
                        {event.severity}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(event.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white font-mono">{event.type}</div>
                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                      {event.description}
                    </p>
                    <div className="text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-800/60 flex items-center justify-between">
                      <span>Endpoint: {event.endpoint}</span>
                      <span>IP: {event.ipHash.slice(0, 8)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Defensive Architecture */}
          <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Matriz de Controles Ativos
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                Proteção Ativa
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="p-2.5 bg-[#0a0a0c] border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Prepared Statements SQL</div>
                  <div className="text-[10px] text-slate-500">Parâmetros sanitizados contra SQLi</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase px-1.5 py-0.5 bg-emerald-500/10 rounded">
                  OK
                </span>
              </div>

              <div className="p-2.5 bg-[#0a0a0c] border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Sliding-Window Limiter</div>
                  <div className="text-[10px] text-slate-500">Controle anti-abuso e força bruta</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase px-1.5 py-0.5 bg-emerald-500/10 rounded">
                  OK
                </span>
              </div>

              <div className="p-2.5 bg-[#0a0a0c] border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Sandbox Anti-Traversal</div>
                  <div className="text-[10px] text-slate-500">UUIDs e isolamento de diretório</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase px-1.5 py-0.5 bg-emerald-500/10 rounded">
                  OK
                </span>
              </div>

              <div className="p-2.5 bg-[#0a0a0c] border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Fila de Concorrência</div>
                  <div className="text-[10px] text-slate-500">4 workers isolados assíncronos</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase px-1.5 py-0.5 bg-emerald-500/10 rounded">
                  OK
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#13151a] border border-slate-800 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0a0a0c]">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Detalhes do Log de Auditoria ({selectedLog.action})
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">ID do Log</span>
                  <span className="text-slate-200 font-mono select-all">{selectedLog.id}</span>
                </div>
                <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Data e Hora</span>
                  <span className="text-slate-200 font-mono">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Usuário / Ator</span>
                  <span className="text-slate-200 font-mono">
                    {selectedLog.userId || 'Sistema / Não-autenticado'}
                  </span>
                </div>
                <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Resultado</span>
                  <span
                    className={`font-bold font-mono ${
                      selectedLog.success === true || selectedLog.success === 1
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {selectedLog.success === true || selectedLog.success === 1 ? 'SUCESSO' : 'FALHA / BLOQUEADO'}
                  </span>
                </div>
                <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">IP Hash Anônimo</span>
                  <span className="text-slate-300 font-mono text-[11px] select-all">
                    {selectedLog.ipHash}
                  </span>
                </div>
                <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">User Agent</span>
                  <span className="text-slate-400 font-mono text-[11px] break-all">
                    {selectedLog.userAgent}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-xs font-mono uppercase mb-1">
                  Metadados Estruturados (JSON Payload)
                </span>
                <pre className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg text-[11px] font-mono text-blue-300 overflow-x-auto max-h-48">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedLog.metadata || '{}');
                      return JSON.stringify(parsed, null, 2);
                    } catch {
                      return selectedLog.metadata || '{}';
                    }
                  })()}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#0a0a0c] flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
