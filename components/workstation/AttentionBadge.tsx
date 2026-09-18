'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { AttentionLevel } from '@/types/domain';

interface AttentionBadgeProps {
  level: AttentionLevel | string;
  size?: 'sm' | 'md';
}

export function AttentionBadge({ level, size = 'md' }: AttentionBadgeProps) {
  const getBadgeConfig = (lvl: string) => {
    switch (lvl) {
      case 'HIGH_ATTENTION':
        return {
          label: 'HIGH ATTENTION',
          icon: AlertTriangle,
          className:
            'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300/50',
          iconColor: 'text-rose-600',
        };
      case 'MEDIUM_ATTENTION':
        return {
          label: 'MEDIUM ATTENTION',
          icon: AlertCircle,
          className:
            'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300/50',
          iconColor: 'text-amber-600',
        };
      case 'LOW_ATTENTION':
      case 'INFORMATIONAL':
      case 'STANDARD_NOTICE':
      default:
        return {
          label: 'STANDARD NOTICE',
          icon: Info,
          className:
            'bg-slate-100 text-slate-800 border-slate-300 ring-1 ring-slate-300/50',
          iconColor: 'text-slate-600',
        };
    }
  };

  const config = getBadgeConfig(level);
  const Icon = config.icon;

  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : 'px-2.5 py-1 text-[11px] gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide rounded-md border font-mono uppercase ${sizeClass} ${config.className}`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${config.iconColor}`} />
      <span>{config.label}</span>
    </span>
  );
}
