'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  BookOpen,
  HelpCircle,
  Compass,
} from 'lucide-react';
import { Finding, ComparisonFinding } from '@/types/domain';
import { AttentionBadge } from './AttentionBadge';
import { ComparisonStatusBadge } from './ComparisonStatusBadge';
import { resolveEvidence, ResolvedEvidence } from '@/lib/domain/evidence-resolver';

export interface EvidenceNavigatorProps {
  // Mode selection
  mode: 'audit' | 'compare';

  // Single Audit Mode Inputs
  finding?: Finding | null;
  documentId?: string;
  fileName?: string;
  allAuditFindings?: Finding[];
  onSelectAuditFinding?: (finding: Finding) => void;
  rawTextFallback?: string;

  // Comparison Mode Inputs
  comparisonFinding?: ComparisonFinding | null;
  contractA_id?: string;
  contractB_id?: string;
  contractA_name?: string;
  contractB_name?: string;
  contractA_rawText?: string;
  contractB_rawText?: string;
  allComparisonFindings?: ComparisonFinding[];
  onSelectComparisonFinding?: (finding: ComparisonFinding) => void;

  onClose: () => void;
}

interface FetchedClauseData {
  document_id: string;
  file_name: string;
  clause: {
    clause_id: string;
    number_label?: string;
    title?: string;
    text: string;
    start_offset: number;
    end_offset: number;
    page_number?: number;
    line_number: number;
  };
  section?: {
    section_id: string;
    title: string;
  };
  surrounding_context: {
    before_text: string;
    after_text: string;
  };
  resolved_evidence?: ResolvedEvidence;
}

