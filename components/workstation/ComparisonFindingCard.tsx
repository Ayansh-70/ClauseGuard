'use client';

import React from 'react';
import { ArrowRight, ShieldCheck, FileText, ArrowLeftRight } from 'lucide-react';
import { ComparisonFinding } from '@/types/domain';
import { ComparisonStatusBadge } from './ComparisonStatusBadge';
import { AttentionBadge } from './AttentionBadge';

interface ComparisonFindingCardProps {
  finding: ComparisonFinding;
  onSelect: (finding: ComparisonFinding) => void;
}

export function ComparisonFindingCard({
  finding,
  onSelect,
}: ComparisonFindingCardProps) {
  const isVerified =
    finding.verification_status === 'VERIFIED_EXACT' ||
    finding.verification_status === 'VERIFIED_NORMALIZED';

  return (
    <div
      onClick={() => onSelect(finding)}
      className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-xl p-5 transition-all cursor-pointer flex flex-col justify-between space-y-4 group focus-within:ring-2 focus-within:ring-amber-500"
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
        {/* Badges row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ComparisonStatusBadge status={finding.status} />
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
              {finding.category.replace(/_/g, ' ')}
            </span>
          </div>
          <AttentionBadge level={finding.attention_level} size="sm" />
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
          {finding.title}
        </h3>

        {/* Plain English Summary */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
          {finding.plain_english_summary}
        </p>

        {/* Clause Pointers */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
          {finding.contract_a_source && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
              <FileText className="w-3 h-3 text-blue-600" />
              <span>A: {finding.contract_a_source.clause_id}</span>
            </span>
          )}

          {finding.contract_a_source && finding.contract_b_source && (
            <ArrowLeftRight className="w-3 h-3 text-slate-400" />
          )}

          {finding.contract_b_source && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
              <FileText className="w-3 h-3 text-amber-600" />
              <span>B: {finding.contract_b_source.clause_id}</span>
            </span>
          )}

          {!finding.contract_a_source && finding.contract_b_source && (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-sans font-medium">
              New in B
            </span>
          )}

          {finding.contract_a_source && !finding.contract_b_source && (
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-sans font-medium">
              Omitted in B
            </span>
          )}
        </div>
      </div>

      {/* Footer: Verification status & CTA */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-[11px]">
          {isVerified ? (
            <span className="text-emerald-700 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quotes Verified</span>
            </span>
          ) : (
            <span className="text-amber-700 font-medium">
              <span>Unverified</span>
            </span>
          )}
        </div>

        <span className="text-amber-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
          <span>View Evidence</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
