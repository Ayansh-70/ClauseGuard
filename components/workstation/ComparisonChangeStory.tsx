'use client';

import React, { useMemo } from 'react';
import { GitCompareArrows, ArrowRight, ShieldCheck, FileText, ArrowLeftRight } from 'lucide-react';
import { ComparisonFinding } from '@/types/domain';
import { ComparisonStatusBadge } from './ComparisonStatusBadge';
import { AttentionBadge } from './AttentionBadge';

interface ComparisonChangeStoryProps {
  findings: ComparisonFinding[];
  onSelectFinding: (finding: ComparisonFinding) => void;
}

interface CategoryGroup {
  category: string;
  categoryLabel: string;
  findings: ComparisonFinding[];
  topFinding: ComparisonFinding;
  overallStatus: 'changed' | 'added' | 'removed' | 'ambiguous' | 'same';
  highestAttention: ComparisonFinding['attention_level'];
}

export function ComparisonChangeStory({
  findings,
  onSelectFinding,
}: ComparisonChangeStoryProps) {
  // Group findings deterministically by contractual category
  const categoryGroups = useMemo(() => {
    const map = new Map<string, ComparisonFinding[]>();

    for (const f of findings) {
      const cat = f.category || 'GENERAL';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(f);
    }

    const groups: CategoryGroup[] = [];

    map.forEach((catFindings, cat) => {
      // Prioritize findings within category: changed > added > removed > ambiguous > same
      const sorted = [...catFindings].sort((a, b) => {
        const order: Record<string, number> = { changed: 1, added: 2, removed: 3, ambiguous: 4, same: 5 };
        return (order[a.status] || 99) - (order[b.status] || 99);
      });

      const topFinding = sorted[0];

      // Determine overall status for this category
      let overallStatus: CategoryGroup['overallStatus'] = 'same';
      if (catFindings.some((f) => f.status === 'changed')) overallStatus = 'changed';
      else if (catFindings.some((f) => f.status === 'added')) overallStatus = 'added';
      else if (catFindings.some((f) => f.status === 'removed')) overallStatus = 'removed';
      else if (catFindings.some((f) => f.status === 'ambiguous')) overallStatus = 'ambiguous';

      // Determine highest attention level
      const attentionOrder: Record<string, number> = {
        HIGH_ATTENTION: 1,
        MEDIUM_ATTENTION: 2,
        LOW_ATTENTION: 3,
        INFORMATIONAL: 4,
        STANDARD_NOTICE: 5,
      };

      const highestAttention = catFindings.reduce((highest, curr) => {
        const currRank = attentionOrder[curr.attention_level] || 99;
        const highestRank = attentionOrder[highest] || 99;
        return currRank < highestRank ? curr.attention_level : highest;
      }, catFindings[0].attention_level);

      groups.push({
        category: cat,
        categoryLabel: cat.replace(/_/g, ' '),
        findings: catFindings,
        topFinding,
        overallStatus,
        highestAttention,
      });
    });

    // Sort groups: categories with changes first, then alphabetically
    const statusOrder: Record<string, number> = { changed: 1, added: 2, removed: 3, ambiguous: 4, same: 5 };
    groups.sort((a, b) => {
      const diff = (statusOrder[a.overallStatus] || 99) - (statusOrder[b.overallStatus] || 99);
      if (diff !== 0) return diff;
      return a.categoryLabel.localeCompare(b.categoryLabel);
    });

    return groups;
  }, [findings]);

  const changedCount = findings.filter((f) => f.status === 'changed').length;
  const addedCount = findings.filter((f) => f.status === 'added').length;
  const removedCount = findings.filter((f) => f.status === 'removed').length;
  const sameCount = findings.filter((f) => f.status === 'same').length;
  const modifiedCategories = categoryGroups.filter((g) => g.overallStatus !== 'same').length;

  if (findings.length === 0) return null;

  return (
    <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            <GitCompareArrows className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Executive Change Story
              </h2>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                At a Glance
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Don&apos;t read both contracts line by line. See what actually changed grouped by category.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
          <span className="px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
            {modifiedCategories} Categories Modified
          </span>
          <span className="px-2.5 py-1 rounded-full font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            {sameCount} Unchanged
          </span>
        </div>
      </div>

      {/* Summary Narrative Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <span className="font-bold text-slate-900">Summary of Contractual Shifts: </span>
        Across {findings.length} aligned provisions, our dual-document audit identified{' '}
        <span className="font-bold text-amber-800">{changedCount} modified terms</span>
        {addedCount > 0 && <span className="font-bold text-emerald-800">, {addedCount} newly added obligations</span>}
        {removedCount > 0 && <span className="font-bold text-rose-800">, and {removedCount} omitted provisions</span>}
        . Review each category below for verified side-by-side evidence.
      </div>

      {/* Category Rows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categoryGroups.map((group) => {
          const isSame = group.overallStatus === 'same';

          return (
            <div
              key={group.category}
              onClick={() => onSelectFinding(group.topFinding)}
              className={`border rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3 group ${
                isSame
                  ? 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                  : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm'
              }`}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectFinding(group.topFinding);
                }
              }}
              aria-label={`Inspect category change: ${group.categoryLabel}`}
            >
              <div className="space-y-2">
                {/* Category Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 group-hover:text-amber-700 transition-colors">
                    {group.categoryLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ComparisonStatusBadge status={group.overallStatus} />
                    <AttentionBadge level={group.highestAttention} size="sm" />
                  </div>
                </div>

                {/* Plain-English Change Summary */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {group.topFinding.plain_english_summary}
                </p>

                {/* Clause Pointers */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono pt-1">
                  {group.topFinding.contract_a_source && (
                    <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      <FileText className="w-3 h-3 text-blue-500" />
                      <span>A: {group.topFinding.contract_a_source.clause_id}</span>
                    </span>
                  )}
                  {group.topFinding.contract_a_source && group.topFinding.contract_b_source && (
                    <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                  )}
                  {group.topFinding.contract_b_source && (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      <FileText className="w-3 h-3 text-amber-600" />
                      <span>B: {group.topFinding.contract_b_source.clause_id}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Link */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dual-Verified</span>
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-all">
                  <span>Inspect Side-by-Side</span>
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
