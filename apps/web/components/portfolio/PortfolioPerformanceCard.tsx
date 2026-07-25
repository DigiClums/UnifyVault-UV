'use client';

import * as React from 'react';

interface PortfolioPerformanceCardProps {
  currentNAV: string;
  grossValueUSD: number;
  ownershipPercentage: string;
}

export function PortfolioPerformanceCard({
  currentNAV,
  grossValueUSD,
  ownershipPercentage,
}: PortfolioPerformanceCardProps) {
  const feeUSD = grossValueUSD * 0.0025; // 0.25% fee
  const netUSD = grossValueUSD - feeUSD;

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-4">Redemption & Position Performance</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs text-muted-foreground font-medium">Current Vault NAV</span>
          <p className="text-lg font-mono font-bold text-foreground mt-1">{currentNAV}</p>
          <span className="text-[11px] text-muted-foreground">Appreciating Index NAV</span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs text-muted-foreground font-medium">Estimated Net Payout</span>
          <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            $
            {netUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USDC
          </p>
          <span className="text-[11px] text-muted-foreground">
            After 0.25% Protocol Fee (${feeUSD.toFixed(2)})
          </span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border/80">
          <span className="text-xs text-muted-foreground font-medium">Vault Ownership Share</span>
          <p className="text-lg font-mono font-bold text-primary mt-1">{ownershipPercentage}</p>
          <span className="text-[11px] text-muted-foreground">Share of Total Vault Supply</span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-secondary/50 border border-border/80 text-xs text-muted-foreground flex items-center justify-between font-mono">
        <span>Historical Cost Basis & PnL</span>
        <span className="font-semibold text-foreground">Not Tracked (On-Chain Protocol)</span>
      </div>
    </div>
  );
}
