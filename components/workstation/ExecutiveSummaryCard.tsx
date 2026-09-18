'use client';

import React from 'react';
import { FileSearch, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ExecutiveSummaryCardProps {
  summary: string;
  primaryConcerns: string[];
}

export function ExecutiveSummaryCard({
  summary,
  primaryConcerns,
}: ExecutiveSummaryCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
        <FileSearch className="w-4 h-4 text-amber-600" />
        <span>Executive Contract Summary</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3 h-3" />
          <span>Grounded in Source Text</span>
        </span>
      </div>

      {/* Summary paragraph */}
      <p className="text-xs text-slate-700 leading-relaxed">
        {summary}
      </p>

      {/* Primary commercial concerns */}
      {primaryConcerns && primaryConcerns.length > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Primary Areas of Commercial Attention:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {primaryConcerns.map((concern, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{concern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
