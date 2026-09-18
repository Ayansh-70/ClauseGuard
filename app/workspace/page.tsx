'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { WorkstationHeader } from '@/components/workstation/WorkstationHeader';
import { ContractDropzone } from '@/components/workstation/ContractDropzone';
import { DirectTextInput } from '@/components/workstation/DirectTextInput';
import { StageProgressBar, AnalysisStage } from '@/components/workstation/StageProgressBar';
import { DocumentOverview } from '@/components/workstation/DocumentOverview';
import { ExecutiveSummaryCard } from '@/components/workstation/ExecutiveSummaryCard';
import { MetricsBar } from '@/components/workstation/MetricsBar';
import {
  FilterSortToolbar,
  AttentionFilter,
  SortOption,
} from '@/components/workstation/FilterSortToolbar';
import { FindingCard } from '@/components/workstation/FindingCard';
import { FindingDetailModal } from '@/components/workstation/FindingDetailModal';
import { ErrorAlert } from '@/components/workstation/ErrorAlert';
import { AuditResult, Finding } from '@/types/domain';
import { SampleContract } from '@/lib/constants/sample-contracts';
import { GLOBAL_LEGAL_DISCLAIMER } from '@/lib/constants/disclaimers';

const SESSION_STORAGE_KEY_RESULT = 'clauseguard_active_audit';
const SESSION_STORAGE_KEY_FILENAME = 'clauseguard_active_filename';

