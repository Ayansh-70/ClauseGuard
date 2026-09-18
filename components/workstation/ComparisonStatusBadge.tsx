'use client';

import React from 'react';
import { ArrowLeftRight, PlusCircle, MinusCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { ComparisonStatus } from '@/types/domain';

interface ComparisonStatusBadgeProps {
  status: ComparisonStatus;
  className?: string;
  showIcon?: boolean;
}

export function ComparisonStatusBadge({
  status,
  className = '',
  showIcon = true,
}: ComparisonStatusBadgeProps) {
  switch (status) {
    case 'changed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
          aria-label="Status: Changed"
        >
          {showIcon && <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span>Changed</span>
        </span>
      );

    case 'added':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
          aria-label="Status: Added in Contract B"
        >
          {showIcon && <PlusCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          <span>Added in B</span>
        </span>
      );

    case 'removed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
          aria-label="Status: Removed from Contract B"
        >
          {showIcon && <MinusCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
          <span>Removed in B</span>
        </span>
      );

    case 'ambiguous':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
          aria-label="Status: Correspondence Uncertain"
        >
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
          <span>Needs Review</span>
        </span>
      );

    case 'same':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
          aria-label="Status: Substantially Same"
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          <span>Substantially Same</span>
        </span>
      );
  }
}
