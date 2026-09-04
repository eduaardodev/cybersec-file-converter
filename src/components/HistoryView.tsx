import React, { useState } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { ConversionJob } from '../types/client';

interface HistoryViewProps {
  conversions: ConversionJob[];
  onDownload: (id: string, filename: string) => void;
  onNavigateToConvert: () => void;
  loading?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  conversions,
  onDownload,
  onNavigateToConvert,
  loading = false,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'processing'>('all');

  const filtered = conversions.filter((c) => {
    const matchesSearch =
      (c.outputFileName || '').toLowerCase().includes(search.toLowerCase()) ||
      c.sourceFormat.toLowerCase().includes(search.toLowerCase()) ||
      c.targetFormat.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Bento Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Conversion History</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete audit record of all transformation jobs processed for your account
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or format..."
              className="bg-[#13151a] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
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

      {/* Bento Table Card */}
      <div className="rounded-xl bg-[#13151a] border border-slate-800 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs bg-[#0a0a0c]">
            <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-white font-semibold text-sm">No conversion records match your criteria</p>
            <p className="text-slate-500 mt-1">Transform a document to see records listed here.</p>
            <button
              onClick={onNavigateToConvert}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-sm shadow-blue-900/40"
            >
              <span>Start New Conversion</span> <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0a0a0c] text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Job / Output Name</th>
                  <th className="py-3 px-4">Transformation</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 bg-[#13151a]">
                {filtered.map((conv) => (
                  <tr key={conv.id} className="hover:bg-slate-800/20 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {conv.outputFileName || 'Converted Document'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {conv.id}</div>
                    </td>

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
  );
};