export default function WorkspacePage() {
  // Input State
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState<string>('Contract_Document.txt');

  // Execution State
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('IDLE');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>('');
  const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);

  // Findings Navigation & Filter State
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('ATTENTION_DESC');

  // Restore session state on tab reload
  useEffect(() => {
    try {
      const savedResult = sessionStorage.getItem(SESSION_STORAGE_KEY_RESULT);
      const savedFileName = sessionStorage.getItem(SESSION_STORAGE_KEY_FILENAME);
      if (savedResult && savedFileName) {
        const parsed = JSON.parse(savedResult);
        setAuditResult(parsed);
        setActiveFileName(savedFileName);
      }
    } catch {
      // Ignore corrupted session storage
    }
  }, []);

  // Handle sample selection
  const handleSelectSample = (sample: SampleContract) => {
    // Create synthetic file for the dropzone
    const file = new File([sample.content], sample.name, { type: 'text/plain' });
    setSelectedFile(file);
    setRawText(sample.content);
    setDocumentTitle(sample.name);
    setInputMode('file');
  };

  // Reset to new audit
  const handleReset = () => {
    setSelectedFile(null);
    setRawText('');
    setAuditResult(null);
    setActiveFileName('');
    setErrorState(null);
    setSelectedFinding(null);
    setAnalysisStage('IDLE');
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY_RESULT);
      sessionStorage.removeItem(SESSION_STORAGE_KEY_FILENAME);
    } catch {
      // Ignore
    }
  };

  // Start analysis
  const handleStartAnalysis = async () => {
    setErrorState(null);
    setAuditResult(null);

    const hasFile = selectedFile && selectedFile.size > 0;
    const hasText = rawText.trim().length > 0;

    if (!hasFile && !hasText) {
      setErrorState({
        title: 'Document Required',
        message: 'Please upload a contract file (.pdf, .txt, .md) or paste agreement text to begin.',
      });
      return;
    }

    const currentDocName = hasFile
      ? selectedFile.name
      : documentTitle || 'Pasted_Agreement.txt';
    setActiveFileName(currentDocName);

    setAnalysisStage('UPLOADING');

    // Honest stage progression during fetch execution
    const stageTimer1 = setTimeout(() => setAnalysisStage('EXTRACTING'), 600);
    const stageTimer2 = setTimeout(() => setAnalysisStage('SEGMENTING'), 1300);
    const stageTimer3 = setTimeout(() => setAnalysisStage('ANALYZING'), 2100);
    const stageTimer4 = setTimeout(() => setAnalysisStage('VERIFYING'), 3000);

    try {
      let res: Response;

      if (hasFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('reject_unverified', 'true');

        res = await fetch('/api/v1/audit', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/v1/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_text: rawText,
            file_name: currentDocName,
            reject_unverified: true,
          }),
        });
      }

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(stageTimer4);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const code = errorJson?.error?.code || 'ANALYSIS_FAILED';
        const msg =
          errorJson?.error?.message ||
          'The document could not be analyzed. Please verify format and size and try again.';

        let userTitle = 'Analysis Failed';
        if (code === 'INPUT_TOO_LARGE') userTitle = 'File Too Large';
        if (code === 'UNSUPPORTED_FORMAT') userTitle = 'Unsupported Format';
        if (code === 'AI_TIMEOUT') userTitle = 'Analysis Request Timed Out';

        setErrorState({
          title: userTitle,
          message: msg,
        });
        setAnalysisStage('IDLE');
        return;
      }

      const result: AuditResult = await res.json();
      setAuditResult(result);
      setAnalysisStage('COMPLETE');

      // Cache active result in session storage for tab lifetime
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY_RESULT, JSON.stringify(result));
        sessionStorage.setItem(SESSION_STORAGE_KEY_FILENAME, currentDocName);
      } catch {
        // Ignore session quota errors
      }
    } catch {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(stageTimer4);

      setErrorState({
        title: 'Connection Notice',
        message: 'Could not communicate with the ClauseGuard audit service. Please try again.',
      });
      setAnalysisStage('IDLE');
    }
  };

  // Filtered and sorted findings
  const displayedFindings = useMemo(() => {
    if (!auditResult) return [];

    let filtered = [...auditResult.findings];

    // Attention Filter
    if (attentionFilter === 'HIGH') {
      filtered = filtered.filter((f) => f.attention_level === 'HIGH_ATTENTION');
    } else if (attentionFilter === 'MEDIUM') {
      filtered = filtered.filter((f) => f.attention_level === 'MEDIUM_ATTENTION');
    } else if (attentionFilter === 'NOTICES') {
      filtered = filtered.filter(
        (f) =>
          f.attention_level === 'LOW_ATTENTION' ||
          f.attention_level === 'INFORMATIONAL' ||
          f.attention_level === 'STANDARD_NOTICE'
      );
    }

    // Category Filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((f) => f.category === categoryFilter);
    }

    // Sort
    if (sortOption === 'ATTENTION_DESC') {
      const rank: Record<string, number> = {
        HIGH_ATTENTION: 3,
        MEDIUM_ATTENTION: 2,
        LOW_ATTENTION: 1,
        INFORMATIONAL: 1,
        STANDARD_NOTICE: 1,
      };
      filtered.sort((a, b) => (rank[b.attention_level] || 0) - (rank[a.attention_level] || 0));
    }
    // DOCUMENT_ORDER preserves natural order of extraction

    return filtered;
  }, [auditResult, attentionFilter, categoryFilter, sortOption]);

  const isAnalyzing = analysisStage !== 'IDLE' && analysisStage !== 'COMPLETE';
  const hasInputs = Boolean(selectedFile || rawText.trim().length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <WorkstationHeader
        activeFileName={activeFileName}
        onNewAudit={auditResult ? handleReset : undefined}
        isAnalyzing={isAnalyzing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Alert if any */}
        {errorState && (
          <ErrorAlert
            title={errorState.title}
            message={errorState.message}
            onDismiss={() => setErrorState(null)}
            onRetry={hasInputs ? handleStartAnalysis : undefined}
          />
        )}

        {/* 1. UPLOAD & INPUT WORKFLOW (Shown when no active audit result or resetting) */}
        {!auditResult && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Document Ingestion & Grounded Audit</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Audit Your Commercial Agreement
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
                ClauseGuard extracts and segments your document, runs grounded AI analysis, and
                verifies every cited quote directly against original contract text.
              </p>
            </div>

            {/* Input Mode Tabs */}
            <div className="flex border-b border-slate-200 justify-center">
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  inputMode === 'file'
                    ? 'border-amber-500 text-amber-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Upload File (.pdf, .txt, .md)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  inputMode === 'text'
                    ? 'border-amber-500 text-amber-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Paste Agreement Text
              </button>
            </div>

            {/* Ingestion Area */}
            {inputMode === 'file' ? (
              <ContractDropzone
                selectedFile={selectedFile}
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  if (file) {
                    setDocumentTitle(file.name);
                    setErrorState(null);
                  }
                }}
                onSelectSampleText={handleSelectSample}
                disabled={isAnalyzing}
              />
            ) : (
              <DirectTextInput
                value={rawText}
                onChange={(text) => {
                  setRawText(text);
                  setErrorState(null);
                }}
                documentTitle={documentTitle}
                onTitleChange={setDocumentTitle}
                disabled={isAnalyzing}
              />
            )}

            {/* Primary Action Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!hasInputs || isAnalyzing}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                <span>Run Grounded Legal Audit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* In-Flight Analysis Stage Progress */}
            {isAnalyzing && (
              <div className="pt-4">
                <StageProgressBar currentStage={analysisStage} />
              </div>
            )}
          </div>
        )}

        {/* 2. FINDINGS WORKSPACE (Shown when audit complete) */}
        {auditResult && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Document Overview Header */}
            <DocumentOverview
              fileName={activeFileName || auditResult.metadata.file_name || 'Document.txt'}
              documentId={auditResult.document_id}
              metadata={auditResult.metadata}
              onReset={handleReset}
            />

            {/* Executive Summary & Primary Concerns */}
            <ExecutiveSummaryCard
              summary={auditResult.summary}
              primaryConcerns={auditResult.primary_concerns}
            />

            {/* Summary Metrics Bar */}
            <MetricsBar
              findings={auditResult.findings}
              metadata={auditResult.metadata}
              rejectedFindings={auditResult.rejected_findings}
            />

            {/* Filter & Sort Toolbar */}
            <FilterSortToolbar
              findings={auditResult.findings}
              activeFilter={attentionFilter}
              onFilterChange={setAttentionFilter}
              selectedCategory={categoryFilter}
              onCategoryChange={setCategoryFilter}
              activeSort={sortOption}
              onSortChange={setSortOption}
            />

            {/* Findings List / Grid */}
            {displayedFindings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedFindings.map((finding) => (
                  <FindingCard
                    key={finding.finding_id}
                    finding={finding}
                    onSelect={setSelectedFinding}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  No findings match the selected filter criteria.
                </p>
                <p className="text-xs text-slate-500">
                  Try switching back to &ldquo;All Findings&rdquo; or selecting &ldquo;All Categories&rdquo;.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Finding Detail Modal / Drawer */}
      <FindingDetailModal
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />

      {/* Footer Legal Notice */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p className="font-semibold text-slate-700">ClauseGuard Workstation v0.1.0</p>
          <p className="max-w-3xl mx-auto text-[11px] leading-relaxed text-slate-400">
            {GLOBAL_LEGAL_DISCLAIMER}
          </p>
        </div>
      </footer>
    </div>
  );
}
