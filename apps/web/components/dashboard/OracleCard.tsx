'use client';

import * as React from 'react';
import { OracleStatusData } from '../../services/protocol/dashboardService';

interface OracleCardProps {
  oracleStatus: OracleStatusData;
  loading?: boolean;
}

export function OracleCard({ oracleStatus, loading }: OracleCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/60 p-6 backdrop-blur-md animate-pulse">
        <div className="h-5 w-32 rounded bg-muted mb-4" />
        <div className="space-y-3">
          <div className="h-10 rounded bg-muted w-full" />
          <div className="h-10 rounded bg-muted w-full" />
          <div className="h-10 rounded bg-muted w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm dark:shadow-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Chainlink Oracles
          </h3>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              oracleStatus.isHealthy
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
          >
            {oracleStatus.isHealthy ? 'ALL FRESH' : 'DEGRADED'}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Canonical pricing feeds normalized to 18-decimal USD precision.
        </p>

        <div className="space-y-2.5">
          {oracleStatus.feeds.length > 0 ? (
            oracleStatus.feeds.map((feed) => (
              <div
                key={feed.address}
                className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/60 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      feed.isFresh ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-bold text-foreground">{feed.symbol}</span>
                </div>
                <span className="font-bold text-foreground">
                  $
                  {feed.priceUsdNumber.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2 font-mono">
              No active oracle feeds resolved
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between font-mono">
        <span>Provider</span>
        <span>ChainlinkOracleProvider</span>
      </div>
    </div>
  );
}
