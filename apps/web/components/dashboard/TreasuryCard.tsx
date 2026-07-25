'use client';

import * as React from 'react';
import { TreasuryFeesData } from '../../services/protocol/dashboardService';

interface TreasuryCardProps {
  treasury: TreasuryFeesData;
  loading?: boolean;
}

export function TreasuryCard({ treasury, loading }: TreasuryCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/60 p-6 backdrop-blur-md animate-pulse">
        <div className="h-5 w-32 rounded bg-muted mb-4" />
        <div className="h-8 w-28 rounded bg-muted mb-4" />
        <div className="space-y-2">
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
            Treasury Revenue
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            0.25% Fee Revenue
          </span>
        </div>

        <div className="mb-4">
          <span className="text-2xl font-extrabold font-mono text-foreground">
            {treasury.totalUsdFormatted}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total fee reserves in Treasury</p>
        </div>

        <div className="space-y-2">
          {treasury.balances.length > 0 ? (
            treasury.balances.map((fee) => (
              <div
                key={fee.address}
                className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/60 text-xs font-mono"
              >
                <span className="text-muted-foreground">{fee.symbol} Fee:</span>
                <span className="font-bold text-foreground">
                  {fee.balanceFormatted} {fee.symbol}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2 font-mono">
              No treasury fee balances recorded
            </p>
          )}

          {treasury.nativeBalanceRaw > 0n && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/60 text-xs font-mono">
              <span className="text-muted-foreground">ETH Fee:</span>
              <span className="font-bold text-foreground">
                {treasury.nativeBalanceFormatted} ETH
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between font-mono">
        <span>Withdrawal Role</span>
        <span>GOVERNANCE_ROLE</span>
      </div>
    </div>
  );
}
