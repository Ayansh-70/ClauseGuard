'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { SAMPLE_CONTRACTS, SampleContract } from '@/lib/constants/sample-contracts';

interface ContractDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onSelectSampleText: (contract: SampleContract) => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 500 * 1024; // 500 KB limit from Phase 2
const SUPPORTED_EXTS = ['.pdf', '.txt', '.md'];

export function ContractDropzone({
  selectedFile,
  onFileSelect,
  onSelectSampleText,
  disabled = false,
}: ContractDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (file: File) => {
    setValidationError(null);

    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

    if (!SUPPORTED_EXTS.includes(ext)) {
      setValidationError(
        `Unsupported file type "${ext || 'unknown'}". ClauseGuard accepts .pdf, .txt, and .md documents.`
      );
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      const sizeKb = (file.size / 1024).toFixed(1);
      setValidationError(
        `File size (${sizeKb} KB) exceeds the 500 KB maximum limit.`
      );
      return;
    }

    if (file.size === 0) {
      setValidationError('The selected file is empty (0 bytes).');
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
        disabled={disabled}
        className="hidden"
        id="clauseguard-file-upload"
        aria-label="Upload contract file"
      />

      {/* Drop zone container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !selectedFile && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          selectedFile
            ? 'border-emerald-500/60 bg-emerald-50/20'
            : isDragging
            ? 'border-amber-500 bg-amber-50/30 scale-[1.005]'
            : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50 cursor-pointer'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {selectedFile ? (
          /* File Selected Card */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-emerald-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 truncate max-w-[280px] sm:max-w-md">
                    {selectedFile.name}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span className="uppercase font-mono text-[11px] text-slate-400">
                    {selectedFile.name.split('.').pop()}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">Ready for audit</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Remove selected file"
                aria-label="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Empty Drop Prompt */
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              Drop your contract here, or{' '}
              <span className="text-amber-600 hover:text-amber-700 underline underline-offset-2">
                browse files
              </span>
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Supports <strong className="font-semibold text-slate-700">PDF, TXT, MD</strong> agreements up to{' '}
              <strong className="font-semibold text-slate-700">500 KB</strong>
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              <span>Deterministic local parsing & grounding</span>
            </div>
          </div>
        )}
      </div>

      {/* Validation error display */}
      {validationError && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* 1-Click Sample Contracts Loader */}
      {!selectedFile && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Or explore with pre-loaded realistic sample agreements:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SAMPLE_CONTRACTS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSelectSampleText(sample)}
                disabled={disabled}
                className="flex flex-col text-left p-2.5 bg-white hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-md transition-all text-xs group"
              >
                <div className="font-medium text-slate-900 group-hover:text-amber-600 transition-colors">
                  {sample.name.replace('.txt', '')}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {sample.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
