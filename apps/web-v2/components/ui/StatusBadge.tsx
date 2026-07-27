'use client';

import React from 'react';
import { cn } from '../../lib/utils/cn';

export type StatusVariant =
  'online' | 'healthy' | 'warning' | 'error' | 'paused' | 'active' | 'admin';

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  className?: string;
  showPulse?: boolean;
}

export function StatusBadge({ status, label, className, showPulse = true }: StatusBadgeProps) {
  const getVariantStyles = (s: string) => {
    switch (s.toLowerCase()) {
      case 'online':
      case 'healthy':
      case 'active':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-400',
          pulse: 'bg-emerald-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-400',
          pulse: 'bg-amber-400',
        };
      case 'error':
      case 'paused':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dot: 'bg-rose-400',
          pulse: 'bg-rose-400',
        };
      case 'admin':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dot: 'bg-purple-400',
          pulse: 'bg-purple-400',
        };
      default:
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          dot: 'bg-blue-400',
          pulse: 'bg-blue-400',
        };
    }
  };

  const styles = getVariantStyles(status);
  const displayLabel = label || status.toUpperCase();

  return (
    <span
      className={cn(
        'inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm transition-all',
        styles.bg,
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        {showPulse && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              styles.pulse,
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', styles.dot)} />
      </span>
      <span>{displayLabel}</span>
    </span>
  );
}
