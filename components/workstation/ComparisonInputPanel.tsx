'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  ArrowRight,
  Sparkles,
  GitCompareArrows,
  AlertCircle,
} from 'lucide-react';
import { SampleComparisonPair } from '@/lib/constants/sample-contracts';

const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB
const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'md'];

export interface ContractInputData {
  file: File | null;
  rawText: string;
  fileName: string;
  mode: 'file' | 'text';
}

interface ComparisonInputPanelProps {
  contractA: ContractInputData;
  contractB: ContractInputData;
  onChangeContractA: (data: ContractInputData) => void;
  onChangeContractB: (data: ContractInputData) => void;
  onSelectSamplePair: (pair: SampleComparisonPair) => void;
  samplePairs: SampleComparisonPair[];
  onCompare: () => void;
  isComparing: boolean;
  disabled?: boolean;
}

export function ComparisonInputPanel({
  contractA,
  contractB,
  onChangeContractA,
  onChangeContractB,
  onSelectSamplePair,
  samplePairs,
  onCompare,
  isComparing,
  disabled = false,
}: ComparisonInputPanelProps) {
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);

  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  const [isDraggingA, setIsDraggingA] = useState(false);
  const [isDraggingB, setIsDraggingB] = useState(false);

  const validateAndSetFile = (
    file: File,
    target: 'A' | 'B'
  ): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const msg = `Unsupported file type ".${ext}". Please upload a .pdf, .txt, or .md agreement.`;
      if (target === 'A') setErrorA(msg);
      else setErrorB(msg);
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `File exceeds 500 KB limit (${(file.size / 1024).toFixed(1)} KB). Please upload a smaller agreement.`;
      if (target === 'A') setErrorA(msg);
      else setErrorB(msg);
      return false;
    }

    if (target === 'A') {
      setErrorA(null);
      onChangeContractA({
        file,
        rawText: '',
        fileName: file.name,
        mode: 'file',
      });
    } else {
      setErrorB(null);
      onChangeContractB({
        file,
        rawText: '',
        fileName: file.name,
        mode: 'file',
      });
    }
    return true;
  };

  const hasContractA = Boolean(
    (contractA.mode === 'file' && contractA.file) ||
    (contractA.mode === 'text' && contractA.rawText.trim().length > 0)
  );

  const hasContractB = Boolean(
    (contractB.mode === 'file' && contractB.file) ||
    (contractB.mode === 'text' && contractB.rawText.trim().length > 0)
  );

  const canCompare = hasContractA && hasContractB && !isComparing && !disabled;

  return (
    <div className="space-y-8">
      {/* 1-Click Comparison Samples */}
      {samplePairs.length > 0 && (
        <div className="bg-gradient-to-r from-slate-100 to-amber-50/60 border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Quick Start Comparison Samples
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Pre-loaded fictional commercial agreements with known substantive variances
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {samplePairs.map((pair) => (
              <button
                key={pair.id}
                type="button"
                onClick={() => {
                  setErrorA(null);
                  setErrorB(null);
                  onSelectSamplePair(pair);
                }}
                disabled={isComparing || disabled}
                className="text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>{pair.name}</span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-mono">
                    Load Pair
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {pair.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dual Upload Panels (Contract A vs Contract B) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* Visual VS Badge in between on desktop */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-900 text-amber-400 border-2 border-white shadow-md items-center justify-center font-extrabold text-xs">
          VS
        </div>

        {/* ============================================================ */}
        {/* CONTRACT A (BASELINE) */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h2 className="text-sm font-bold text-slate-900">Contract A</h2>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Baseline Draft
              </span>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex items-center text-[11px] bg-slate-100 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => onChangeContractA({ ...contractA, mode: 'file' })}
                disabled={isComparing || disabled}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  contractA.mode === 'file'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                File
              </button>
              <button
                type="button"
                onClick={() => onChangeContractA({ ...contractA, mode: 'text' })}
                disabled={isComparing || disabled}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  contractA.mode === 'text'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Paste
              </button>
            </div>
          </div>

          {errorA && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorA}</span>
            </div>
          )}

          {contractA.mode === 'file' ? (
            <div>
              {contractA.file ? (
                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate" title={contractA.file.name}>
                        {contractA.file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(contractA.file.size / 1024).toFixed(1)} KB · {contractA.file.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorA(null);
                      onChangeContractA({ file: null, rawText: '', fileName: '', mode: 'file' });
                    }}
                    disabled={isComparing || disabled}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-white transition-colors"
                    aria-label="Remove Contract A file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingA(true);
                  }}
                  onDragLeave={() => setIsDraggingA(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingA(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      validateAndSetFile(e.dataTransfer.files[0], 'A');
                    }
                  }}
                  onClick={() => fileInputRefA.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDraggingA
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
                  }`}
                >
                  <input
                    ref={fileInputRefA}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        validateAndSetFile(e.target.files[0], 'A');
                      }
                    }}
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Drop baseline contract here</p>
                  <p className="text-[11px] text-slate-400 mt-1">.pdf, .txt, or .md up to 500 KB</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 flex-1 flex flex-col">
              <textarea
                value={contractA.rawText}
                onChange={(e) => {
                  setErrorA(null);
                  onChangeContractA({
                    ...contractA,
                    rawText: e.target.value,
                    fileName: contractA.fileName || 'Contract_A.txt',
                  });
                }}
                disabled={isComparing || disabled}
                placeholder="Paste Contract A baseline text here..."
                rows={6}
                className="w-full text-xs font-mono p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 resize-none"
              />
              <div className="text-right text-[10px] text-slate-400">
                {contractA.rawText.length.toLocaleString()} characters
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* CONTRACT B (REVISED / COMPARISON) */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h2 className="text-sm font-bold text-slate-900">Contract B</h2>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Revised / Proposed
              </span>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex items-center text-[11px] bg-slate-100 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => onChangeContractB({ ...contractB, mode: 'file' })}
                disabled={isComparing || disabled}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  contractB.mode === 'file'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                File
              </button>
              <button
                type="button"
                onClick={() => onChangeContractB({ ...contractB, mode: 'text' })}
                disabled={isComparing || disabled}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  contractB.mode === 'text'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Paste
              </button>
            </div>
          </div>

          {errorB && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorB}</span>
            </div>
          )}

          {contractB.mode === 'file' ? (
            <div>
              {contractB.file ? (
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate" title={contractB.file.name}>
                        {contractB.file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(contractB.file.size / 1024).toFixed(1)} KB · {contractB.file.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorB(null);
                      onChangeContractB({ file: null, rawText: '', fileName: '', mode: 'file' });
                    }}
                    disabled={isComparing || disabled}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-white transition-colors"
                    aria-label="Remove Contract B file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingB(true);
                  }}
                  onDragLeave={() => setIsDraggingB(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingB(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      validateAndSetFile(e.dataTransfer.files[0], 'B');
                    }
                  }}
                  onClick={() => fileInputRefB.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDraggingB
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50/60'
                  }`}
                >
                  <input
                    ref={fileInputRefB}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        validateAndSetFile(e.target.files[0], 'B');
                      }
                    }}
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Drop revised contract here</p>
                  <p className="text-[11px] text-slate-400 mt-1">.pdf, .txt, or .md up to 500 KB</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 flex-1 flex flex-col">
              <textarea
                value={contractB.rawText}
                onChange={(e) => {
                  setErrorB(null);
                  onChangeContractB({
                    ...contractB,
                    rawText: e.target.value,
                    fileName: contractB.fileName || 'Contract_B.txt',
                  });
                }}
                disabled={isComparing || disabled}
                placeholder="Paste Contract B revision text here..."
                rows={6}
                className="w-full text-xs font-mono p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 flex-1 resize-none"
              />
              <div className="text-right text-[10px] text-slate-400">
                {contractB.rawText.length.toLocaleString()} characters
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Compare Action Button */}
      <div className="flex flex-col items-center justify-center gap-2 pt-2">
        <button
          type="button"
          onClick={onCompare}
          disabled={!canCompare}
          className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          <GitCompareArrows className="w-4 h-4 text-amber-400" />
          <span>Compare Contracts</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {!hasContractA && !hasContractB && (
          <p className="text-[11px] text-slate-500">
            Upload or paste both Contract A (Baseline) and Contract B (Revised) to begin.
          </p>
        )}
        {hasContractA && !hasContractB && (
          <p className="text-[11px] text-amber-700 font-medium">
            Contract A ready. Please upload or paste Contract B to enable comparison.
          </p>
        )}
        {!hasContractA && hasContractB && (
          <p className="text-[11px] text-blue-700 font-medium">
            Contract B ready. Please upload or paste Contract A to enable comparison.
          </p>
        )}
      </div>
    </div>
  );
}
