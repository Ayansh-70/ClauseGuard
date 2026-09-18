'use client';

import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorAlert({
  title = 'Analysis Notice',
  message,
  onRetry,
  onDismiss,
}: ErrorAlertProps) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-rose-700" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-900">{title}</h4>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-md transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-rose-400 hover:text-rose-700 rounded-md transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
