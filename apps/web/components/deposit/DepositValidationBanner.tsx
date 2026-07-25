'use client';

import * as React from 'react';

interface DepositValidationBannerProps {
  type: 'PAUSED' | 'INSUFFICIENT_BALANCE' | 'EXCEEDS_MAX' | 'ERROR';
  message: string;
}

export function DepositValidationBanner({ type, message }: DepositValidationBannerProps) {
  const isWarning = type === 'PAUSED' || type === 'EXCEEDS_MAX';
  const colorClasses = isWarning
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400';

  return (
    <div
      className={`p-3.5 rounded-2xl border ${colorClasses} text-xs flex items-center gap-3 my-4 font-mono`}
    >
      <span className="text-base shrink-0">{isWarning ? '⚠️' : '⛔'}</span>
      <span className="flex-1">{message}</span>
    </div>
  );
}
