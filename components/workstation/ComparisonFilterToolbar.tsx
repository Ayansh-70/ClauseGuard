'use client';

import React, { useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { ComparisonFinding, ComparisonStatus } from '@/types/domain';

export type StatusFilterOption = 'ALL' | ComparisonStatus;

interface ComparisonFilterToolbarProps {
  findings: ComparisonFinding[];
  activeStatus: StatusFilterOption;
  onStatusChange: (status: StatusFilterOption) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hideSame: boolean;
  onToggleHideSame: (hide: boolean) => void;
}

export function ComparisonFilterToolbar({
  findings,
  activeStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  hideSame,
  onToggleHideSame,
}: ComparisonFilterToolbarProps) {
  // Extract distinct categories from actual findings
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of findings) {
      if (f.category) set.add(f.category);
    }
    return Array.from(set).sort();
  }, [findings]);

  // Compute counts for status tabs
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {
      ALL: findings.length,
      changed: 0,
      added: 0,
      removed: 0,
      same: 0,
      ambiguous: 0,
    };
    for (const f of findings) {
      if (map[f.status] !== undefined) {
        map[f.status]++;
      }
    }
    return map;
  }, [findings]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter findings by status">
          <button
            type="button"
            role="tab"
            aria-selected={activeStatus === 'ALL'}
            onClick={() => onStatusChange('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({statusCounts.ALL})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatus === 'changed'}
            onClick={() => onStatusChange('changed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeStatus === 'changed'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Changed ({statusCounts.changed})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatus === 'added'}
            onClick={() => onStatusChange('added')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeStatus === 'added'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Added ({statusCounts.added})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatus === 'removed'}
            onClick={() => onStatusChange('removed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeStatus === 'removed'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Removed ({statusCounts.removed})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatus === 'ambiguous'}
            onClick={() => onStatusChange('ambiguous')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeStatus === 'ambiguous'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Needs Review ({statusCounts.ambiguous})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatus === 'same'}
            onClick={() => onStatusChange('same')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeStatus === 'same'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Same ({statusCounts.same})
          </button>
        </div>

        {/* Hide 'Same' Checkbox Toggle */}
        <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideSame}
            onChange={(e) => onToggleHideSame(e.target.checked)}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
          />
          <span>Hide equivalent provisions</span>
        </label>
      </div>

      {/* Category Dropdown and Live Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search findings by title, summary, or clause ID..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label="Search comparison findings"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 capitalize"
            aria-label="Filter findings by category"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
