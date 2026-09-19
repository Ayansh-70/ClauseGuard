'use client';

import React from 'react';
import { ArrowRight, ShieldCheck, FileText, ArrowLeftRight, HelpCircle } from 'lucide-react';
import { ComparisonFinding } from '@/types/domain';
import { ComparisonStatusBadge } from './ComparisonStatusBadge';
import { AttentionBadge } from './AttentionBadge';

interface ComparisonFindingCardProps {
  finding: ComparisonFinding;
  onSelect: (finding: ComparisonFinding) => void;
  onViewEvidence?: (finding: ComparisonFinding) => void;
}

export function ComparisonFindingCard({
  finding,
  onSelect,
  onViewEvidence,
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
        {/* Badges row: Category + Status + Attention */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ComparisonStatusBadge status={finding.status} />
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
              {(finding.category || 'GENERAL').replace(/_/g, ' ')}
            </span>
          </div>
          <AttentionBadge level={finding.attention_level} size="sm" />
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
          {finding.title}
        </h3>

        {/* What Changed (Plain-English Summary) */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
          {finding.plain_english_summary}
        </p>

        {/* Why It Matters (Commercial Implication) */}
        {finding.practical_implication && (
          <div className="bg-amber-50/50 border-l-2 border-amber-500 p-2.5 rounded-r-md text-xs text-slate-700">
            <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">
              Why it matters:
            </span>
            <p className="line-clamp-2 text-slate-600">{finding.practical_implication}</p>
          </div>
        )}

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
      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-[11px]">
            {isVerified ? (
              <span className="text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quotes Verified</span>
              </span>
            ) : (
              <span className="text-amber-700 text-[10px] font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                Under Review
              </span>
            )}
          </div>

          {onViewEvidence ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onViewEvidence(finding);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-all"
            >
              <span>View evidence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-all">
              <span>Inspect evidence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Question for Counsel indicator */}
        {finding.suggested_question_for_counsel && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
            <HelpCircle className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate">Counsel question available</span>
          </div>
        )}
      </div>
    </div>
  );
}
