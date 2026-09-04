import React from 'react';
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
} from 'lucide-react';
import { DashboardStats, ConversionJob } from '../types/client';

interface DashboardViewProps {
  stats: DashboardStats | null;
  conversions: ConversionJob[];
  onNavigateToConvert: () => void;
  onNavigateToSecurity: () => void;
  onDownload: (id: string, filename: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  conversions,
  onNavigateToConvert,
  onNavigateToSecurity,
  onDownload,
}) => {
  const userStats = stats?.userStats || {
    totalConversions: 0,
    successfulConversions: 0,
    failedConversions: 0,
    filesUploaded: 0,
  };

  const metricCards = [
    {
      title: 'Total Conversions',
      value: userStats.totalConversions,
      accent: 'text-white',
      caption: 'Processed jobs',
      progress: Math.min(100, Math.max(15, (userStats.totalConversions || 1) * 12)),
      barColor: 'bg-blue-500',
    },
    {
      title: 'Successful',
      value: userStats.successfulConversions,
      accent: 'text-emerald-400',
      caption: 'Verified transformations',
      progress: userStats.totalConversions > 0 ? Math.round((userStats.successfulConversions / userStats.totalConversions) * 100) : 100,
      barColor: 'bg-emerald-500',
    },
    {
      title: 'Failed Probes',
      value: userStats.failedConversions,
      accent: 'text-red-400',
      caption: 'Intercepted malicious input',
      progress: userStats.failedConversions > 0 ? 40 : 0,
      barColor: 'bg-red-500',
    },
    {
      title: 'Files Ingested',
      value: userStats.filesUploaded,
      accent: 'text-indigo-400',
      caption: 'Private isolated storage',
      progress: Math.min(100, (userStats.filesUploaded || 1) * 20),
      barColor: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Bento Header */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security & Conversion Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Academic testing environment for high-concurrency resilience.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToConvert}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-sm shadow-blue-900/40"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>New Conversion</span>
          </button>
          <button
            onClick={onNavigateToSecurity}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#13151a] hover:bg-slate-800 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase transition cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Security Demo</span>
          </button>
        </div>
      </header>

      {/* Bento 4-Col Metrics Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((card) => (
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

      {/* Bento Grid: 2 Column Layout (Left: Conversions & Queue | Right: Protection Stack) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Span 2: Recent Activity & Jobs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-[#13151a] border border-slate-800 rounded-xl p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Transformation Jobs</h3>
                <p className="text-[11px] text-slate-500">Traceable conversion queue status</p>
              </div>
              <button
                onClick={onNavigateToConvert}
                className="text-xs text-blue-400 hover:text-blue-300 font-mono font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Upload file</span> <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {conversions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-[#0a0a0c] border border-slate-800/80 rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-slate-400 font-medium">No conversion jobs recorded yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Try converting CSV, JSON, Markdown, or TXT sample files.
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
                          Worker Active
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
                          Blocked
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
                <p className="text-xs font-bold text-white uppercase tracking-wider">Zero-Trust Format Matrix</p>
                <p className="text-[11px] text-slate-500">Strict format whitelisting & magic byte verification</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-slate-800 text-slate-400 rounded">CSV ⇄ JSON</span>
              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-slate-800 text-slate-400 rounded">MD → HTML</span>
              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-slate-800 text-slate-400 rounded">TXT → PDF</span>
              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-slate-800 text-slate-400 rounded">JSON ⇄ YAML</span>
            </div>
          </div>
        </div>

        {/* Right Span 1: Protection Stack (Bento Sidebar) */}
        <div className="col-span-1 bg-[#13151a] border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Protection Stack</h3>
            <span className="text-[10px] font-mono text-green-500 font-bold uppercase px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded">
              Online
            </span>
          </div>

          <div className="space-y-3 flex-1">
            <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-300">SQL Injection</span>
                <span className="text-[10px] text-green-500 font-bold uppercase font-mono">Active</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Query parameterization via prepared statements ($1 / ?).
              </p>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-300">Rate Limiting</span>
                <span className="text-[10px] text-green-500 font-bold uppercase font-mono">Active</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Sliding-window throttles across Auth, Upload & Jobs.
              </p>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-300">MIME Validation</span>
                <span className="text-[10px] text-green-500 font-bold uppercase font-mono">Active</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Magic byte & null byte checks (no raw extension trust).
              </p>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-slate-800 rounded-lg border-l-4 border-l-blue-600">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-300">Audit Engine</span>
                <span className="text-[10px] text-blue-400 font-bold uppercase font-mono">Ready</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                SHA-256 IP anonymization and sanitized state logs.
              </p>
            </div>
          </div>

          <div className="bg-blue-600 p-4 rounded-lg text-white">
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Academic Security Lab</p>
            <p className="text-[10px] leading-relaxed opacity-90">
              Interactive testbench for SQLi vectors, burst traffic 429 triggers, and error redaction.
            </p>
            <button
              onClick={onNavigateToSecurity}
              className="mt-3 w-full py-2 bg-white text-blue-600 rounded font-bold text-[11px] uppercase hover:bg-slate-100 transition cursor-pointer"
            >
              Open Security Lab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
