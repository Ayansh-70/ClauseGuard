'use client';

import React from 'react';
import {
  ShieldCheck,
  ArrowLeftRight,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { ComparisonFinding, ComparisonMetadata } from '@/types/domain';

interface ComparisonMetricsBarProps {
  findings: ComparisonFinding[];
  metadata: ComparisonMetadata;
  rejectedFindings?: ComparisonFinding[];
}

export function ComparisonMetricsBar({
  findings,
  metadata,
  rejectedFindings = [],
}: ComparisonMetricsBarProps) {
  const counts = {
    total: findings.length,
    changed: findings.filter((f) => f.status === 'changed').length,
    added: findings.filter((f) => f.status === 'added').length,
    removed: findings.filter((f) => f.status === 'removed').length,
    same: findings.filter((f) => f.status === 'same').length,
    ambiguous: findings.filter((f) => f.status === 'ambiguous').length,
  };

  const hasRejected = rejectedFindings.length > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Findings */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Findings
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.total}</span>
            <span className="text-[11px] text-slate-400">analyzed</span>
          </div>
        </div>

        {/* Changed */}
        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3 text-amber-600" />
            <span>Changed</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{counts.changed}</span>
            <span className="text-[11px] text-amber-600">modified</span>
          </div>
        </div>

        {/* Added */}
        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <PlusCircle className="w-3 h-3 text-emerald-600" />
            <span>Added in B</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{counts.added}</span>
            <span className="text-[11px] text-emerald-600">new clauses</span>
          </div>
        </div>

        {/* Removed */}
        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <MinusCircle className="w-3 h-3 text-rose-600" />
            <span>Removed</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{counts.removed}</span>
            <span className="text-[11px] text-rose-600">omitted</span>
          </div>
        </div>

        {/* Ambiguous / Needs Review */}
        <div className="bg-white border border-indigo-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-indigo-600" />
            <span>Needs Review</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{counts.ambiguous}</span>
            <span className="text-[11px] text-indigo-600">uncertain</span>
          </div>
        </div>

        {/* Same */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            <span>Equivalent</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-600">{counts.same}</span>
            <span className="text-[11px] text-slate-400">substantially same</span>
          </div>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-inner">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-100">
            Independent Dual-Document Verification:
          </span>
          <span className="text-slate-300">
            {metadata.verified_findings_count} of {metadata.total_findings_count} findings verified against verbatim text
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>Contract A & B quotes checked</span>
        </div>
      </div>

      {/* Quarantine Alert if any */}
      {hasRejected && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Notice: </span>
            <span>
              {rejectedFindings.length} observation(s) lacked verifiable source quotes in one or both contracts and were quarantined for integrity.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
