'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  HelpCircle,
  Copy,
  Check,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Finding } from '@/types/domain';
import { AttentionBadge } from './AttentionBadge';
import { SHORT_DISCLAIMER } from '@/lib/constants/disclaimers';

interface FindingDetailModalProps {
  finding: Finding | null;
  onClose: () => void;
}

export function FindingDetailModal({ finding, onClose }: FindingDetailModalProps) {
  const [copiedQuestion, setCopiedQuestion] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!finding) return null;

  const isVerifiedExact = finding.verification_status === 'VERIFIED_EXACT';
  const isVerifiedNormalized = finding.verification_status === 'VERIFIED_NORMALIZED';
  const isVerified = isVerifiedExact || isVerifiedNormalized;

  const handleCopyQuestion = () => {
    if (finding.suggested_question_for_counsel) {
      navigator.clipboard.writeText(finding.suggested_question_for_counsel);
      setCopiedQuestion(true);
      setTimeout(() => setCopiedQuestion(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-finding-title"
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <AttentionBadge level={finding.attention_level} size="sm" />
              <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded uppercase">
                {finding.category.replace(/_/g, ' ')}
              </span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {isVerifiedExact ? 'Source Verified (Exact)' : 'Source Verified (Normalized)'}
                  </span>
                </span>
              )}
            </div>
            <h2
              id="modal-finding-title"
              className="text-lg font-bold text-slate-900 tracking-tight"
            >
              {finding.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors shrink-0"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* 1. Plain-English Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Plain-English Explanation</span>
            </h3>
            <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4">
              {finding.plain_language_explanation}
            </div>
          </div>

          {/* 2. Practical Commercial Implication */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Commercial Risk & Practical Implication</span>
            </h3>
            <div className="text-sm text-slate-700 leading-relaxed bg-amber-50/40 border border-amber-200 rounded-lg p-4">
              {finding.why_it_matters}
            </div>
          </div>

          {/* 3. SOURCE EVIDENCE VIEW (Central Product Differentiator) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Original Document Evidence</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Independent Server Verification
              </span>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-3 shadow-inner border border-slate-800">
              {/* Citation Coordinates */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-amber-400 font-bold">Clause:</span>
                  <span>{finding.clause_id}</span>
                  {finding.page_number && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">Page:</span>
                      <span>{finding.page_number}</span>
                    </>
                  )}
                  {finding.matched_range && (
                    <>
                      <span>•</span>
                      <span className="text-slate-500">
                        Offset: [{finding.matched_range.start}..{finding.matched_range.end}]
                      </span>
                    </>
                  )}
                </div>

                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>VERIFIED AGAINST DOCUMENT</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-mono text-[11px]">
                    UNVERIFIED EXCERPT
                  </span>
                )}
              </div>

              {/* Exact Verbatim Text Block */}
              <div className="relative">
                <p className="font-serif italic text-slate-200 text-sm leading-relaxed border-l-2 border-amber-400 pl-3 py-1">
                  &ldquo;{finding.verbatim_quote}&rdquo;
                </p>
              </div>

              {/* Analytical reasoning anchor */}
              {finding.evidence && (
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="text-slate-300 font-semibold">Grounded Analysis: </span>
                  {finding.evidence}
                </div>
              )}
            </div>
          </div>

          {/* 4. Questions for Counsel */}
          {finding.suggested_question_for_counsel && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Targeted Questions for Legal Counsel</span>
                </h3>
                <button
                  type="button"
                  onClick={handleCopyQuestion}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                >
                  {copiedQuestion ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 text-xs text-blue-950 font-medium leading-relaxed">
                {finding.suggested_question_for_counsel}
              </div>
            </div>
          )}

          {/* 5. Illustrative Alternative / Counter-proposal (if present) */}
          {finding.suggested_alternative && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Illustrative Drafting Alternative (Informational)</span>
              </h3>
              <div className="bg-purple-50/40 border border-purple-200 rounded-lg p-4 space-y-2">
                <p className="text-xs text-purple-950 font-serif italic">
                  &ldquo;{finding.suggested_alternative}&rdquo;
                </p>
                {finding.alternative_rationale && (
                  <p className="text-[11px] text-purple-800">
                    <strong>Rationale:</strong> {finding.alternative_rationale}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{SHORT_DISCLAIMER}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
