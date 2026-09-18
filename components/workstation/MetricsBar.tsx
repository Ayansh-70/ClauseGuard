'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { Finding, AuditMetadata } from '@/types/domain';

interface MetricsBarProps {
  findings: Finding[];
  metadata: AuditMetadata;
  rejectedFindings?: Finding[];
}

export function MetricsBar({
  findings,
  metadata,
  rejectedFindings,
}: MetricsBarProps) {
  const highCount = findings.filter((f) => f.attention_level === 'HIGH_ATTENTION').length;
  const mediumCount = findings.filter((f) => f.attention_level === 'MEDIUM_ATTENTION').length;
  const noticeCount = findings.filter(
    (f) =>
      f.attention_level === 'LOW_ATTENTION' ||
      f.attention_level === 'INFORMATIONAL' ||
      f.attention_level === 'STANDARD_NOTICE'
  ).length;

  const rejectedCount = metadata.rejected_count || rejectedFindings?.length || 0;

  return (
    <div className="space-y-3">
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Findings */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Findings
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{findings.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified Source Grounded</span>
          </div>
        </div>

        {/* High Attention */}
        <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>High Attention</span>
          </div>
          <div className="text-2xl font-extrabold text-rose-900">{highCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Material exposure / uncapped terms
          </div>
        </div>

        {/* Medium Attention */}
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Medium Attention</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-900">{mediumCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Commercial obligations & timing
          </div>
        </div>

        {/* Standard Notices */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Standard Notices</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{noticeCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Standard contractual provisions
          </div>
        </div>
      </div>

      {/* Transparency Note if findings were rejected / quarantined */}
      {rejectedCount > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Source Integrity Shield:</strong> {rejectedCount}{' '}
            {rejectedCount === 1 ? 'observation was' : 'observations were'} excluded because{' '}
            {rejectedCount === 1 ? 'its' : 'their'} supporting verbatim quote could not be
            independently verified against the document.
          </span>
        </div>
      )}
    </div>
  );
}
