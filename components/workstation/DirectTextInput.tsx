'use client';

import React, { useState, ChangeEvent } from 'react';
import { AlertCircle } from 'lucide-react';

interface DirectTextInputProps {
  value: string;
  onChange: (val: string) => void;
  documentTitle: string;
  onTitleChange: (title: string) => void;
  disabled?: boolean;
}

const MAX_TEXT_BYTES = 500 * 1024;

export function DirectTextInput({
  value,
  onChange,
  documentTitle,
  onTitleChange,
  disabled = false,
}: DirectTextInputProps) {
  const [error, setError] = useState<string | null>(null);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const byteLength = new TextEncoder().encode(text).length;

    if (byteLength > MAX_TEXT_BYTES) {
      setError(`Contract text exceeds the 500 KB limit (${(byteLength / 1024).toFixed(1)} KB).`);
    } else {
      setError(null);
    }

    onChange(text);
  };

  const charCount = value.length;
  const wordCount = value.trim().length > 0 ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="contract-title" className="block text-xs font-semibold text-slate-700 mb-1">
          Document Title (optional)
        </label>
        <input
          id="contract-title"
          type="text"
          value={documentTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Master_Services_Agreement.txt"
          disabled={disabled}
          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="contract-raw-text" className="block text-xs font-semibold text-slate-700">
            Contract Text
          </label>
          <div className="text-[11px] text-slate-400 font-mono">
            {wordCount} words • {charCount} chars
          </div>
        </div>
        <textarea
          id="contract-raw-text"
          rows={10}
          value={value}
          onChange={handleTextChange}
          placeholder="Paste commercial agreement text here with numbered clauses or headings..."
          disabled={disabled}
          className="w-full text-xs font-mono p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white leading-relaxed resize-y"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
