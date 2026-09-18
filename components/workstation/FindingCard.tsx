'use client';

import React from 'react';
import { ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';
import { Finding } from '@/types/domain';
import { AttentionBadge } from './AttentionBadge';

interface FindingCardProps {
  finding: Finding;
  onSelect: (finding: Finding) => void;
}

export function FindingCard({ finding, onSelect }: FindingCardProps) {
  const isVerified =
    finding.verification_status === 'VERIFIED_EXACT' ||
    finding.verification_status === 'VERIFIED_NORMALIZED';

  return (
    <div
      onClick={() => onSelect(finding)}
      className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
    >
      <div className="space-y-3">
        {/* Card Header: Attention Tier & Category */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <AttentionBadge level={finding.attention_level} size="sm" />

          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
            {finding.category.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug">
          {finding.title}
        </h3>

        {/* Plain-English Summary */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
          {finding.plain_language_explanation}
        </p>

        {/* Commercial Implication / Why It Matters */}
        {finding.why_it_matters && (
          <div className="bg-slate-50 border-l-2 border-amber-400 p-2.5 rounded-r-md text-xs text-slate-700">
            <span className="font-semibold text-slate-900 block text-[11px] mb-0.5">
              Why it matters:
            </span>
            <p className="line-clamp-2 text-slate-600">{finding.why_it_matters}</p>
          </div>
        )}
      </div>

      {/* Card Footer: Source Reference & CTA */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        {/* Source citation */}
        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Clause: {finding.clause_id}</span>
          {finding.page_number && <span>• P.{finding.page_number}</span>}
          {isVerified && (
            <span
              className="inline-flex items-center gap-0.5 text-emerald-700 font-sans font-medium text-[10px] ml-1"
              title="Verified against source document text"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Verified</span>
            </span>
          )}
        </div>

        {/* Action Link */}
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all"
        >
          <span>View evidence</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
