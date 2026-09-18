'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  HelpCircle,
  ArrowLeftRight,
  AlertTriangle,
} from 'lucide-react';
import { ComparisonFinding } from '@/types/domain';
import { ComparisonStatusBadge } from './ComparisonStatusBadge';
import { AttentionBadge } from './AttentionBadge';
import { SHORT_DISCLAIMER } from '@/lib/constants/disclaimers';

interface ComparisonDetailModalProps {
  finding: ComparisonFinding | null;
  onClose: () => void;
}

export function ComparisonDetailModal({
  finding,
  onClose,
}: ComparisonDetailModalProps) {
  const [copiedQuestion, setCopiedQuestion] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (finding) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [finding, onClose]);

  if (!finding) return null;

  const handleCopyQuestion = () => {
    if (!finding.suggested_question_for_counsel) return;
    navigator.clipboard.writeText(finding.suggested_question_for_counsel);
    setCopiedQuestion(true);
    setTimeout(() => setCopiedQuestion(false), 2000);
  };

  const isAVerified =
    finding.contract_a_source &&
    (finding.verification_status === 'VERIFIED_EXACT' ||
      finding.verification_status === 'VERIFIED_NORMALIZED');

  const isBVerified =
    finding.contract_b_source &&
    (finding.verification_status === 'VERIFIED_EXACT' ||
      finding.verification_status === 'VERIFIED_NORMALIZED');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-finding-title"
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ComparisonStatusBadge status={finding.status} />
              <AttentionBadge level={finding.attention_level} size="sm" />
              <span className="text-xs font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded uppercase tracking-wider">
                {finding.category.replace(/_/g, ' ')}
              </span>
              {finding.confidence && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Confidence: {Math.round(finding.confidence * 100)}%
                </span>
              )}
            </div>
            <h2
              id="comparison-finding-title"
              className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
            >
              {finding.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700">
          {/* Ambiguous Guidance Alert */}
          {finding.status === 'ambiguous' && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Correspondence Uncertain (Needs Review)</p>
                <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                  The comparison engine could not confidently determine whether these provisions correspond or whether their legal meanings are equivalent. Review both clauses directly with legal counsel.
                </p>
              </div>
            </div>
          )}

          {/* Plain English Summary & Commercial Hazard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Plain-English Explanation
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {finding.plain_english_summary}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Commercial Implication
              </h3>
              <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                {finding.practical_implication}
              </p>
            </div>
          </div>

          {/* PRIMARY SIDE-BY-SIDE EVIDENCE COMPARISON */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                <span>Side-by-Side Source Evidence</span>
              </h3>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                Exact verbatim excerpts highlighted from each agreement
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ================= CONTRACT A EVIDENCE ================= */}
              <div className="border border-blue-200 bg-blue-50/20 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span className="text-xs font-bold text-blue-950">Contract A (Baseline)</span>
                    </div>
                    {finding.contract_a_source && (
                      <span className="text-[10px] font-mono text-blue-800 bg-blue-100/70 px-1.5 py-0.5 rounded">
                        {finding.contract_a_source.clause_id}
                      </span>
                    )}
                  </div>

                  {finding.contract_a_source ? (
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-2">
                        {finding.contract_a_source.number_label && (
                          <span>Label: {finding.contract_a_source.number_label}</span>
                        )}
                        {finding.contract_a_source.page_number && (
                          <span>Page {finding.contract_a_source.page_number}</span>
                        )}
                      </div>

                      {/* Verbatim Quote Box */}
                      <blockquote className="p-3 rounded-lg bg-white border border-blue-200 text-xs sm:text-sm font-serif italic text-slate-800 leading-relaxed shadow-sm">
                        &ldquo;{finding.contract_a_source.exact_quote}&rdquo;
                      </blockquote>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 bg-white/60 rounded-lg border border-dashed border-slate-200 text-xs">
                      <p className="font-semibold text-slate-500">No corresponding provision found</p>
                      <p className="text-[11px] mt-1">This term is uniquely introduced in Contract B.</p>
                    </div>
                  )}
                </div>

                {/* Verification Badge */}
                {finding.contract_a_source && (
                  <div className="pt-2 border-t border-blue-100 flex items-center gap-1.5 text-[11px]">
                    {isAVerified ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified against Contract A</span>
                      </span>
                    ) : (
                      <span className="text-amber-800 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Quote unverified in Contract A</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ================= CONTRACT B EVIDENCE ================= */}
              <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      <span className="text-xs font-bold text-amber-950">Contract B (Revised)</span>
                    </div>
                    {finding.contract_b_source && (
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                        {finding.contract_b_source.clause_id}
                      </span>
                    )}
                  </div>

                  {finding.contract_b_source ? (
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-2">
                        {finding.contract_b_source.number_label && (
                          <span>Label: {finding.contract_b_source.number_label}</span>
                        )}
                        {finding.contract_b_source.page_number && (
                          <span>Page {finding.contract_b_source.page_number}</span>
                        )}
                      </div>

                      {/* Verbatim Quote Box */}
                      <blockquote className="p-3 rounded-lg bg-white border border-amber-200 text-xs sm:text-sm font-serif italic text-slate-800 leading-relaxed shadow-sm">
                        &ldquo;{finding.contract_b_source.exact_quote}&rdquo;
                      </blockquote>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 bg-white/60 rounded-lg border border-dashed border-slate-200 text-xs">
                      <p className="font-semibold text-slate-500">No corresponding provision found</p>
                      <p className="text-[11px] mt-1">This term existed in Contract A but was deleted in Contract B.</p>
                    </div>
                  )}
                </div>

                {/* Verification Badge */}
                {finding.contract_b_source && (
                  <div className="pt-2 border-t border-amber-100 flex items-center gap-1.5 text-[11px]">
                    {isBVerified ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified against Contract B</span>
                      </span>
                    ) : (
                      <span className="text-amber-800 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Quote unverified in Contract B</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QUESTIONS FOR COUNSEL */}
          {finding.suggested_question_for_counsel && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Targeted Question for Legal Counsel
                </h3>
                <button
                  type="button"
                  onClick={handleCopyQuestion}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  {copiedQuestion ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Question</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-sans italic leading-relaxed">
                &ldquo;{finding.suggested_question_for_counsel}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <p className="text-[11px]">{SHORT_DISCLAIMER} — Informational comparison analysis only.</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
