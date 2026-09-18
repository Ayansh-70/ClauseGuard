'use client';

import React from 'react';
import { ArrowLeftRight, Clock, Layers, RotateCcw, ShieldCheck } from 'lucide-react';
import { ComparisonMetadata } from '@/types/domain';

interface ComparisonOverviewProps {
  summary: string;
  metadata: ComparisonMetadata;
  onReset: () => void;
}

export function ComparisonOverview({
  summary,
  metadata,
  onReset,
}: ComparisonOverviewProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
      {/* Top bar: Document names & Reset */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Grounded Comparison Result</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900">
            <span className="text-blue-700 font-mono text-sm sm:text-base">
              {metadata.contract_a_metadata.file_name}
            </span>
            <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-amber-800 font-mono text-sm sm:text-base">
              {metadata.contract_b_metadata.file_name}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 self-start md:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Comparison</span>
        </button>
      </div>

      {/* Summary Narrative */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Comparative Summary
        </h3>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          {summary}
        </p>
      </div>

      {/* Metadata Telemetry Pills */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Duration: {(metadata.duration_ms / 1000).toFixed(2)}s</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Pre-aligned Provisions: {metadata.aligned_pairs_count}</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1.5">
          <span>Evaluator: {metadata.model_used}</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
          <span>ID: {metadata.comparison_id}</span>
        </div>
      </div>
    </div>
  );
}
