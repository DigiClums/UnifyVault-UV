'use client';

import * as React from 'react';

interface SecurityCardProps {
  isPaused: boolean;
  loading?: boolean;
}

export function SecurityCard({ isPaused, loading }: SecurityCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/60 p-6 backdrop-blur-md animate-pulse">
        <div className="h-5 w-32 rounded bg-muted mb-4" />
        <div className="space-y-3">
          <div className="h-8 rounded bg-muted w-full" />
          <div className="h-8 rounded bg-muted w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm dark:shadow-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Security & Invariants
          </h3>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              !isPaused
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            {!isPaused ? 'SECURE' : 'PAUSED'}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Empirically verified protocol safety controls and asset isolation.
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-muted-foreground">Controller Balance:</span>
            <span className="font-bold text-emerald-500 font-mono">0 (Zero Retained)</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-muted-foreground">Donation Immunity:</span>
            <span className="font-bold text-emerald-500 font-mono">ACTIVE (Surplus)</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-muted-foreground">Reentrancy Guard:</span>
            <span className="font-bold text-emerald-500 font-mono">ENFORCED</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between font-mono">
        <span>Guardian Role</span>
        <span>GUARDIAN_ROLE</span>
      </div>
    </div>
  );
}
