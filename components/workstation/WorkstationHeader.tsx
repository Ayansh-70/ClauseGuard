'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Plus, FileText } from 'lucide-react';
import { SHORT_DISCLAIMER } from '@/lib/constants/disclaimers';

interface WorkstationHeaderProps {
  activeFileName?: string;
  onNewAudit?: () => void;
  isAnalyzing?: boolean;
}

export function WorkstationHeader({
  activeFileName,
  onNewAudit,
  isAnalyzing = false,
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
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Deterministic Contract Intelligence & Grounded AI Audit
              </p>
            </div>
          </Link>

          {/* Active file badge */}
          {activeFileName && (
            <div className="hidden md:flex items-center gap-2 pl-4 ml-4 border-l border-slate-800 text-xs text-slate-300">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Document:</span>
              <span className="font-medium text-white max-w-[200px] truncate" title={activeFileName}>
                {activeFileName}
              </span>
            </div>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {onNewAudit && (
            <button
              onClick={onNewAudit}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Start New Audit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Audit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
