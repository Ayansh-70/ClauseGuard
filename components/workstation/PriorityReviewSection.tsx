'use client';

import React, { useMemo } from 'react';
import { Star, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';
import { Finding } from '@/types/domain';
import { AttentionBadge } from './AttentionBadge';

interface PriorityReviewSectionProps {
  findings: Finding[];
  onSelectFinding: (finding: Finding) => void;
}

const ATTENTION_PRIORITY: Record<string, number> = {
  HIGH_ATTENTION: 1,
  MEDIUM_ATTENTION: 2,
  LOW_ATTENTION: 3,
  INFORMATIONAL: 4,
  STANDARD_NOTICE: 5,
};

export function PriorityReviewSection({
  findings,
  onSelectFinding,
}: PriorityReviewSectionProps) {
  // Deterministically sort and extract top 3 priority review items
  const priorityFindings = useMemo(() => {
    const sorted = [...findings].sort((a, b) => {
      const priorityA = ATTENTION_PRIORITY[a.attention_level] || 99;
      const priorityB = ATTENTION_PRIORITY[b.attention_level] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const confA = a.confidence ?? 0.8;
      const confB = b.confidence ?? 0.8;
      if (confB !== confA) {
        return confB - confA;
      }

      return a.clause_id.localeCompare(b.clause_id);
    });

    return sorted.slice(0, 3);
  }, [findings]);

  if (findings.length === 0) return null;

  return (
    <div className="bg-gradient-to-b from-amber-50/70 to-white border-2 border-amber-300/80 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-base shadow-sm shrink-0">
            <Star className="w-5 h-5 fill-slate-950 stroke-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Priority Review — Start Here
              </h2>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                Executive Action
              </span>
            </div>
            <p className="text-xs text-slate-600">
              The top contractual provisions deserving attention first, grounded back to original contract text.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-full border border-amber-200 shadow-2xs self-start sm:self-auto">
          Top {priorityFindings.length} of {findings.length} findings
        </span>
      </div>

      {/* Priority Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {priorityFindings.map((finding, idx) => {
          const isVerified =
            finding.verification_status === 'VERIFIED_EXACT' ||
            finding.verification_status === 'VERIFIED_NORMALIZED';

          return (
            <div
              key={finding.finding_id}
              onClick={() => onSelectFinding(finding)}
              className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-xl p-5 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectFinding(finding);
                }
              }}
              aria-label={`Inspect priority finding: ${finding.title}`}
            >
              <div className="space-y-3">
                {/* Priority Rank & Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-300 text-[11px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <AttentionBadge level={finding.attention_level} size="sm" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                    {finding.category.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                  {finding.title}
                </h3>

                {/* Plain-English Explanation */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {finding.plain_language_explanation}
                </p>

                {/* Why It Matters */}
                {finding.why_it_matters && (
                  <div className="bg-amber-50/60 border-l-2 border-amber-500 p-2.5 rounded-r-md text-xs">
                    <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">
                      Why it matters:
                    </span>
                    <p className="text-slate-700 line-clamp-2 leading-relaxed">
                      {finding.why_it_matters}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Citation & CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{finding.clause_id}</span>
                  {isVerified && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-700 font-sans font-medium text-[10px] ml-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-all">
                  <span>Inspect</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
