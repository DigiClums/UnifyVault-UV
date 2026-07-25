'use client';

import * as React from 'react';
import { LiquidityStatusData } from '../../services/protocol/dashboardService';

interface LiquidityCardProps {
  liquidity: LiquidityStatusData;
  loading?: boolean;
}

export function LiquidityCard({ liquidity, loading }: LiquidityCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/60 p-6 backdrop-blur-md animate-pulse">
        <div className="h-5 w-32 rounded bg-muted mb-4" />
        <div className="h-6 w-24 rounded bg-muted mb-4" />
        <div className="space-y-2">
          <div className="h-8 rounded bg-muted w-full" />
          <div className="h-8 rounded bg-muted w-full" />
        </div>
      </div>
    );
  }

  const statusBadge = liquidity.needsRefill
    ? { text: 'REFILL NEEDED', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
    : liquidity.needsSweep
      ? { text: 'SWEEP REQUIRED', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' }
      : {
          text: 'BALANCED (10%)',
          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        };

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm dark:shadow-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Liquidity Manager
          </h3>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}
          >
            {statusBadge.text}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Operational liquidity target: 10% (1,000 BPS). Reserve sweep at 15%.
        </p>

        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-muted-foreground">Operational Buffer:</span>
            <span className="font-bold text-foreground">
              {liquidity.operationalBalanceRaw.toString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-muted-foreground">Reserve Buffer:</span>
            <span className="font-bold text-foreground">
              {liquidity.reserveBalanceRaw.toString()}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between font-mono">
        <span>Module Status</span>
        <span>Registered (Directory)</span>
      </div>
    </div>
  );
}
