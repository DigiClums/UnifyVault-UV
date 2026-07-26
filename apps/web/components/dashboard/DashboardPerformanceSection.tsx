'use client';

import * as React from 'react';

interface DashboardPerformanceSectionProps {
  currentValueUSD?: number;
  totalInvestedUSD?: number;
  realizedProfitUSD?: number;
  performanceFeesPaidUSD?: number;
  currentNAV?: string;
  todayChangePercent?: number;
}

export function DashboardPerformanceSection({
  currentValueUSD = 12542.31,
  totalInvestedUSD = 10000.0,
  realizedProfitUSD = 520.0,
  performanceFeesPaidUSD = 37.4,
  currentNAV = '$1.2542',
  todayChangePercent = 2.15,
}: DashboardPerformanceSectionProps) {
  const unrealizedGain =
    currentValueUSD > totalInvestedUSD ? currentValueUSD - totalInvestedUSD : 0;
  const totalReturnPercent = totalInvestedUSD > 0 ? (unrealizedGain / totalInvestedUSD) * 100 : 0;
  const todayGainUSD = (currentValueUSD * todayChangePercent) / 100;

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">
            Investor Performance Breakdown
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            On-chain cost basis tracking, high-water mark metrics, and net realized performance
          </p>
        </div>
        <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
          v2.2.0 Accounting Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Current Value */}
        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current Value
          </span>
          <p className="text-xl font-mono font-extrabold text-foreground mt-1">
            $
            {currentValueUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            +${todayGainUSD.toFixed(2)} ({todayChangePercent > 0 ? '+' : ''}
            {todayChangePercent}%) Today
          </span>
        </div>

        {/* Total Invested */}
        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Invested
          </span>
          <p className="text-xl font-mono font-extrabold text-foreground mt-1">
            $
            {totalInvestedUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <span className="text-[11px] text-muted-foreground">Weighted Cost Basis</span>
        </div>

        {/* Unrealized Gain */}
        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Unrealized Gain
          </span>
          <p className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            +$
            {unrealizedGain.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            +{totalReturnPercent.toFixed(2)}% Total Return
          </span>
        </div>

        {/* Realized Profit */}
        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Realized Profit
          </span>
          <p className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            +$
            {realizedProfitUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <span className="text-[11px] text-muted-foreground">Settled Redemptions</span>
        </div>

        {/* Performance Fees Paid */}
        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Perf Fees Paid
          </span>
          <p className="text-xl font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            $
            {performanceFeesPaidUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <span className="text-[11px] text-muted-foreground">5.0% on Realized Gains</span>
        </div>

        {/* Current NAV */}
        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current NAV
          </span>
          <p className="text-xl font-mono font-extrabold text-primary mt-1">{currentNAV}</p>
          <span className="text-[11px] text-muted-foreground">Per Index Share</span>
        </div>
      </div>
    </div>
  );
}
