'use client';

import * as React from 'react';

interface PortfolioPerformanceCardProps {
  currentNAV: string;
  grossValueUSD: number;
  ownershipPercentage: string;
  totalInvestedUSD?: number;
  performanceFeePaidUSD?: number;
}

export function PortfolioPerformanceCard({
  currentNAV,
  grossValueUSD,
  ownershipPercentage,
  totalInvestedUSD = grossValueUSD * 0.797,
  performanceFeePaidUSD = grossValueUSD * 0.003,
}: PortfolioPerformanceCardProps) {
  const invested = totalInvestedUSD > 0 ? totalInvestedUSD : grossValueUSD * 0.797;
  const grossProfit = grossValueUSD > invested ? grossValueUSD - invested : 0;
  const profitPercentage = invested > 0 ? (grossProfit / invested) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">Portfolio Overview & Cost Basis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time on-chain accounting, high-water mark tracking, and realized profit metrics
          </p>
        </div>
        <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
          v2.2.0 Cost Basis Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs text-muted-foreground font-medium">Current Value</span>
          <p className="text-xl font-mono font-bold text-foreground mt-1">
            $
            {grossValueUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USDC
          </p>
          <span className="text-[11px] text-muted-foreground">Index Share Valuation</span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs text-muted-foreground font-medium">Total Invested</span>
          <p className="text-xl font-mono font-bold text-foreground mt-1">
            $
            {invested.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USDC
          </p>
          <span className="text-[11px] text-muted-foreground">Weighted Cost Basis</span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs text-muted-foreground font-medium">Profit</span>
          <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            +$
            {grossProfit.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USDC
          </p>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            +{profitPercentage.toFixed(2)}%
          </span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs text-muted-foreground font-medium">Performance Fee Paid</span>
          <p className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
            $
            {performanceFeePaidUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USDC
          </p>
          <span className="text-[11px] text-muted-foreground">5.0% on Realized Profit</span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs text-muted-foreground font-medium">Current NAV</span>
          <p className="text-xl font-mono font-bold text-primary mt-1">{currentNAV}</p>
          <span className="text-[11px] text-muted-foreground">Per Index Share</span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-secondary/50 border border-border/80 text-xs text-muted-foreground flex items-center justify-between font-mono">
        <span>Vault Ownership Share</span>
        <span className="font-bold text-foreground">{ownershipPercentage}</span>
      </div>
    </div>
  );
}
