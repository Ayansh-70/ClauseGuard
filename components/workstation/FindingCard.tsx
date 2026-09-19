'use client';

import React from 'react';
import { ShieldCheck, ArrowRight, BookOpen, HelpCircle } from 'lucide-react';
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
      className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4 focus-within:ring-2 focus-within:ring-amber-500"
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(finding);
        }
      }}
      aria-label={`Inspect finding: ${finding.title}`}
    >
      <div className="space-y-3">
        {/* 1. WHAT IS THIS? (Category & Attention Badge) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <AttentionBadge level={finding.attention_level} size="sm" />

          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
            {finding.category.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
          {finding.title}
        </h3>

        {/* 2. WHAT DOES IT SAY? (Plain-English Summary) */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
          {finding.plain_language_explanation}
        </p>

        {/* 3. WHY DOES IT MATTER? (Commercial Risk) */}
        {finding.why_it_matters && (
          <div className="bg-amber-50/50 border-l-2 border-amber-500 p-2.5 rounded-r-md text-xs text-slate-700">
            <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">
              Why it matters:
            </span>
            <p className="line-clamp-2 text-slate-600">{finding.why_it_matters}</p>
          </div>
        )}
      </div>

      {/* 4. WHERE IS IT & 5. WHAT TO DO NEXT (Footer & Evidence Link) */}
      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          {/* Source Citation */}
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Clause: {finding.clause_id}</span>
            {finding.page_number && <span>• P.{finding.page_number}</span>}
          </div>

          {/* Verification Status */}
          {isVerified ? (
            <span
              className="inline-flex items-center gap-1 text-emerald-700 font-sans font-medium text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
              title="Verified against source document text"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Verified</span>
            </span>
          ) : (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Unverified
            </span>
          )}
        </div>

        {/* Counsel Question Indicator & Action */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          {finding.suggested_question_for_counsel ? (
            <span className="inline-flex items-center gap-1 text-slate-500 text-[10px]">
              <HelpCircle className="w-3 h-3 text-amber-600" />
              <span>Counsel question ready</span>
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-all"
          >
            <span>Inspect evidence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
