'use client';

import React from 'react';
import { FileText, Clock, Cpu, Layers, RefreshCw, ShieldCheck, Bookmark } from 'lucide-react';
import { AuditMetadata } from '@/types/domain';

interface DocumentOverviewProps {
  fileName: string;
  documentId: string;
  metadata: AuditMetadata;
  onReset: () => void;
}

function inferDocumentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('consulting') || lower.includes('contractor') || lower.includes('services') || lower.includes('msa')) {
    return 'Commercial Consulting / Services Agreement';
  }
  if (lower.includes('nda') || lower.includes('confidential') || lower.includes('disclosure')) {
    return 'Mutual Non-Disclosure Agreement (NDA)';
  }
  if (lower.includes('license') || lower.includes('eula') || lower.includes('saas') || lower.includes('software')) {
    return 'Software License & Technology Agreement';
  }
  if (lower.includes('employment') || lower.includes('offer') || lower.includes('severance')) {
    return 'Employment / Contractor Agreement';
  }
  if (lower.includes('lease') || lower.includes('tenancy') || lower.includes('property')) {
    return 'Commercial Lease Agreement';
  }
  return 'Commercial Agreement';
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

  const docType = inferDocumentType(fileName);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      {/* Top row: Document identification */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-amber-800" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate" title={fileName}>
                {fileName}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Audit Complete
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                <Bookmark className="w-3 h-3 text-amber-600" />
                <span>{docType}</span>
              </span>
              <span className="font-mono text-slate-400">ID: {documentId}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Upload Another Contract</span>
        </button>
      </div>

      {/* Immediate 3-Question Executive Answers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Q1: Document classification */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            1. Document Classification
          </div>
          <div className="text-xs font-bold text-slate-900 truncate">
            {docType}
          </div>
          <div className="text-[11px] text-slate-500">
            {metadata.total_clauses_analyzed} clauses {metadata.page_count ? `across ${metadata.page_count} pages` : ''}
          </div>
        </div>

        {/* Q2: Attention required */}
        <div className="bg-amber-50/50 border border-amber-200/70 rounded-lg p-3 space-y-1">
          <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
            2. Attention Required
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {metadata.total_findings_count} Total Observations
            </span>
          </div>
          <div className="text-[11px] text-slate-600">
            Grounded commercial issue-spotting
          </div>
        </div>

        {/* Q3: Grounded Evidence Verification */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 space-y-1">
          <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
            3. Grounded Verification
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{metadata.verified_count} of {metadata.total_findings_count} Quotes Verified</span>
          </div>
          <div className="text-[11px] text-emerald-700">
            Checked against source text
          </div>
        </div>
      </div>

      {/* Metadata Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Clauses</div>
            <div className="font-bold text-slate-800">{metadata.total_clauses_analyzed} Segmented</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Duration</div>
            <div className="font-bold text-slate-800">{(metadata.duration_ms / 1000).toFixed(2)}s ({formattedDate})</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 col-span-2">
          <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Inference Evaluator</div>
            <div className="font-mono text-slate-800 font-semibold truncate text-[11px]" title={metadata.model_used}>
              {metadata.model_used}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
