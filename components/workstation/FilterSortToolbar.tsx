'use client';

import React from 'react';
import { Filter, ArrowUpDown } from 'lucide-react';
import { Finding } from '@/types/domain';

export type AttentionFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'NOTICES';
export type SortOption = 'ATTENTION_DESC' | 'DOCUMENT_ORDER';

interface FilterSortToolbarProps {
  findings: Finding[];
  activeFilter: AttentionFilter;
  onFilterChange: (filter: AttentionFilter) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function FilterSortToolbar({
  findings,
  activeFilter,
  onFilterChange,
  selectedCategory,
  onCategoryChange,
  activeSort,
  onSortChange,
}: FilterSortToolbarProps) {
  const highCount = findings.filter((f) => f.attention_level === 'HIGH_ATTENTION').length;
  const mediumCount = findings.filter((f) => f.attention_level === 'MEDIUM_ATTENTION').length;
  const noticeCount = findings.filter(
    (f) =>
      f.attention_level === 'LOW_ATTENTION' ||
      f.attention_level === 'INFORMATIONAL' ||
      f.attention_level === 'STANDARD_NOTICE'
  ).length;

  // Derive unique categories present in current findings
  const availableCategories = Array.from(
    new Set(findings.map((f) => f.category).filter(Boolean))
  ).sort();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      {/* Attention Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
        <button
          onClick={() => onFilterChange('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({findings.length})
        </button>

        <button
          onClick={() => onFilterChange('HIGH')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeFilter === 'HIGH'
              ? 'bg-rose-100 text-rose-900 ring-1 ring-rose-300'
              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-800'
          }`}
        >
          High Attention ({highCount})
        </button>

        <button
          onClick={() => onFilterChange('MEDIUM')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeFilter === 'MEDIUM'
              ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          Medium Attention ({mediumCount})
        </button>

        <button
          onClick={() => onFilterChange('NOTICES')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeFilter === 'NOTICES'
              ? 'bg-slate-200 text-slate-900'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Notices ({noticeCount})
        </button>
      </div>

      {/* Category Filter & Sort Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {/* Category Dropdown */}
        {availableCategories.length > 1 && (
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="text-xs font-medium py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700"
              aria-label="Filter by contract category"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={activeSort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="text-xs font-medium py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700"
            aria-label="Sort findings"
          >
            <option value="ATTENTION_DESC">Highest Attention First</option>
            <option value="DOCUMENT_ORDER">Document Clause Order</option>
          </select>
        </div>
      </div>
    </div>
  );
}
