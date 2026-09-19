'use client';

import React from 'react';
import { ArrowLeftRight, Clock, Layers, RotateCcw, ShieldCheck, Download, Printer, FileText, ChevronDown } from 'lucide-react';
import { ComparisonMetadata } from '@/types/domain';

interface ComparisonOverviewProps {
  summary: string;
  metadata: ComparisonMetadata;
  onReset: () => void;
}

export function ComparisonOverview({
  summary,
  metadata,
  onReset,
}: ComparisonOverviewProps) {
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportHtml = () => {
    setExportMenuOpen(false);
    window.open(`/api/v1/export/comparison-report?id=${encodeURIComponent(metadata.comparison_id)}&format=html`, '_blank');
  };

  const handleExportMarkdown = () => {
    setExportMenuOpen(false);
    window.location.href = `/api/v1/export/comparison-report?id=${encodeURIComponent(metadata.comparison_id)}&format=markdown&download=true`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
      {/* Top bar: Document names & Reset */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Grounded Comparison Result</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900">
            <span className="text-blue-700 font-mono text-sm sm:text-base">
              {metadata.contract_a_metadata.file_name}
            </span>
            <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-amber-800 font-mono text-sm sm:text-base">
              {metadata.contract_b_metadata.file_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          {/* Export Comparison Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={exportMenuOpen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-amber-900 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>Export Comparison</span>
              <ChevronDown className={`w-3.5 h-3.5 text-amber-700 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-20 focus:outline-none">
                <button
                  type="button"
                  onClick={handleExportHtml}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Print / Save as PDF</div>
                    <div className="text-[10px] text-slate-500">Executive Redline HTML</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2.5 transition-colors border-t border-slate-100"
                >
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Download Markdown (.md)</div>
                    <div className="text-[10px] text-slate-500">Comparison Memorandum</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Comparison</span>
          </button>
        </div>
      </div>

      {/* Summary Narrative */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Comparative Summary
        </h3>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          {summary}
        </p>
      </div>

      {/* Metadata Telemetry Pills */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Duration: {(metadata.duration_ms / 1000).toFixed(2)}s</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Pre-aligned Provisions: {metadata.aligned_pairs_count}</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1.5">
          <span>Evaluator: {metadata.model_used}</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
          <span>ID: {metadata.comparison_id}</span>
        </div>
      </div>
    </div>
  );
}
