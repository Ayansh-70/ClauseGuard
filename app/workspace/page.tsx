'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, ArrowRight, GitCompareArrows } from 'lucide-react';
import { WorkstationHeader, WorkstationMode } from '@/components/workstation/WorkstationHeader';
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

// Comparison Components
import {
  ComparisonInputPanel,
  ContractInputData,
} from '@/components/workstation/ComparisonInputPanel';
import {
  ComparisonStageProgress,
  ComparisonStage,
} from '@/components/workstation/ComparisonStageProgress';
import { ComparisonOverview } from '@/components/workstation/ComparisonOverview';
import { ComparisonMetricsBar } from '@/components/workstation/ComparisonMetricsBar';
import {
  ComparisonFilterToolbar,
  StatusFilterOption,
} from '@/components/workstation/ComparisonFilterToolbar';
import { ComparisonFindingCard } from '@/components/workstation/ComparisonFindingCard';
import { ComparisonDetailModal } from '@/components/workstation/ComparisonDetailModal';

import { AuditResult, Finding, ComparisonResult, ComparisonFinding } from '@/types/domain';
import {
  SampleContract,
  SampleComparisonPair,
  SAMPLE_COMPARISON_PAIRS,
} from '@/lib/constants/sample-contracts';
import { GLOBAL_LEGAL_DISCLAIMER } from '@/lib/constants/disclaimers';

// Privacy invariant: Never store raw contract text, quotes, or results in browser storage.
// Only non-sensitive UI mode preference is persisted.
const SESSION_STORAGE_KEY_ACTIVE_MODE = 'clauseguard_active_mode';

const INITIAL_CONTRACT_INPUT: ContractInputData = {
  file: null,
  rawText: '',
  fileName: '',
  mode: 'file',
};

