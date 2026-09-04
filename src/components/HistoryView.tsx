import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  FileCheck,
  Sparkles,
  Lock,
  Users,
  UserX,
  UserCheck,
  ShieldAlert,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { ConversionJob, User, AdminUserSummary } from '../types/client';
import { api } from '../services/api';

interface HistoryViewProps {
  conversions: ConversionJob[];
  onDownload: (id: string, filename: string) => void;
  onNavigateToConvert: () => void;
  loading?: boolean;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  isAdmin?: boolean;
  currentUser?: User | null;
  onToast?: (message: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  conversions,
  onDownload,
  onNavigateToConvert,
  loading = false,
  isAuthenticated = false,
  onRequireAuth,
  isAdmin = false,
  currentUser = null,
  onToast,
}) => {
  // Navigation between conversions and users list for admins
  const [adminSubTab, setAdminSubTab] = useState<'conversions' | 'users'>('conversions');

  // Conversions filtering
  const [searchConversions, setSearchConversions] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'processing'>('all');

  // Admin users state
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Ban Modal State
  const [banModalTarget, setBanModalTarget] = useState<AdminUserSummary | null>(null);
  const [banReason, setBanReason] = useState('Violação dos Termos de Uso');
  const [customReason, setCustomReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch admin users
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(res.users || []);
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err);
      if (onToast) onToast('Erro ao carregar lista de usuários');
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin, onToast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  // Copy helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Ban action
  const handleConfirmBan = async () => {
    if (!banModalTarget) return;
    const finalReason = customReason.trim() || banReason;
    setActionLoading(true);
    try {
      await api.banUser(banModalTarget.id, finalReason);
      if (onToast) {
        onToast(`Usuário ${banModalTarget.email} banido com sucesso.`);
      }
      setBanModalTarget(null);
      setCustomReason('');
      await fetchUsers();
    } catch (err: any) {
      if (onToast) {
        onToast(err.message || 'Falha ao banir usuário');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Unban action
  const handleUnban = async (target: AdminUserSummary) => {
    setActionLoading(true);
    try {
      await api.unbanUser(target.id);
      if (onToast) {
        onToast(`Usuário ${target.email} reativado com sucesso.`);
      }
      await fetchUsers();
    } catch (err: any) {
      if (onToast) {
        onToast(err.message || 'Falha ao reativar usuário');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Conversions Filter Logic
  const filteredConversions = conversions.filter((c) => {
    const matchesSearch =
      (c.outputFileName || '').toLowerCase().includes(searchConversions.toLowerCase()) ||
      c.sourceFormat.toLowerCase().includes(searchConversions.toLowerCase()) ||
      c.targetFormat.toLowerCase().includes(searchConversions.toLowerCase()) ||
      (c.userEmail || '').toLowerCase().includes(searchConversions.toLowerCase()) ||
      c.id.toLowerCase().includes(searchConversions.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Users Filter Logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
      u.id.toLowerCase().includes(searchUsers.toLowerCase());

    const matchesStatus =
      userStatusFilter === 'all'
        ? true
        : userStatusFilter === 'active'
        ? !u.isBanned
        : u.isBanned;

    return matchesSearch && matchesStatus;
  });

  const activeUsersCount = users.filter((u) => !u.isBanned).length;
  const bannedUsersCount = users.filter((u) => u.isBanned).length;
  const totalConversionsCount = users.reduce((acc, curr) => acc + (curr.conversionsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Admin Header & Sub-Navigation */}
      {isAdmin ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Painel de Histórico & Gestão de Usuários
                </h1>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-bold uppercase">
                  Admin Auditoria
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Audite conversões de arquivos realizadas na plataforma e gerencie as permissões e acessos de usuários.
              </p>
            </div>

            {/* Sub-tab switcher */}
            <div className="flex items-center p-1 rounded-xl bg-[#13151a] border border-slate-800 shrink-0">
              <button
                onClick={() => setAdminSubTab('conversions')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  adminSubTab === 'conversions'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>Histórico de Conversões</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    adminSubTab === 'conversions' ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {conversions.length}
                </span>
              </button>

              <button
                onClick={() => setAdminSubTab('users')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  adminSubTab === 'users'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Usuários Ativos & Gestão</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    adminSubTab === 'users' ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {activeUsersCount}
                </span>
                {bannedUsersCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                    {bannedUsersCount} ban
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Regular User Header */
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Conversion History</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Overview and downloads of all transformation jobs processed for your workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchConversions}
                onChange={(e) => setSearchConversions(e.target.value)}
                placeholder="Search filename or format..."
                className="bg-[#13151a] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-hidden w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#13151a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono uppercase focus:border-blue-500 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed Only</option>
              <option value="failed">Failed Only</option>
              <option value="processing">Processing Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Visitor Banner if not authenticated */}
      {!isAuthenticated && (
        <div className="p-4 rounded-xl bg-[#13151a] border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Visitor Mode</h3>
              <p className="text-[11px] text-slate-400">
                You are browsing conversion history in free visitor mode. Log in to permanently sync and access your converted documents anywhere.
              </p>
            </div>
          </div>
          {onRequireAuth && (
            <button
              onClick={onRequireAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase transition cursor-pointer shrink-0 shadow-sm shadow-blue-900/30"
            >
              <Lock className="h-3 w-3" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      )}

      {/* VIEW: CONVERSIONS LIST (Shown for Regular Users, or when Admin chooses Conversions Tab) */}
      {(!isAdmin || adminSubTab === 'conversions') && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#13151a] border border-slate-800">
              <div className="text-xs text-slate-400">
                Exibindo <span className="text-white font-bold">{filteredConversions.length}</span> transformações registradas no sistema.
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchConversions}
                    onChange={(e) => setSearchConversions(e.target.value)}
                    placeholder="Filtrar por usuário, arquivo ou formato..."
                    className="bg-[#0a0a0c] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-hidden w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[#0a0a0c] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono uppercase focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="all">Todos os Status</option>
                  <option value="completed">Concluídos</option>
                  <option value="failed">Falhas / Bloqueados</option>
                  <option value="processing">Em Processamento</option>
                </select>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="rounded-xl bg-[#13151a] border border-slate-800 overflow-hidden shadow-xs">
            {filteredConversions.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs bg-[#0a0a0c]">
                <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-white font-semibold text-sm">
                  {isAdmin ? 'Nenhum registro de conversão encontrado' : 'No conversion records match your criteria'}
                </p>
                <p className="text-slate-500 mt-1">
                  {isAdmin
                    ? 'As conversões executadas pelos usuários aparecerão nesta listagem de auditoria.'
                    : 'Transform a document to see records listed here.'}
                </p>
                {!isAdmin && (
                  <button
                    onClick={onNavigateToConvert}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-sm shadow-blue-900/40"
                  >
                    <span>Start New Conversion</span> <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0a0a0c] text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Job / Output Name</th>
                      {isAdmin && <th className="py-3 px-4">Usuário</th>}
                      <th className="py-3 px-4">Transformation</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300 bg-[#13151a]">
                    {filteredConversions.map((conv) => (
                      <tr key={conv.id} className="hover:bg-slate-800/20 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">
                            {conv.outputFileName || 'Converted Document'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {conv.id}</div>
                        </td>

                        {isAdmin && (
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-xs text-blue-300">
                              {conv.userEmail || `User: ${conv.userId.slice(0, 8)}`}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">UID: {conv.userId.slice(0, 8)}...</div>
                          </td>
                        )}

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0a0a0c] text-slate-300 border border-slate-800 font-mono text-[10px] uppercase">
                            <span>{conv.sourceFormat}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-blue-400 font-bold">{conv.targetFormat}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          <div>{new Date(conv.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-500">{new Date(conv.createdAt).toLocaleTimeString()}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {conv.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-green-500 uppercase px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          )}
                          {conv.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-blue-400 uppercase px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 animate-pulse">
                              <Clock className="h-3 w-3" />
                              Processing
                            </span>
                          )}
                          {conv.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              <Clock className="h-3 w-3" />
                              Queued
                            </span>
                          )}
                          {conv.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 uppercase px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20" title={conv.errorMessage}>
                              <XCircle className="h-3 w-3" />
                              Blocked
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {conv.status === 'completed' ? (
                            <button
                              onClick={() => onDownload(conv.id, conv.outputFileName || 'converted_file')}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-blue-400 hover:text-white border border-slate-800 font-mono text-xs transition cursor-pointer"
                            >
                              <Download className="h-3 w-3" />
                              <span>Download</span>
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[11px] font-mono italic">Unavailable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: USERS MANAGEMENT (Only for Admin when Users Sub-Tab is active) */}
      {isAdmin && adminSubTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#13151a] border border-slate-800">
              <div className="text-[11px] font-mono uppercase text-slate-500">Total de Usuários</div>
              <div className="text-xl font-bold text-white mt-1">{users.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Contas registradas</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#13151a] border border-slate-800">
              <div className="text-[11px] font-mono uppercase text-green-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Usuários Ativos
              </div>
              <div className="text-xl font-bold text-green-400 mt-1">{activeUsersCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Com acesso irrestrito</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#13151a] border border-slate-800">
              <div className="text-[11px] font-mono uppercase text-red-400 flex items-center gap-1.5">
                <UserX className="h-3 w-3" />
                Contas Suspensas
              </div>
              <div className="text-xl font-bold text-red-400 mt-1">{bannedUsersCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Acesso revogado</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#13151a] border border-slate-800">
              <div className="text-[11px] font-mono uppercase text-blue-400">Total de Conversões</div>
              <div className="text-xl font-bold text-blue-400 mt-1">{totalConversionsCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Processadas pela base</div>
            </div>
          </div>

          {/* User Filter and Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#13151a] border border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  placeholder="Pesquisar por email ou ID de usuário..."
                  className="bg-[#0a0a0c] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-hidden w-64"
                />
              </div>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value as any)}
                className="bg-[#0a0a0c] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono uppercase focus:border-blue-500 focus:outline-hidden"
              >
                <option value="all">Todos os Usuários</option>
                <option value="active">Apenas Ativos</option>
                <option value="banned">Apenas Banidos</option>
              </select>
            </div>

            <button
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition cursor-pointer"
              title="Atualizar lista de usuários"
            >
              <RefreshCw className={`h-3 w-3 ${loadingUsers ? 'animate-spin text-blue-400' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="rounded-xl bg-[#13151a] border border-slate-800 overflow-hidden shadow-xs">
            {filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs bg-[#0a0a0c]">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-white font-semibold text-sm">Nenhum usuário corresponde aos filtros aplicados</p>
                <p className="text-slate-500 mt-1">
                  Ajuste sua busca ou modifique o filtro de status para ver os usuários cadastrados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0a0a0c] text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Usuário / Identificador</th>
                      <th className="py-3 px-4">Função</th>
                      <th className="py-3 px-4">Conversões</th>
                      <th className="py-3 px-4">Cadastrado Em</th>
                      <th className="py-3 px-4">Status da Conta</th>
                      <th className="py-3 px-4 text-right">Ação de Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300 bg-[#13151a]">
                    {filteredUsers.map((u) => {
                      const isCurrentAdmin = currentUser?.id === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/20 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{u.email}</span>
                              {isCurrentAdmin && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-mono uppercase font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span>ID: {u.id.slice(0, 12)}...</span>
                              <button
                                onClick={() => handleCopyId(u.id)}
                                className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
                                title="Copiar ID completo"
                              >
                                {copiedId === u.id ? (
                                  <Check className="h-2.5 w-2.5 text-green-400" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-bold uppercase">
                                Administrador
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                                Usuário
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-xs">
                            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                              <FileCheck className="h-3 w-3 text-slate-500" />
                              <span>{u.conversionsCount}</span>
                              <span className="text-[10px] text-slate-500 font-normal">jobs</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            <div>{new Date(u.createdAt).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-500">{new Date(u.createdAt).toLocaleTimeString()}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            {!u.isBanned ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-green-400 uppercase px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Ativo
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 uppercase px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                                  <UserX className="h-3 w-3" />
                                  Banido
                                </span>
                                {u.banReason && (
                                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]" title={u.banReason}>
                                    Motivo: {u.banReason}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isCurrentAdmin ? (
                              <span className="text-[11px] font-mono text-slate-600 italic">
                                Conta em sessão
                              </span>
                            ) : !u.isBanned ? (
                              <button
                                onClick={() => setBanModalTarget(u)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 font-mono text-xs transition cursor-pointer"
                              >
                                <UserX className="h-3 w-3" />
                                <span>Banir Usuário</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnban(u)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 border border-green-500/30 font-mono text-xs transition cursor-pointer"
                              >
                                <UserCheck className="h-3 w-3" />
                                <span>Reativar Conta</span>
                              </button>
                            )}
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
      )}

      {/* MODAL: Ban Confirmation */}
      {banModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#13151a] border border-red-500/30 p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Banir Usuário</h3>
                <p className="text-xs text-slate-400">
                  Você está prestes a desativar a conta de <span className="text-white font-mono font-semibold">{banModalTarget.email}</span>.
                </p>
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3.5 rounded-xl bg-[#0a0a0c] border border-slate-800 text-xs space-y-1.5 text-slate-400">
              <p className="text-white font-medium">Atenção ao revogar o acesso:</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                O usuário não poderá mais efetuar login ou realizar novas conversões. Os arquivos já gerados e o histórico de auditoria permanecem salvos, e o acesso pode ser reativado a qualquer momento.
              </p>
            </div>

            {/* Reason Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400 font-bold">
                Motivo do Banimento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Violação dos Termos de Uso',
                  'Excesso de Requisições / Abuso',
                  'Tentativa de Injeção / Exploit',
                  'Atividade Suspeita / Segurança',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setBanReason(reason);
                      setCustomReason('');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] transition cursor-pointer border ${
                      banReason === reason && !customReason
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                        : 'bg-[#0a0a0c] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Ou digite uma justificativa personalizada..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-hidden"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBanModalTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer shadow-sm shadow-red-900/40"
              >
                <UserX className="h-3.5 w-3.5" />
                <span>{actionLoading ? 'Aplicando...' : 'Confirmar Banimento'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
