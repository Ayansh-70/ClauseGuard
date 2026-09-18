'use client';

import React from 'react';
import { FileText, Clock, Cpu, Layers, RefreshCw } from 'lucide-react';
import { AuditMetadata } from '@/types/domain';

interface DocumentOverviewProps {
  fileName: string;
  documentId: string;
  metadata: AuditMetadata;
  onReset: () => void;
}

export function DocumentOverview({
  fileName,
  documentId,
  metadata,
  onReset,
}: DocumentOverviewProps) {
  const formattedDate = new Date(metadata.audited_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-amber-800" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 truncate" title={fileName}>
                {fileName}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Audit Complete
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              ID: {documentId}
            </div>
          </div>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Upload Another Contract</span>
        </button>
      </div>

      {/* Metadata Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Analyzed</div>
            <div className="font-bold text-slate-800">
              {metadata.total_clauses_analyzed} Clauses
              {metadata.page_count ? ` • ${metadata.page_count} Pages` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Duration</div>
            <div className="font-bold text-slate-800">
              {(metadata.duration_ms / 1000).toFixed(2)}s ({formattedDate})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 col-span-2">
          <Cpu className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Engine / Model</div>
            <div className="font-mono text-slate-800 font-semibold truncate" title={metadata.model_used}>
              {metadata.model_used}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
