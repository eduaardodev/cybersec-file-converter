import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { StoredFile, ConversionJob } from '../types/client';

interface ConverterViewProps {
  onConversionCreated: () => void;
  onDownload: (id: string, filename: string) => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

type StepStatus = 'idle' | 'uploading' | 'validating' | 'queued' | 'converting' | 'completed' | 'error';

export const ConverterView: React.FC<ConverterViewProps> = ({
  onConversionCreated,
  onDownload,
  isAuthenticated,
  onRequireAuth,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetFormat, setTargetFormat] = useState<string>('json');
  const [status, setStatus] = useState<StepStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<ConversionJob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available target formats map
  const getTargetsForExt = (filename: string): string[] => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'csv':
        return ['json'];
      case 'json':
        return ['csv', 'yaml'];
      case 'md':
      case 'markdown':
        return ['html'];
      case 'txt':
        return ['pdf', 'html'];
      case 'yaml':
      case 'yml':
        return ['json'];
      default:
        return ['json', 'html', 'pdf'];
    }
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    setStatus('idle');
    setErrorMessage(null);
    setCurrentJob(null);

    const targets = getTargetsForExt(file.name);
    if (targets.length > 0) {
      setTargetFormat(targets[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Sample preset generator for rapid academic presentation
  const loadPreset = (type: 'csv' | 'json' | 'md' | 'txt') => {
    let content = '';
    let name = '';
    let mime = 'text/plain';

    if (type === 'csv') {
      name = 'sales_metrics_sample.csv';
      content = 'month,revenue,profit,region\nJanuary,125000,45000,North\nFebruary,142000,52000,South\nMarch,168000,61000,East';
      mime = 'text/csv';
    } else if (type === 'json') {
      name = 'catalog_items.json';
      content = JSON.stringify(
        [
          { id: 'SKU-001', name: 'Ultra Book Pro', price: 1299, stock: 42 },
          { id: 'SKU-002', name: 'Ergo Mechanical Keyboard', price: 149, stock: 120 },
        ],
        null,
        2
      );
      mime = 'application/json';
    } else if (type === 'md') {
      name = 'architecture_overview.md';
      content = `# System Security Architecture\n\n## Abstract\nDemonstrating high-concurrency file conversion with zero-trust validation.\n\n- Parameterized SQL execution\n- Sliding window rate limiting\n- Isolated private storage`;
      mime = 'text/markdown';
    } else {
      name = 'audit_certificate.txt';
      content = 'ACADEMIC AUDIT VERIFICATION CERTIFICATE\n\nDate: 2026-09-02\nVerification Engine: File System Converter v1.0\nStatus: All cryptographic and concurrency parameters verified.';
      mime = 'text/plain';
    }

    const blob = new Blob([content], { type: mime });
    const file = new File([blob], name, { type: mime });
    handleFileSelection(file);
  };

  const startConversion = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!selectedFile) return;

    try {
      setStatus('uploading');
      setErrorMessage(null);

      // Step 1: Upload & File Security validation
      await new Promise((r) => setTimeout(r, 400));
      setStatus('validating');

      const uploadRes = await api.uploadFile(selectedFile);
      const uploadedFile: StoredFile = uploadRes.file;

      // Step 2: Queue job
      setStatus('queued');
      await new Promise((r) => setTimeout(r, 300));
      const conversionRes = await api.createConversion(uploadedFile.id, targetFormat);

      // Step 3: Polling for worker completion
      setStatus('converting');
      const jobId = conversionRes.conversion.id;

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const pollRes = await api.getConversion(jobId);
          if (pollRes.conversion.status === 'completed') {
            clearInterval(pollInterval);
            setCurrentJob(pollRes.conversion);
            setStatus('completed');
            onConversionCreated();
          } else if (pollRes.conversion.status === 'failed') {
            clearInterval(pollInterval);
            setStatus('error');
            setErrorMessage(pollRes.conversion.errorMessage || 'Conversion failed during worker processing.');
          } else if (attempts > 30) {
            clearInterval(pollInterval);
            setStatus('error');
            setErrorMessage('Conversion polling timed out.');
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setStatus('error');
          setErrorMessage(pollErr.message);
        }
      }, 600);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to process file.');
    }
  };

  const availableTargets = selectedFile ? getTargetsForExt(selectedFile.name) : ['json', 'csv', 'html', 'pdf', 'yaml'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Bento Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Conversion Hub</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Select or drop a file to convert between formats with real-time security validation and asynchronous worker processing.
        </p>
      </div>

      {/* Bento Preset Bar */}
      <div className="p-3.5 rounded-xl bg-[#13151a] border border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Quick Test Presets:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPreset('csv')}
            className="px-3 py-1.5 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition cursor-pointer"
          >
            CSV Sample
          </button>
          <button
            onClick={() => loadPreset('json')}
            className="px-3 py-1.5 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition cursor-pointer"
          >
            JSON Sample
          </button>
          <button
            onClick={() => loadPreset('md')}
            className="px-3 py-1.5 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition cursor-pointer"
          >
            Markdown Sample
          </button>
          <button
            onClick={() => loadPreset('txt')}
            className="px-3 py-1.5 rounded-lg bg-[#0a0a0c] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition cursor-pointer"
          >
            TXT Sample
          </button>
        </div>
      </div>

      {/* Drag and Drop Zone Bento Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : selectedFile
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-slate-800 hover:border-slate-700 bg-[#13151a] hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelection(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UploadCloud className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              {selectedFile ? selectedFile.name : 'Drop your file here, or click to browse'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supported: CSV, JSON, TXT, Markdown (.md), YAML (Max 10 MB)
            </p>
          </div>

          {selectedFile && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0a0a0c] text-slate-300 text-xs font-mono border border-slate-800">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span className="uppercase">{selectedFile.name.split('.').pop()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Target Format & Conversion Trigger */}
      {selectedFile && (
        <div className="p-5 rounded-xl bg-[#13151a] border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-0.5">
                Convert To Format
              </label>
              <p className="text-[11px] text-slate-500">Target output file representation</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                disabled={status !== 'idle' && status !== 'error'}
                className="bg-[#0a0a0c] border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 font-mono focus:border-blue-500 focus:outline-hidden uppercase"
              >
                {availableTargets.map((target) => (
                  <option key={target} value={target}>
                    {target.toUpperCase()}
                  </option>
                ))}
              </select>

              <button
                id="btn-trigger-convert"
                onClick={startConversion}
                disabled={status !== 'idle' && status !== 'error'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase transition cursor-pointer shadow-sm shadow-blue-900/40"
              >
                {status === 'idle' || status === 'error' ? (
                  <>
                    <span>Convert Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stepped Progress Animation */}
          {status !== 'idle' && (
            <div className="pt-4 border-t border-slate-800">
              <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
                {[
                  { key: 'uploading', label: '1. Uploading' },
                  { key: 'validating', label: '2. Validating' },
                  { key: 'queued', label: '3. Queued' },
                  { key: 'converting', label: '4. Converting' },
                  { key: 'completed', label: '5. Completed' },
                ].map((step, idx) => {
                  const stepOrder = ['uploading', 'validating', 'queued', 'converting', 'completed'];
                  const currentIndex = stepOrder.indexOf(status);
                  const stepIndex = idx;
                  const isFinished = currentIndex > stepIndex || status === 'completed';
                  const isCurrent = status === step.key;

                  return (
                    <div
                      key={step.key}
                      className={`p-2.5 rounded-lg border transition ${
                        isFinished
                          ? 'bg-green-500/10 border-green-500/30 text-green-400 font-bold'
                          : isCurrent
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 animate-pulse font-bold'
                          : 'bg-[#0a0a0c] border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="truncate text-[10px] uppercase">{step.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {status === 'error' && errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 flex items-start gap-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block uppercase text-[11px]">Conversion Failed</span>
                <span className="text-slate-300">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Completed State & Download */}
          {status === 'completed' && currentJob && (
            <div className="p-4 rounded-xl bg-[#0a0a0c] border border-green-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Conversion Completed Successfully</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {currentJob.outputFileName} ready for download
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onDownload(currentJob.id, currentJob.outputFileName || 'converted_file')
                  }
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-sm shadow-green-900/40"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setStatus('idle');
                    setCurrentJob(null);
                  }}
                  className="p-1.5 rounded-lg bg-[#13151a] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                  title="Convert another file"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