export default function WorkspacePage() {
  // Global Workstation Mode
  const [activeMode, setActiveMode] = useState<WorkstationMode>('audit');

  // Concurrency and race condition guards
  const activeAuditReqId = React.useRef(0);
  const activeCompareReqId = React.useRef(0);

  // =========================================================================
  // 1. Single Document Audit State
  // =========================================================================
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState<string>('Contract_Document.txt');

  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('IDLE');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>('');
  const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('ATTENTION_DESC');

  // =========================================================================
  // 2. Contract Comparison State
  // =========================================================================
  const [contractA, setContractA] = useState<ContractInputData>({ ...INITIAL_CONTRACT_INPUT });
  const [contractB, setContractB] = useState<ContractInputData>({ ...INITIAL_CONTRACT_INPUT });

  const [comparisonStage, setComparisonStage] = useState<ComparisonStage>('IDLE');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [compareErrorState, setCompareErrorState] = useState<{ title: string; message: string } | null>(null);

  const [selectedComparisonFinding, setSelectedComparisonFinding] = useState<ComparisonFinding | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('ALL');
  const [comparisonCategoryFilter, setComparisonCategoryFilter] = useState<string>('ALL');
  const [comparisonSearchQuery, setComparisonSearchQuery] = useState<string>('');
  const [hideSameProvisions, setHideSameProvisions] = useState<boolean>(false);

  // Restore non-sensitive display mode on tab reload
  useEffect(() => {
    try {
      const savedMode = sessionStorage.getItem(SESSION_STORAGE_KEY_ACTIVE_MODE) as WorkstationMode | null;
      if (savedMode === 'audit' || savedMode === 'compare') {
        setActiveMode(savedMode);
      }

      // Proactively purge any legacy sensitive contract data from previous versions
      sessionStorage.removeItem('clauseguard_active_audit');
      sessionStorage.removeItem('clauseguard_active_filename');
      sessionStorage.removeItem('clauseguard_active_compare');
    } catch {
      // Ignore storage access restrictions in hardened environments
    }
  }, []);

  const handleModeChange = (mode: WorkstationMode) => {
    // Invalidate in-flight requests on mode switch
    activeAuditReqId.current++;
    activeCompareReqId.current++;

    setActiveMode(mode);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY_ACTIVE_MODE, mode);
    } catch {
      // Ignore
    }
  };

  // =========================================================================
  // Single Audit Handlers
  // =========================================================================
  const handleSelectSample = (sample: SampleContract) => {
    const file = new File([sample.content], sample.name, { type: 'text/plain' });
    setSelectedFile(file);
    setRawText(sample.content);
    setDocumentTitle(sample.name);
    setInputMode('file');
  };

  const handleResetAudit = () => {
    setSelectedFile(null);
    setRawText('');
    setAuditResult(null);
    activeAuditReqId.current++;
    setActiveFileName('');
    setErrorState(null);
    setSelectedFinding(null);
    setAnalysisStage('IDLE');
  };

  const handleStartAnalysis = async () => {
    // Concurrency guard: ignore duplicate triggers while an analysis is in flight
    if (analysisStage !== 'IDLE' && analysisStage !== 'COMPLETE') {
      return;
    }

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

    const reqId = ++activeAuditReqId.current;
    const currentDocName = hasFile
      ? selectedFile.name
      : documentTitle || 'Pasted_Agreement.txt';
    setActiveFileName(currentDocName);

    setAnalysisStage('UPLOADING');
    const stageTimer1 = setTimeout(() => {
      if (reqId === activeAuditReqId.current) setAnalysisStage('EXTRACTING');
    }, 600);
    const stageTimer2 = setTimeout(() => {
      if (reqId === activeAuditReqId.current) setAnalysisStage('SEGMENTING');
    }, 1300);
    const stageTimer3 = setTimeout(() => {
      if (reqId === activeAuditReqId.current) setAnalysisStage('ANALYZING');
    }, 2100);
    const stageTimer4 = setTimeout(() => {
      if (reqId === activeAuditReqId.current) setAnalysisStage('VERIFYING');
    }, 3000);

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

      // If request was superseded while fetch was pending, ignore result
      if (reqId !== activeAuditReqId.current) {
        return;
      }

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

        setErrorState({ title: userTitle, message: msg });
        setAnalysisStage('IDLE');
        return;
      }

      const result: AuditResult = await res.json();
      if (reqId !== activeAuditReqId.current) {
        return;
      }

      setAuditResult(result);
      setAnalysisStage('COMPLETE');
    } catch {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(stageTimer4);

      if (reqId !== activeAuditReqId.current) {
        return;
      }

      setErrorState({
        title: 'Connection Notice',
        message: 'Could not communicate with the ClauseGuard audit service. Please try again.',
      });
      setAnalysisStage('IDLE');
    }
  };

  // Filtered and sorted single audit findings
  const displayedFindings = useMemo(() => {
    if (!auditResult) return [];

    let filtered = [...auditResult.findings];
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

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((f) => f.category === categoryFilter);
    }

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

    return filtered;
  }, [auditResult, attentionFilter, categoryFilter, sortOption]);

  // =========================================================================
  // Comparison Handlers
  // =========================================================================
  const handleSelectSamplePair = (pair: SampleComparisonPair) => {
    const fileA = new File([pair.contractA.content], pair.contractA.name, { type: 'text/plain' });
    const fileB = new File([pair.contractB.content], pair.contractB.name, { type: 'text/plain' });

    setContractA({
      file: fileA,
      rawText: pair.contractA.content,
      fileName: pair.contractA.name,
      mode: 'file',
    });
    setContractB({
      file: fileB,
      rawText: pair.contractB.content,
      fileName: pair.contractB.name,
      mode: 'file',
    });
  };

  const handleResetComparison = () => {
    activeCompareReqId.current++;
    setContractA({ ...INITIAL_CONTRACT_INPUT });
    setContractB({ ...INITIAL_CONTRACT_INPUT });
    setComparisonResult(null);
    setSelectedComparisonFinding(null);
    setComparisonStage('IDLE');
    setCompareErrorState(null);
  };

  const handleStartComparison = async () => {
    // Concurrency guard: ignore duplicate triggers while a comparison is in flight
    if (comparisonStage !== 'IDLE' && comparisonStage !== 'COMPLETE') {
      return;
    }

    setCompareErrorState(null);
    setComparisonResult(null);

    const hasA = (contractA.mode === 'file' && contractA.file) || (contractA.mode === 'text' && contractA.rawText.trim().length > 0);
    const hasB = (contractB.mode === 'file' && contractB.file) || (contractB.mode === 'text' && contractB.rawText.trim().length > 0);

    if (!hasA || !hasB) {
      setCompareErrorState({
        title: 'Both Contracts Required',
        message: 'Please provide both Contract A (Baseline) and Contract B (Revised) to run comparison.',
      });
      return;
    }

    const reqId = ++activeCompareReqId.current;
    setComparisonStage('PREPARING');
    const timer1 = setTimeout(() => {
      if (reqId === activeCompareReqId.current) setComparisonStage('ALIGNING');
    }, 700);
    const timer2 = setTimeout(() => {
      if (reqId === activeCompareReqId.current) setComparisonStage('ANALYZING');
    }, 1600);
    const timer3 = setTimeout(() => {
      if (reqId === activeCompareReqId.current) setComparisonStage('VERIFYING');
    }, 2600);

    try {
      let res: Response;
      const bothFiles = contractA.mode === 'file' && contractA.file && contractB.mode === 'file' && contractB.file;

      if (bothFiles) {
        const formData = new FormData();
        formData.append('file_a', contractA.file!);
        formData.append('file_b', contractB.file!);
        formData.append('reject_unverified', 'true');

        res = await fetch('/api/v1/compare', {
          method: 'POST',
          body: formData,
        });
      } else {
        const payloadA = contractA.mode === 'file' && contractA.file
          ? { raw_text: await contractA.file.text(), file_name: contractA.file.name }
          : { raw_text: contractA.rawText, file_name: contractA.fileName || 'Contract_A.txt' };

        const payloadB = contractB.mode === 'file' && contractB.file
          ? { raw_text: await contractB.file.text(), file_name: contractB.file.name }
          : { raw_text: contractB.rawText, file_name: contractB.fileName || 'Contract_B.txt' };

        res = await fetch('/api/v1/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contract_a: payloadA,
            contract_b: payloadB,
            reject_unverified: true,
          }),
        });
      }

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (reqId !== activeCompareReqId.current) {
        return;
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const code = errorJson?.error?.code || 'COMPARISON_FAILED';
        const msg = errorJson?.error?.message || 'Comparison failed. Please verify documents and retry.';

        let userTitle = 'Comparison Failed';
        if (code === 'INPUT_TOO_LARGE') userTitle = 'Contracts Exceed Context Size';
        if (code === 'UNSUPPORTED_FORMAT') userTitle = 'Unsupported Format';
        if (code === 'AI_TIMEOUT') userTitle = 'Comparison Timed Out';

        setCompareErrorState({ title: userTitle, message: msg });
        setComparisonStage('IDLE');
        return;
      }

      const result: ComparisonResult = await res.json();
      if (reqId !== activeCompareReqId.current) {
        return;
      }

      setComparisonResult(result);
      setComparisonStage('COMPLETE');
    } catch {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (reqId !== activeCompareReqId.current) {
        return;
      }

      setCompareErrorState({
        title: 'Connection Notice',
        message: 'Could not communicate with the ClauseGuard comparison service. Please check network and retry.',
      });
      setComparisonStage('IDLE');
    }
  };

  // Filtered and sorted comparison findings
  const displayedComparisonFindings = useMemo(() => {
    if (!comparisonResult) return [];

    let filtered = [...comparisonResult.findings];

    // Status Filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((f) => f.status === statusFilter);
    }

    // Hide Same Filter
    if (hideSameProvisions) {
      filtered = filtered.filter((f) => f.status !== 'same');
    }

    // Category Filter
    if (comparisonCategoryFilter !== 'ALL') {
      filtered = filtered.filter((f) => f.category === comparisonCategoryFilter);
    }

    // Live Search Filter
    if (comparisonSearchQuery.trim().length > 0) {
      const q = comparisonSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.plain_english_summary.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.contract_a_source?.clause_id.toLowerCase().includes(q) ||
          f.contract_b_source?.clause_id.toLowerCase().includes(q)
      );
    }

    // Presentation Sorting Priority: changed -> added -> removed -> ambiguous -> same
    const statusOrder: Record<string, number> = {
      changed: 1,
      added: 2,
      removed: 3,
      ambiguous: 4,
      same: 5,
    };

    filtered.sort((a, b) => {
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      return orderA - orderB;
    });

    return filtered;
  }, [comparisonResult, statusFilter, hideSameProvisions, comparisonCategoryFilter, comparisonSearchQuery]);

  const isAnalyzing = analysisStage !== 'IDLE' && analysisStage !== 'COMPLETE';
  const isComparing = comparisonStage !== 'IDLE' && comparisonStage !== 'COMPLETE';
  const hasAuditInputs = Boolean(selectedFile || rawText.trim().length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <WorkstationHeader
        activeFileName={
          activeMode === 'audit'
            ? activeFileName
            : comparisonResult
            ? `${comparisonResult.metadata.contract_a_metadata.file_name} ↔ ${comparisonResult.metadata.contract_b_metadata.file_name}`
            : undefined
        }
        onNewAudit={
          activeMode === 'audit' && auditResult
            ? handleResetAudit
            : activeMode === 'compare' && comparisonResult
            ? handleResetComparison
            : undefined
        }
        isAnalyzing={isAnalyzing || isComparing}
        activeMode={activeMode}
        onModeChange={handleModeChange}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ================================================================= */}
        {/* MODE A: SINGLE DOCUMENT AUDIT */}
        {/* ================================================================= */}
        {activeMode === 'audit' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {errorState && (
              <ErrorAlert
                title={errorState.title}
                message={errorState.message}
                onDismiss={() => setErrorState(null)}
                onRetry={hasAuditInputs ? handleStartAnalysis : undefined}
              />
            )}

            {/* Ingestion Area (when no audit result) */}
            {!auditResult && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-semibold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Single Document Ingestion & Grounded Audit</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    Audit Your Commercial Agreement
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
                    Extracts and segments your agreement, runs grounded AI analysis, and
                    verifies cited quotes directly against original contract text.
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

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={!hasAuditInputs || isAnalyzing}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    <span>Run Grounded Legal Audit</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {isAnalyzing && (
                  <div className="pt-4">
                    <StageProgressBar currentStage={analysisStage} />
                  </div>
                )}
              </div>
            )}

            {/* Findings Workspace (when audit complete) */}
            {auditResult && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <DocumentOverview
                  fileName={activeFileName || auditResult.metadata.file_name || 'Document.txt'}
                  documentId={auditResult.document_id}
                  metadata={auditResult.metadata}
                  onReset={handleResetAudit}
                />

                <ExecutiveSummaryCard
                  summary={auditResult.summary}
                  primaryConcerns={auditResult.primary_concerns}
                />

                <MetricsBar
                  findings={auditResult.findings}
                  metadata={auditResult.metadata}
                  rejectedFindings={auditResult.rejected_findings}
                />

                <FilterSortToolbar
                  findings={auditResult.findings}
                  activeFilter={attentionFilter}
                  onFilterChange={setAttentionFilter}
                  selectedCategory={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                  activeSort={sortOption}
                  onSortChange={setSortOption}
                />

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
          </div>
        )}

        {/* ================================================================= */}
        {/* MODE B: CONTRACT COMPARISON */}
        {/* ================================================================= */}
        {activeMode === 'compare' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {compareErrorState && (
              <ErrorAlert
                title={compareErrorState.title}
                message={compareErrorState.message}
                onDismiss={() => setCompareErrorState(null)}
                onRetry={handleStartComparison}
              />
            )}

            {/* Input Panels (when no comparison result) */}
            {!comparisonResult && (
              <div className="space-y-6">
                <div className="text-center space-y-2 max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-semibold uppercase tracking-wider">
                    <GitCompareArrows className="w-3.5 h-3.5 text-amber-600" />
                    <span>Side-by-Side Grounded Contract Comparison</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    Compare Baseline vs. Revised Contracts
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
                    Upload two agreements to align corresponding clauses, isolate substantive changes,
                    and view dual-document verified evidence.
                  </p>
                </div>

                <ComparisonInputPanel
                  contractA={contractA}
                  contractB={contractB}
                  onChangeContractA={setContractA}
                  onChangeContractB={setContractB}
                  onSelectSamplePair={handleSelectSamplePair}
                  samplePairs={SAMPLE_COMPARISON_PAIRS}
                  onCompare={handleStartComparison}
                  isComparing={isComparing}
                />

                {isComparing && (
                  <div className="pt-2">
                    <ComparisonStageProgress currentStage={comparisonStage} />
                  </div>
                )}
              </div>
            )}

            {/* Comparison Results Workspace (when comparison loaded) */}
            {comparisonResult && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Overview Header */}
                <ComparisonOverview
                  summary={comparisonResult.summary}
                  metadata={comparisonResult.metadata}
                  onReset={handleResetComparison}
                />

                {/* Metrics Breakdown */}
                <ComparisonMetricsBar
                  findings={comparisonResult.findings}
                  metadata={comparisonResult.metadata}
                  rejectedFindings={comparisonResult.rejected_findings}
                />

                {/* Filter & Search Toolbar */}
                <ComparisonFilterToolbar
                  findings={comparisonResult.findings}
                  activeStatus={statusFilter}
                  onStatusChange={setStatusFilter}
                  selectedCategory={comparisonCategoryFilter}
                  onCategoryChange={setComparisonCategoryFilter}
                  searchQuery={comparisonSearchQuery}
                  onSearchChange={setComparisonSearchQuery}
                  hideSame={hideSameProvisions}
                  onToggleHideSame={setHideSameProvisions}
                />

                {/* Findings Cards Grid */}
                {displayedComparisonFindings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedComparisonFindings.map((finding) => (
                      <ComparisonFindingCard
                        key={finding.id}
                        finding={finding}
                        onSelect={setSelectedComparisonFinding}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-800">
                      No comparison differences match the selected filters.
                    </p>
                    <p className="text-xs text-slate-500">
                      Try clearing search filters, selecting &ldquo;All&rdquo; status, or unchecking &ldquo;Hide equivalent provisions&rdquo;.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Single Audit Modal */}
      <FindingDetailModal
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />

      {/* Comparison Detail Modal */}
      <ComparisonDetailModal
        finding={selectedComparisonFinding}
        onClose={() => setSelectedComparisonFinding(null)}
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
