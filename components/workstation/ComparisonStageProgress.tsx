'use client';

import React from 'react';
import { Check, Loader2, Circle, ShieldCheck } from 'lucide-react';

export type ComparisonStage =
  | 'IDLE'
  | 'PREPARING'
  | 'ALIGNING'
  | 'ANALYZING'
  | 'VERIFYING'
  | 'COMPLETE';

interface ComparisonStageProgressProps {
  currentStage: ComparisonStage;
}

interface StageStep {
  id: ComparisonStage;
  label: string;
  description: string;
}

const COMPARISON_STAGES: StageStep[] = [
  {
    id: 'PREPARING',
    label: 'Preparing Documents',
    description: 'Ingesting and normalizing text for Contract A and Contract B',
  },
  {
    id: 'ALIGNING',
    label: 'Aligning Clauses',
    description: 'Bipartite alignment across numbering, headings, and semantic stems',
  },
  {
    id: 'ANALYZING',
    label: 'Analyzing Differences',
    description: 'Identifying substantive changes, additions, and omissions',
  },
  {
    id: 'VERIFYING',
    label: 'Verifying Source Evidence',
    description: 'Independently checking quotes against both source documents',
  },
];

export function ComparisonStageProgress({ currentStage }: ComparisonStageProgressProps) {
  const getStageIndex = (stage: ComparisonStage): number => {
    switch (stage) {
      case 'PREPARING':
        return 0;
      case 'ALIGNING':
        return 1;
      case 'ANALYZING':
        return 2;
      case 'VERIFYING':
        return 3;
      case 'COMPLETE':
        return 4;
      default:
        return -1;
    }
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Contract Comparison in Progress</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic ingestion, structural clause alignment, and independent dual-source verification.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Evidence checked against both contracts</span>
        </div>
      </div>

      {/* Progress Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COMPARISON_STAGES.map((stage, idx) => {
          const isDone = currentIndex > idx || currentStage === 'COMPLETE';
          const isCurrent = currentIndex === idx && currentStage !== 'COMPLETE';
          const isPending = currentIndex < idx && currentStage !== 'COMPLETE';

          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-lg border transition-all ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : isCurrent
                  ? 'bg-amber-50/60 border-amber-300 shadow-sm ring-1 ring-amber-400/30'
                  : 'bg-slate-50/50 border-slate-200/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                {isDone && (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                {isCurrent && (
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Loader2 className="w-3 h-3 animate-spin stroke-[2.5]" />
                  </div>
                )}
                {isPending && (
                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                    <Circle className="w-3 h-3" />
                  </div>
                )}

                <span
                  className={`text-xs font-bold ${
                    isDone
                      ? 'text-emerald-900'
                      : isCurrent
                      ? 'text-amber-950'
                      : 'text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pl-7">
                {stage.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