export function EvidenceNavigator({
  mode,
  finding,
  documentId,
  fileName,
  allAuditFindings = [],
  onSelectAuditFinding,
  rawTextFallback,

  comparisonFinding,
  contractA_id,
  contractB_id,
  contractA_name = 'Contract A (Baseline)',
  contractB_name = 'Contract B (Revised)',
  contractA_rawText,
  contractB_rawText,
  allComparisonFindings = [],
  onSelectComparisonFinding,

  onClose,
}: EvidenceNavigatorProps) {
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [showSurroundingContext, setShowSurroundingContext] = useState(true);
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [activeCompareTab, setActiveCompareTab] = useState<'both' | 'a' | 'b'>('both');

  // Single audit fetched state
  const [auditClauseData, setAuditClauseData] = useState<FetchedClauseData | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFetchError, setAuditFetchError] = useState<string | null>(null);

  // Comparison dual fetched state
  const [clauseDataA, setClauseDataA] = useState<FetchedClauseData | null>(null);
  const [clauseDataB, setClauseDataB] = useState<FetchedClauseData | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Focus modal container on mount and handle Escape key
  useEffect(() => {
    previouslyFocusedElement.current =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    modalContainerRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      previouslyFocusedElement.current?.focus?.();
    };
  }, [onClose]);

  // =========================================================================
  // Single Audit Data Fetching & Resolution (Race Condition Free)
  // =========================================================================
  useEffect(() => {
    let isCancelled = false;

    if (mode === 'audit' && finding) {
      setAuditClauseData(null);
      setAuditFetchError(null);

      if (documentId && finding.clause_id) {
        setAuditLoading(true);
        const quote = finding.verbatim_quote || '';
        const url = `/api/v1/evidence?document_id=${encodeURIComponent(documentId)}&clause_id=${encodeURIComponent(finding.clause_id)}&quote=${encodeURIComponent(quote)}&radius=400`;

        fetch(url)
          .then(async (res) => {
            if (isCancelled) return;
            if (res.ok) {
              const data: FetchedClauseData = await res.json();
              if (!isCancelled) {
                setAuditClauseData(data);
                setAuditLoading(false);
              }
            } else {
              if (!isCancelled) {
                setAuditClauseData(null);
                setAuditFetchError('Server context lookup unavailable. Displaying cached quote.');
                setAuditLoading(false);
              }
            }
          })
          .catch(() => {
            if (!isCancelled) {
              setAuditClauseData(null);
              setAuditFetchError('Could not connect to evidence service. Displaying cached quote.');
              setAuditLoading(false);
            }
          });
      } else {
        setAuditLoading(false);
      }
    } else {
      setAuditClauseData(null);
      setAuditLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [mode, finding, documentId]);

  // =========================================================================
  // Comparison Data Fetching & Resolution (Race Condition Free)
  // =========================================================================
  useEffect(() => {
    let isCancelled = false;

    if (mode === 'compare' && comparisonFinding) {
      setClauseDataA(null);
      setClauseDataB(null);

      if (contractA_id && comparisonFinding.contract_a_source?.clause_id) {
        const quoteA = comparisonFinding.contract_a_source.exact_quote || '';
        const urlA = `/api/v1/evidence?document_id=${encodeURIComponent(contractA_id)}&clause_id=${encodeURIComponent(comparisonFinding.contract_a_source.clause_id)}&quote=${encodeURIComponent(quoteA)}&radius=400`;
        fetch(urlA)
          .then(async (res) => {
            if (isCancelled) return;
            if (res.ok) {
              const data: FetchedClauseData = await res.json();
              if (!isCancelled) setClauseDataA(data);
            }
          })
          .catch(() => {});
      }

      if (contractB_id && comparisonFinding.contract_b_source?.clause_id) {
        const quoteB = comparisonFinding.contract_b_source.exact_quote || '';
        const urlB = `/api/v1/evidence?document_id=${encodeURIComponent(contractB_id)}&clause_id=${encodeURIComponent(comparisonFinding.contract_b_source.clause_id)}&quote=${encodeURIComponent(quoteB)}&radius=400`;
        fetch(urlB)
          .then(async (res) => {
            if (isCancelled) return;
            if (res.ok) {
              const data: FetchedClauseData = await res.json();
              if (!isCancelled) setClauseDataB(data);
            }
          })
          .catch(() => {});
      }
    } else {
      setClauseDataA(null);
      setClauseDataB(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [mode, comparisonFinding, contractA_id, contractB_id]);

  // =========================================================================
  // Index & Navigation
  // =========================================================================
  const currentAuditIndex = finding && allAuditFindings.length > 0
    ? allAuditFindings.findIndex((f) => f.finding_id === finding.finding_id)
    : -1;

  const currentCompareIndex = comparisonFinding && allComparisonFindings.length > 0
    ? allComparisonFindings.findIndex((f) => f.id === comparisonFinding.id)
    : -1;

  const handlePrevFinding = () => {
    if (mode === 'audit' && currentAuditIndex > 0 && onSelectAuditFinding) {
      onSelectAuditFinding(allAuditFindings[currentAuditIndex - 1]);
    } else if (mode === 'compare' && currentCompareIndex > 0 && onSelectComparisonFinding) {
      onSelectComparisonFinding(allComparisonFindings[currentCompareIndex - 1]);
    }
  };

  const handleNextFinding = () => {
    if (
      mode === 'audit' &&
      currentAuditIndex !== -1 &&
      currentAuditIndex < allAuditFindings.length - 1 &&
      onSelectAuditFinding
    ) {
      onSelectAuditFinding(allAuditFindings[currentAuditIndex + 1]);
    } else if (
      mode === 'compare' &&
      currentCompareIndex !== -1 &&
      currentCompareIndex < allComparisonFindings.length - 1 &&
      onSelectComparisonFinding
    ) {
      onSelectComparisonFinding(allComparisonFindings[currentCompareIndex + 1]);
    }
  };

  const handleCopyQuestion = (question: string) => {
    if (!question) return;
    navigator.clipboard
      ?.writeText(question)
      .then(() => {
        setCopiedQuestion(true);
        setTimeout(() => setCopiedQuestion(false), 2000);
      })
      .catch(() => {});
  };

  if (!finding && !comparisonFinding) return null;

  // Compute resolved text for Single Audit
  const auditResolved: ResolvedEvidence = (() => {
    if (!finding) {
      return {
        isResolved: false,
        status: 'UNRESOLVED',
        beforeText: '',
        highlightText: '',
        afterText: '',
        surroundingBefore: '',
        surroundingAfter: '',
      };
    }

    if (auditClauseData) {
      return (
        auditClauseData.resolved_evidence ||
        resolveEvidence({
          clauseText: auditClauseData.clause.text,
          clauseStartOffset: auditClauseData.clause.start_offset,
          quote: finding.verbatim_quote,
          matchedRange: finding.matched_range,
          surroundingBefore: auditClauseData.surrounding_context.before_text,
          surroundingAfter: auditClauseData.surrounding_context.after_text,
        })
      );
    }

    if (rawTextFallback) {
      return resolveEvidence({
        clauseText: rawTextFallback,
        quote: finding.verbatim_quote,
        matchedRange: finding.matched_range,
      });
    }

    return {
      isResolved: true,
      status: 'EXACT_QUOTE',
      beforeText: '',
      highlightText: finding.verbatim_quote,
      afterText: '',
      surroundingBefore: '',
      surroundingAfter: '',
    };
  })();

  // Compute resolved text for Contract A
  const resolvedA: ResolvedEvidence = (() => {
    if (!comparisonFinding?.contract_a_source) {
      return {
        isResolved: false,
        status: 'UNRESOLVED',
        beforeText: '',
        highlightText: '',
        afterText: '',
        surroundingBefore: '',
        surroundingAfter: '',
      };
    }

    const sourceA = comparisonFinding.contract_a_source;
    if (clauseDataA) {
      return (
        clauseDataA.resolved_evidence ||
        resolveEvidence({
          clauseText: clauseDataA.clause.text,
          clauseStartOffset: clauseDataA.clause.start_offset,
          quote: sourceA.exact_quote,
          matchedRange: sourceA.matched_range,
          surroundingBefore: clauseDataA.surrounding_context.before_text,
          surroundingAfter: clauseDataA.surrounding_context.after_text,
        })
      );
    }

    if (contractA_rawText) {
      return resolveEvidence({
        clauseText: contractA_rawText,
        quote: sourceA.exact_quote,
        matchedRange: sourceA.matched_range,
      });
    }

    return {
      isResolved: true,
      status: 'EXACT_QUOTE',
      beforeText: '',
      highlightText: sourceA.exact_quote,
      afterText: '',
      surroundingBefore: '',
      surroundingAfter: '',
    };
  })();

  // Compute resolved text for Contract B
  const resolvedB: ResolvedEvidence = (() => {
    if (!comparisonFinding?.contract_b_source) {
      return {
        isResolved: false,
        status: 'UNRESOLVED',
        beforeText: '',
        highlightText: '',
        afterText: '',
        surroundingBefore: '',
        surroundingAfter: '',
      };
    }

    const sourceB = comparisonFinding.contract_b_source;
    if (clauseDataB) {
      return (
        clauseDataB.resolved_evidence ||
        resolveEvidence({
          clauseText: clauseDataB.clause.text,
          clauseStartOffset: clauseDataB.clause.start_offset,
          quote: sourceB.exact_quote,
          matchedRange: sourceB.matched_range,
          surroundingBefore: clauseDataB.surrounding_context.before_text,
          surroundingAfter: clauseDataB.surrounding_context.after_text,
        })
      );
    }

    if (contractB_rawText) {
      return resolveEvidence({
        clauseText: contractB_rawText,
        quote: sourceB.exact_quote,
        matchedRange: sourceB.matched_range,
      });
    }

    return {
      isResolved: true,
      status: 'EXACT_QUOTE',
      beforeText: '',
      highlightText: sourceB.exact_quote,
      afterText: '',
      surroundingBefore: '',
      surroundingAfter: '',
    };
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-navigator-title"
      onClick={onClose}
    >
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* NAVIGATOR HEADER */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                  {mode === 'audit' ? 'Grounded Audit Evidence' : 'Contract Comparison Evidence'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-300 truncate max-w-xs sm:max-w-md">
                  {mode === 'audit'
                    ? fileName || auditClauseData?.file_name || 'Document'
                    : `${contractA_name} ↔ ${contractB_name}`}
                </span>
              </div>
              <h2
                id="evidence-navigator-title"
                className="text-base sm:text-lg font-bold text-slate-100 truncate"
              >
                {mode === 'audit' ? finding?.title : comparisonFinding?.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Previous / Next Finding Navigation */}
            {((mode === 'audit' && allAuditFindings.length > 1) ||
              (mode === 'compare' && allComparisonFindings.length > 1)) && (
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={handlePrevFinding}
                  disabled={mode === 'audit' ? currentAuditIndex <= 0 : currentCompareIndex <= 0}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded transition-colors min-h-[36px] min-w-[36px] inline-flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                  aria-label="Previous finding"
                  title="Previous finding"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-[11px] font-mono text-slate-400">
                  {mode === 'audit'
                    ? `${currentAuditIndex + 1}/${allAuditFindings.length}`
                    : `${currentCompareIndex + 1}/${allComparisonFindings.length}`}
                </span>
                <button
                  type="button"
                  onClick={handleNextFinding}
                  disabled={
                    mode === 'audit'
                      ? currentAuditIndex >= allAuditFindings.length - 1
                      : currentCompareIndex >= allComparisonFindings.length - 1
                  }
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded transition-colors min-h-[36px] min-w-[36px] inline-flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                  aria-label="Next finding"
                  title="Next finding"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Close navigator"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FINDING SUMMARY & ATTENTION BANNER */}
        {/* ================================================================= */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {mode === 'audit' && finding && (
              <>
                <AttentionBadge level={finding.attention_level} size="sm" />
                <span className="font-mono text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded font-semibold uppercase">
                  {(finding.category || 'GENERAL').replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Clause: {finding.clause_id}
                </span>
                {finding.page_number && (
                  <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Page: {finding.page_number}
                  </span>
                )}
              </>
            )}

            {mode === 'compare' && comparisonFinding && (
              <>
                <ComparisonStatusBadge status={comparisonFinding.status} />
                <AttentionBadge level={comparisonFinding.attention_level} size="sm" />
                <span className="font-mono text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded font-semibold uppercase">
                  {(comparisonFinding.category || 'GENERAL').replace(/_/g, ' ')}
                </span>
              </>
            )}
          </div>

          {/* Context Radius Toggle */}
          <button
            type="button"
            onClick={() => setShowSurroundingContext(!showSurroundingContext)}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium text-xs bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>{showSurroundingContext ? 'Hide Surrounding Context' : 'Show Surrounding Context'}</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* NAVIGATOR BODY */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-800">
          {/* Finding Explanation Anchor */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>What this finding identifies</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {mode === 'audit'
                ? finding?.plain_language_explanation
                : comparisonFinding?.plain_english_summary}
            </p>
            {mode === 'compare' && comparisonFinding?.practical_implication && (
              <p className="text-xs text-amber-900 bg-amber-50/70 border-l-2 border-amber-500 pl-3 py-1 font-medium">
                <strong>Commercial Implication:</strong> {comparisonFinding.practical_implication}
              </p>
            )}
          </div>

          {/* =============================================================== */}
          {/* SINGLE AUDIT EVIDENCE VIEW */}
          {/* =============================================================== */}
          {mode === 'audit' && finding && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    Source Document Passage
                  </span>
                  {auditResolved.isResolved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Quote Highlighted in Source Clause</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Quote Not Located in Clause Text</span>
                    </span>
                  )}
                </div>

                {auditClauseData?.section && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Section: {auditClauseData.section.title}
                  </span>
                )}
              </div>

              {auditLoading ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
                  <p className="text-sm font-semibold">Loading verified clause context...</p>
                </div>
              ) : auditFetchError && !auditClauseData ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 text-xs">
                  <p className="font-semibold">{auditFetchError}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-300 bg-slate-900 text-slate-100 overflow-hidden shadow-md">
                  {/* Preceding Document Context (if enabled) */}
                  {showSurroundingContext && auditResolved.surroundingBefore && (
                    <div className="p-4 bg-slate-950/60 border-b border-slate-800 text-slate-400 font-mono text-xs leading-relaxed opacity-75 select-text">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                        [... Preceding Context in Document ...]
                      </div>
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{auditResolved.surroundingBefore}</p>
                    </div>
                  )}

                  {/* Primary Clause Box with Verified Highlight */}
                  <div className="p-5 bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-amber-400 font-bold">Clause:</span>
                        <span>{finding.clause_id}</span>
                        {auditClauseData?.clause.number_label && (
                          <>
                            <span>•</span>
                            <span>Label: {auditClauseData.clause.number_label}</span>
                          </>
                        )}
                        {finding.page_number && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-bold">Page:</span>
                            <span>{finding.page_number}</span>
                          </>
                        )}
                      </div>

                      {(finding.verification_status === 'VERIFIED_EXACT' ||
                        finding.verification_status === 'VERIFIED_NORMALIZED') &&
                      auditResolved.isResolved ? (
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Independent Grounded Verification</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{auditResolved.isResolved ? 'Unverified AI Finding' : 'Unmapped Source Quote'}</span>
                        </span>
                      )}
                    </div>

                    {/* Ambiguity notice if quote matches multiple times */}
                    {auditResolved.ambiguityNotice && (
                      <div className="text-[11px] text-amber-300 font-mono bg-amber-950/50 border border-amber-800/50 px-2.5 py-1 rounded flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{auditResolved.ambiguityNotice}</span>
                      </div>
                    )}

                    {/* Source Clause Text with Verified Pure Mark Highlight */}
                    <div className="text-xs sm:text-sm font-serif leading-relaxed text-slate-200 select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {auditResolved.beforeText}
                      {auditResolved.highlightText ? (
                        <mark className="bg-amber-300 text-slate-950 font-semibold px-1 py-0.5 rounded shadow-2xs border border-amber-400">
                          {auditResolved.highlightText}
                        </mark>
                      ) : null}
                      {auditResolved.afterText}
                    </div>

                    {/* Fallback alert if quote could not be mapped */}
                    {!auditResolved.isResolved && (
                      <div className="p-2.5 rounded bg-amber-950/60 border border-amber-700/50 text-amber-200 text-xs">
                        <p className="font-semibold">Unresolved Quote Location</p>
                        <p className="text-[11px] mt-0.5 opacity-90">
                          The verbatim quote provided by the model could not be matched directly within this clause text span. Displaying raw clause text without highlighting to prevent misrepresentation.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Succeeding Document Context (if enabled) */}
                  {showSurroundingContext && auditResolved.surroundingAfter && (
                    <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-slate-400 font-mono text-xs leading-relaxed opacity-75 select-text">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                        [... Succeeding Context in Document ...]
                      </div>
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{auditResolved.surroundingAfter}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* COMPARISON DUAL-DOCUMENT EVIDENCE VIEW */}
          {/* =============================================================== */}
          {mode === 'compare' && comparisonFinding && (
            <div className="space-y-4">
              {/* Tab Selector for small screens or focused view */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-2 gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Dual-Contract Verified Evidence
                </span>

                <div
                  className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold flex-wrap gap-1"
                  role="tablist"
                  aria-label="Evidence comparison view tabs"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCompareTab === 'both'}
                    onClick={() => setActiveCompareTab('both')}
                    className={`px-3 py-1.5 rounded-md transition-all min-h-[32px] ${
                      activeCompareTab === 'both'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCompareTab === 'a'}
                    onClick={() => setActiveCompareTab('a')}
                    className={`px-3 py-1.5 rounded-md transition-all min-h-[32px] ${
                      activeCompareTab === 'a'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Contract A
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCompareTab === 'b'}
                    onClick={() => setActiveCompareTab('b')}
                    className={`px-3 py-1.5 rounded-md transition-all min-h-[32px] ${
                      activeCompareTab === 'b'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Contract B
                  </button>
                </div>
              </div>

              {/* Side-by-Side or Selected Single View */}
              <div
                className={`grid gap-4 ${
                  activeCompareTab === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {/* ---------------- CONTRACT A PANE ---------------- */}
                {(activeCompareTab === 'both' || activeCompareTab === 'a') && (
                  <div className="flex flex-col border border-blue-200 rounded-xl overflow-hidden bg-slate-900 text-slate-100 shadow-md">
                    {/* Header Bar */}
                    <div className="px-4 py-3 bg-blue-950 border-b border-blue-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                        <span className="font-bold text-white">Contract A (Baseline)</span>
                      </div>
                      {comparisonFinding.contract_a_source && (
                        <span className="font-mono text-blue-200 text-[11px] bg-blue-900/60 px-2 py-0.5 rounded">
                          Clause: {comparisonFinding.contract_a_source.clause_id}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      {comparisonFinding.contract_a_source ? (
                        <>
                          {/* Preceding context */}
                          {showSurroundingContext && resolvedA.surroundingBefore && (
                            <div className="text-[11px] text-slate-400 font-mono border-b border-slate-800 pb-2 leading-relaxed opacity-75 select-text">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                                [... Context Before ...]
                              </span>
                              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{resolvedA.surroundingBefore}</p>
                            </div>
                          )}

                          {/* Ambiguity notice */}
                          {resolvedA.ambiguityNotice && (
                            <div className="text-[11px] text-amber-300 font-mono bg-amber-950/50 border border-amber-800/50 px-2 py-1 rounded flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{resolvedA.ambiguityNotice}</span>
                            </div>
                          )}

                          {/* Clause Text with Highlight */}
                          <div className="text-xs sm:text-sm font-serif leading-relaxed text-slate-200 select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {resolvedA.beforeText}
                            {resolvedA.highlightText ? (
                              <mark className="bg-blue-300 text-slate-950 font-semibold px-1 py-0.5 rounded shadow-2xs border border-blue-400">
                                {resolvedA.highlightText}
                              </mark>
                            ) : null}
                            {resolvedA.afterText}
                          </div>

                          {/* Succeeding context */}
                          {showSurroundingContext && resolvedA.surroundingAfter && (
                            <div className="text-[11px] text-slate-400 font-mono border-t border-slate-800 pt-2 leading-relaxed opacity-75 select-text">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                                [... Context After ...]
                              </span>
                              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{resolvedA.surroundingAfter}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Asymmetric Provision: Added in B, absent in A */
                        <div className="my-auto p-6 text-center text-slate-400 bg-slate-950/50 rounded-lg border border-dashed border-slate-800 space-y-1.5">
                          <p className="font-bold text-slate-300 text-sm">
                            No corresponding provision found in Contract A
                          </p>
                          <p className="text-xs text-slate-400">
                            This term is uniquely introduced in Contract B (Revised version).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Badge */}
                    {comparisonFinding.contract_a_source && (
                      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-mono">
                          {comparisonFinding.contract_a_source.page_number
                            ? `Page ${comparisonFinding.contract_a_source.page_number}`
                            : 'Page N/A'}
                        </span>
                        {resolvedA.isResolved ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified against Contract A</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Unresolved in Contract A</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- CONTRACT B PANE ---------------- */}
                {(activeCompareTab === 'both' || activeCompareTab === 'b') && (
                  <div className="flex flex-col border border-amber-200 rounded-xl overflow-hidden bg-slate-900 text-slate-100 shadow-md">
                    {/* Header Bar */}
                    <div className="px-4 py-3 bg-amber-950 border-b border-amber-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        <span className="font-bold text-white">Contract B (Revised)</span>
                      </div>
                      {comparisonFinding.contract_b_source && (
                        <span className="font-mono text-amber-200 text-[11px] bg-amber-900/60 px-2 py-0.5 rounded">
                          Clause: {comparisonFinding.contract_b_source.clause_id}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      {comparisonFinding.contract_b_source ? (
                        <>
                          {/* Preceding context */}
                          {showSurroundingContext && resolvedB.surroundingBefore && (
                            <div className="text-[11px] text-slate-400 font-mono border-b border-slate-800 pb-2 leading-relaxed opacity-75 select-text">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                                [... Context Before ...]
                              </span>
                              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{resolvedB.surroundingBefore}</p>
                            </div>
                          )}

                          {/* Ambiguity notice */}
                          {resolvedB.ambiguityNotice && (
                            <div className="text-[11px] text-amber-300 font-mono bg-amber-950/50 border border-amber-800/50 px-2 py-1 rounded flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{resolvedB.ambiguityNotice}</span>
                            </div>
                          )}

                          {/* Clause Text with Highlight */}
                          <div className="text-xs sm:text-sm font-serif leading-relaxed text-slate-200 select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {resolvedB.beforeText}
                            {resolvedB.highlightText ? (
                              <mark className="bg-amber-300 text-slate-950 font-semibold px-1 py-0.5 rounded shadow-2xs border border-amber-400">
                                {resolvedB.highlightText}
                              </mark>
                            ) : null}
                            {resolvedB.afterText}
                          </div>

                          {/* Succeeding context */}
                          {showSurroundingContext && resolvedB.surroundingAfter && (
                            <div className="text-[11px] text-slate-400 font-mono border-t border-slate-800 pt-2 leading-relaxed opacity-75 select-text">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                                [... Context After ...]
                              </span>
                              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{resolvedB.surroundingAfter}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Asymmetric Provision: Removed in B, existed in A */
                        <div className="my-auto p-6 text-center text-slate-400 bg-slate-950/50 rounded-lg border border-dashed border-slate-800 space-y-1.5">
                          <p className="font-bold text-slate-300 text-sm">
                            Provision omitted in Contract B
                          </p>
                          <p className="text-xs text-slate-400">
                            This term was present in Contract A but was deleted in Contract B.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Badge */}
                    {comparisonFinding.contract_b_source && (
                      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-mono">
                          {comparisonFinding.contract_b_source.page_number
                            ? `Page ${comparisonFinding.contract_b_source.page_number}`
                            : 'Page N/A'}
                        </span>
                        {resolvedB.isResolved ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified against Contract B</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Unresolved in Contract B</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TARGETED QUESTION FOR LEGAL COUNSEL */}
          {/* =============================================================== */}
          {((mode === 'audit' && finding?.suggested_question_for_counsel) ||
            (mode === 'compare' && comparisonFinding?.suggested_question_for_counsel)) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Targeted Question for Legal Counsel</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyQuestion(
                      (mode === 'audit'
                        ? finding?.suggested_question_for_counsel
                        : comparisonFinding?.suggested_question_for_counsel) || ''
                    )
                  }
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

              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 text-xs sm:text-sm text-blue-950 font-medium leading-relaxed break-words [overflow-wrap:anywhere]">
                {mode === 'audit'
                  ? finding?.suggested_question_for_counsel
                  : comparisonFinding?.suggested_question_for_counsel}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* NAVIGATOR FOOTER */}
        {/* ================================================================= */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 gap-3 shrink-0">
          <span className="text-[11px] leading-snug">
            Independent grounded quote verification against canonical agreement text.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors min-h-[44px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-900 shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
