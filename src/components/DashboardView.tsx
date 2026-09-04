import React, { useState } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  FolderUp,
  ArrowRight,
  ShieldCheck,
  Clock,
  ArrowLeftRight,
  Download,
  Sparkles,
  Zap,
  Lock,
  Layers,
  FileCode2,
} from 'lucide-react';
import { DashboardStats, ConversionJob } from '../types/client';
import { AdminAuditDashboard } from './AdminAuditDashboard';

interface DashboardViewProps {
  stats: DashboardStats | null;
  conversions: ConversionJob[];
  onNavigateToConvert: () => void;
  onDownload: (id: string, filename: string) => void;
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  conversions,
  onNavigateToConvert,
  onDownload,
  isAdmin = false,
  isAuthenticated = false,
  onRequireAuth,
}) => {
  // For admin, the dashboard is exclusively a comprehensive system audit center
  if (isAuthenticated && isAdmin) {
    return (
      <AdminAuditDashboard
        stats={stats}
      />
    );
  }

  const userStats = stats?.userStats || {
    totalConversions: 0,
    successfulConversions: 0,
    failedConversions: 0,
    filesUploaded: 0,
  };

  // Visitor metric cards (clean, anonymous, no data leakage)
  const visitorMetricCards = [
    {
      title: 'Suas Conversões',
      value: '—',
      accent: 'text-slate-400',
      caption: 'Requer login para exibir',
      progress: 0,
      barColor: 'bg-slate-700',
    },
    {
      title: 'Arquivos Concluídos',
      value: '—',
      accent: 'text-slate-400',
      caption: 'Requer login para exibir',
      progress: 0,
      barColor: 'bg-slate-700',
    },
    {
      title: 'Formatos Suportados',
      value: '8+',
      accent: 'text-blue-400',
      caption: 'CSV, JSON, PDF, MD, HTML...',
      progress: 90,
      barColor: 'bg-blue-500',
    },
    {
      title: 'Armazenamento',
      value: 'Privado',
      accent: 'text-purple-400',
      caption: 'Isolamento por sessão',
      progress: 100,
      barColor: 'bg-purple-500',
    },
  ];

  // Regular user metric cards (clean, user-friendly, non-technical)
  const regularMetricCards = [
    {
      title: 'Total Conversions',
      value: userStats.totalConversions,
      accent: 'text-white',
      caption: 'Processed files',
      progress: Math.min(100, Math.max(15, (userStats.totalConversions || 1) * 15)),
      barColor: 'bg-blue-500',
    },
    {
      title: 'Completed',
      value: userStats.successfulConversions,
      accent: 'text-emerald-400',
      caption: 'Successful jobs',
      progress: userStats.totalConversions > 0 ? Math.round((userStats.successfulConversions / userStats.totalConversions) * 100) : 100,
      barColor: 'bg-emerald-500',
    },
    {
      title: 'Supported Formats',
      value: '8+',
      accent: 'text-blue-400',
      caption: 'CSV, JSON, PDF, MD, HTML...',
      progress: 90,
      barColor: 'bg-blue-500',
    },
    {
      title: 'Files Uploaded',
      value: userStats.filesUploaded,
      accent: 'text-purple-400',
      caption: 'Session files stored',
      progress: Math.min(100, (userStats.filesUploaded || 1) * 20),
      barColor: 'bg-purple-500',
    },
  ];

  const activeCards = !isAuthenticated ? visitorMetricCards : regularMetricCards;

  return (
    <div className="space-y-6">
      {/* Visitor Banner if not logged in */}
      {!isAuthenticated && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#13151a] to-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Painel em Modo Visitante</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Os dados de conversões e métricas pessoais estão ocultos. Faça login para acessar suas estatísticas completas.
              </p>
            </div>
          </div>
          {onRequireAuth && (
            <button
              onClick={onRequireAuth}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-sm shadow-blue-900/40 shrink-0"
            >
              Fazer Login
            </button>
          )}
        </div>
      )}

      {/* Bento Header */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Conversion Dashboard</h1>
            {!isAuthenticated && (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px] font-bold uppercase">
                Visitante
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Transform, manage, and download your files across formats with high fidelity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNavigateToConvert}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-sm shadow-blue-900/40"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>New Conversion</span>
          </button>
        </div>
      </header>

      {/* Bento 4-Col Metrics Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activeCards.map((card) => (
          <div key={card.title} className="bg-[#13151a] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">{card.title}</p>
              <p className={`text-2xl font-bold ${card.accent} mt-1 font-mono`}>{card.value}</p>
            </div>
            <div className="mt-3">
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${card.barColor}`} style={{ width: `${card.progress}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">{card.caption}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Bento Grid: 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Span 2: Recent Activity & Formats */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-[#13151a] border border-slate-800 rounded-xl p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Transformations</h3>
                <p className="text-[11px] text-slate-500">Your recent file conversion activity</p>
              </div>
              <button
                onClick={onNavigateToConvert}
                className="text-xs text-blue-400 hover:text-blue-300 font-mono font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Upload file</span> <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-[#0a0a0c] border border-slate-800/80 rounded-lg space-y-3 px-6">
                <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Histórico Privado de Conversões</h4>
                  <p className="text-slate-400 max-w-sm mx-auto text-xs mt-1">
                    Para proteger a privacidade dos seus arquivos, seu histórico de conversões e links de download estão disponíveis apenas após o login.
                  </p>
                </div>
                {onRequireAuth && (
                  <div className="pt-1">
                    <button
                      onClick={onRequireAuth}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer shadow-sm"
                    >
                      Fazer Login na Conta
                    </button>
                  </div>
                )}
              </div>
            ) : conversions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-[#0a0a0c] border border-slate-800/80 rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-slate-400 font-medium">No conversions yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Convert CSV, JSON, Markdown, or TXT documents easily.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversions.slice(0, 5).map((conv) => (
                  <div
                    key={conv.id}
                    className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg flex items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#13151a] border border-slate-800 flex items-center justify-center text-blue-400 shrink-0 font-mono text-xs font-bold uppercase">
                        {conv.targetFormat.slice(0, 3)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-white text-xs truncate">
                          {conv.outputFileName || `Job #${conv.id.slice(0, 8)}`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="uppercase text-slate-400">{conv.sourceFormat} → {conv.targetFormat}</span>
                          <span>•</span>
                          <span>{new Date(conv.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {conv.status === 'completed' && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-green-500 uppercase px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Done
                        </span>
                      )}
                      {conv.status === 'processing' && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-400 uppercase px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 animate-pulse">
                          Processing
                        </span>
                      )}
                      {conv.status === 'pending' && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          Queued
                        </span>
                      )}
                      {conv.status === 'failed' && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 uppercase px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20" title={conv.errorMessage}>
                          <XCircle className="h-3 w-3" />
                          Failed
                        </span>
                      )}

                      {conv.status === 'completed' && (
                        <button
                          onClick={() => onDownload(conv.id, conv.outputFileName || 'converted_file')}
                          className="p-1.5 rounded bg-[#13151a] hover:bg-slate-800 text-blue-400 hover:text-white border border-slate-800 transition cursor-pointer"
                          title="Download converted file"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Secondary Bento card: Supported transformations */}
          <div className="bg-[#13151a] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <FileCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Popular Conversions</p>
                <p className="text-[11px] text-slate-500">Universal document and data structure transformations</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-slate-800 text-slate-300 rounded">CSV ⇄ JSON</span>
              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-slate-800 text-slate-300 rounded">MD → HTML</span>
              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-slate-800 text-slate-300 rounded">TXT → PDF</span>
              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-slate-800 text-slate-300 rounded">JSON ⇄ YAML</span>
            </div>
          </div>
        </div>

        {/* Right Span 1: Clean Features & Instant Conversion Call-To-Action */}
        <div className="col-span-1 bg-[#13151a] border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Features</h3>
          </div>

          <div className="space-y-3 flex-1">
            <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-slate-200">High-Speed Processing</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Instantly transform datasets and documents with lossless structural formatting.
              </p>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FileCode2 className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">Universal Compatibility</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Seamlessly convert between CSV, JSON, Markdown, PDF, HTML, and YAML.
              </p>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">Private & Secure Storage</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Files are processed in isolated workspaces and available exclusively to you.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-lg text-white">
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Need to Convert a File?</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              Drop your file into the Conversion Hub to get started in seconds with instant download.
            </p>
            <button
              onClick={onNavigateToConvert}
              className="mt-3 w-full py-2 bg-white text-blue-700 rounded font-bold text-xs uppercase hover:bg-slate-100 transition cursor-pointer shadow-sm"
            >
              Start Converting Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

