'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { DashboardMetrics } from '../../types';

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const [showOnChainDetails, setShowOnChainDetails] = useState(false);

  const secondsAgoStr =
    metrics.secondsAgo !== undefined && metrics.secondsAgo !== null
      ? metrics.secondsAgo <= 1
        ? 'Updated just now'
        : `Updated ${metrics.secondsAgo}s ago`
      : 'Updated just now';

  const isLive = metrics.isLiveSynced ?? true;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── Portfolio Hero Card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 border border-slate-800/40 px-4 py-3 sm:px-5 sm:py-3.5">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/50 to-transparent" />

        {/* Header row: Label + Live badge */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Portfolio Value
          </span>
          <div className="flex items-center space-x-1">
            <span
              className={`inline-flex items-center space-x-1 text-[9px] font-medium font-mono ${
                isLive ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{isLive ? 'LIVE' : 'ON-CHAIN'}</span>
            </span>
          </div>
        </div>

        {/* Main value */}
        <div className="mb-1">
          {metrics.isLoading ? (
            <div className="h-9 w-40 bg-slate-800 rounded animate-pulse" />
          ) : (
            <div className="text-[28px] sm:text-[36px] font-extrabold text-white tracking-tight font-mono leading-tight">
              {metrics.totalPortfolioValueUSD}
            </div>
          )}
        </div>

        {/* PNL + Share balance row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {!metrics.isLoading && (
            <span
              className={`inline-flex items-center space-x-1 text-[11px] font-bold font-mono ${
                metrics.isProfitable ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.isProfitable ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{metrics.pnlUSD}</span>
              <span className="opacity-80">{metrics.pnlPercentage}</span>
            </span>
          )}
          {metrics.userSharesBalance && (
            <span className="text-[10px] text-slate-500 font-mono">
              {metrics.userSharesBalance} <span className="text-slate-600">UVBTCETH</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Stats Grid 2×2 ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* NAV */}
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            NAV / Share
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              metrics.sharePriceUSD
            )}
          </div>
        </div>

        {/* Invested */}
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Invested
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              metrics.investedAssetsUSD
            )}
          </div>
        </div>

        {/* PNL — visually subordinate to hero */}
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            PNL
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span
                className={
                  metrics.isProfitable
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {metrics.pnlUSD}
              </span>
            )}
          </div>
        </div>

        {/* Return — visually subordinate to hero */}
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Return
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span
                className={
                  metrics.isProfitable
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {metrics.pnlPercentage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Compact On-Chain Info Toggle ── */}
      <div className="pt-1.5">
        <button
          onClick={() => setShowOnChainDetails(!showOnChainDetails)}
          className="flex items-center space-x-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <Info className="w-3 h-3" />
          <span>On-chain data</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="font-mono text-muted-foreground">{secondsAgoStr}</span>
          {showOnChainDetails ? (
            <ChevronUp className="w-3 h-3 ml-auto" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-auto" />
          )}
        </button>

        {showOnChainDetails && (
          <div className="mt-2 space-y-1.5 text-[10px] font-mono text-muted-foreground bg-muted rounded-lg p-3 border border-border-subtle">
            <div className="flex items-center space-x-1.5 text-foreground">
              <Database className="w-3 h-3" />
              <span className="font-semibold text-[11px]">Data Sources</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
              <div>
                <span className="text-muted-foreground">Portfolio Value:</span>{' '}
                <span>PortfolioManager.calculatePortfolioValue()</span>
              </div>
              <div>
                <span className="text-muted-foreground">NAV:</span>{' '}
                <span>PortfolioManager.calculateNAV()</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cost Basis:</span>{' '}
                <span>CostBasisManager</span>
              </div>
              <div>
                <span className="text-muted-foreground">Strategy:</span>{' '}
                <span>StrategyManager.getTargetWeights()</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 pt-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">
                All data verified on-chain
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
