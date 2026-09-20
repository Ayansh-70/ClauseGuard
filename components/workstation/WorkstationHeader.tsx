'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Plus, FileText, Search, GitCompareArrows } from 'lucide-react';
import { SHORT_DISCLAIMER } from '@/lib/constants/disclaimers';

export type WorkstationMode = 'audit' | 'compare';

interface WorkstationHeaderProps {
  activeFileName?: string;
  onNewAudit?: () => void;
  isAnalyzing?: boolean;
  activeMode?: WorkstationMode;
  onModeChange?: (mode: WorkstationMode) => void;
}

export function WorkstationHeader({
  activeFileName,
  onNewAudit,
  isAnalyzing = false,
  activeMode = 'audit',
  onModeChange,
}: WorkstationHeaderProps) {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Informational anti-UPL top banner */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs text-slate-400 text-center border-b border-slate-800/80 flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        <span className="font-semibold text-slate-300">LEGAL INFORMATION ASSISTANCE:</span>
        <span>{SHORT_DISCLAIMER} — Informational analysis only. Not an attorney replacement.</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md"
            aria-label="ClauseGuard Home"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                ClauseGuard
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  Workstation
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:block">
                Deterministic Contract Intelligence & Grounded AI Audit
              </p>
            </div>
          </Link>

          {/* Active file badge */}
          {activeFileName && (
            <div className="hidden xl:flex items-center gap-2 pl-4 ml-4 border-l border-slate-800 text-xs text-slate-300">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Active:</span>
              <span className="font-medium text-white max-w-[180px] truncate" title={activeFileName}>
                {activeFileName}
              </span>
            </div>
          )}
        </div>

        {/* Center: Workstation Mode Selector */}
        {onModeChange && (
          <div
            role="group"
            aria-label="Workstation view mode"
            className="flex items-center p-1 rounded-lg bg-slate-950 border border-slate-800 shadow-inner"
          >
            <button
              type="button"
              onClick={() => onModeChange('audit')}
              disabled={isAnalyzing}
              aria-pressed={activeMode === 'audit'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all min-h-[32px] focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                activeMode === 'audit'
                  ? 'bg-slate-800 text-amber-300 shadow-sm ring-1 ring-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Review Document</span>
              <span className="sm:hidden">Review</span>
              <span className="sr-only">Audit Document</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange('compare')}
              disabled={isAnalyzing}
              aria-pressed={activeMode === 'compare'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all min-h-[32px] focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                activeMode === 'compare'
                  ? 'bg-slate-800 text-amber-300 shadow-sm ring-1 ring-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompareArrows className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Compare Documents</span>
              <span className="sm:hidden">Compare</span>
              <span className="sr-only">Compare Contracts</span>
            </button>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {onNewAudit && (
            <button
              type="button"
              onClick={onNewAudit}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[32px]"
              aria-label="Start New Audit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Analysis</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
