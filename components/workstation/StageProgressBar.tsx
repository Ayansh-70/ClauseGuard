'use client';

import React from 'react';
import { Check, Loader2, Circle } from 'lucide-react';

export type AnalysisStage =
  | 'IDLE'
  | 'UPLOADING'
  | 'EXTRACTING'
  | 'SEGMENTING'
  | 'ANALYZING'
  | 'VERIFYING'
  | 'COMPLETE';

interface StageProgressBarProps {
  currentStage: AnalysisStage;
}

interface StageStep {
  id: AnalysisStage;
  label: string;
  description: string;
}

const STAGES: StageStep[] = [
  {
    id: 'UPLOADING',
    label: 'Document Ingestion',
    description: 'Validating format, magic bytes, and size boundaries',
  },
  {
    id: 'EXTRACTING',
    label: 'Text Extraction',
    description: 'Deterministic text normalization and page offset mapping',
  },
  {
    id: 'SEGMENTING',
    label: 'Clause Segmentation',
    description: 'Identifying structural headings and stable clause IDs',
  },
  {
    id: 'ANALYZING',
    label: 'Gemini AI Audit',
    description: 'Analyzing contractual risk, asymmetry, and obligations',
  },
  {
    id: 'VERIFYING',
    label: 'Quote Verification',
    description: 'Server-side verification of verbatim excerpts against source',
  },
];

export function StageProgressBar({ currentStage }: StageProgressBarProps) {
  const getStageIndex = (stage: AnalysisStage): number => {
    switch (stage) {
      case 'UPLOADING':
        return 0;
      case 'EXTRACTING':
        return 1;
      case 'SEGMENTING':
        return 2;
      case 'ANALYZING':
        return 3;
      case 'VERIFYING':
        return 4;
      case 'COMPLETE':
        return 5;
      default:
        return -1;
    }
  };

  const activeIdx = getStageIndex(currentStage);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
          <span>Auditing Contract Provisions...</span>
        </h3>
        <span className="text-xs font-mono text-slate-500">
          Stage {Math.min(activeIdx + 1, STAGES.length)} of {STAGES.length}
        </span>
      </div>

      <div className="space-y-3">
        {STAGES.map((step, idx) => {
          const isDone = activeIdx > idx || currentStage === 'COMPLETE';
          const isCurrent = activeIdx === idx;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                isCurrent
                  ? 'bg-amber-50/60 border border-amber-200/80'
                  : isDone
                  ? 'bg-slate-50/70 border border-transparent'
                  : 'opacity-50 border border-transparent'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-500 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 text-amber-700 animate-spin" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
                    <Circle className="w-2 h-2 text-slate-400 fill-slate-300" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? 'text-amber-900'
                        : isDone
                        ? 'text-slate-900'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                      In Progress
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[10px] font-medium text-emerald-700">✓ Verified</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
