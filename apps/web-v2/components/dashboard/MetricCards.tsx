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
    <section className="space-y-4">
      {/* Portfolio hero */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 px-5 py-5 sm:px-7 sm:py-6 shadow-[6px_6px_0_#BFFF00]">
        {/* Lime accent */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#BFFF00]" />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Position Value
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black font-mono border ${
                  isLive
                    ? 'bg-[#BFFF00] text-black border-black'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLive
                      ? 'bg-slate-900 dark:bg-black animate-pulse'
                      : 'bg-slate-400 dark:bg-white/30'
                  }`}
                />
                {isLive ? 'LIVE' : 'ON-CHAIN'}
              </span>
            </div>

            {metrics.isLoading ? (
              <div className="h-10 sm:h-12 w-44 sm:w-56 rounded-lg bg-white/10 animate-pulse" />
            ) : (
              <div className="text-[34px] sm:text-[48px] lg:text-[52px] font-black font-mono leading-none tracking-[-0.04em] text-slate-950 dark:text-white">
                {metrics.currentValueUSD}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              {!metrics.isLoading && (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-black font-mono ${
                    metrics.isProfitable ? 'text-[#BFFF00]' : 'text-[#ff5c5c]'
                  }`}
                >
                  {metrics.isProfitable ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>{metrics.pnlUSD}</span>
                  <span className="opacity-70">{metrics.pnlPercentage}</span>
                </span>
              )}

              {metrics.userSharesBalance && (
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {metrics.userSharesBalance}{' '}
                  <span className="text-slate-400 dark:text-white/25">UVBE</span>
                </span>
              )}
            </div>
          </div>

          {/* Decorative protocol mark */}
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#BFFF00] border-2 border-black shadow-[3px_3px_0_#fff]">
            <span className="text-black font-black text-lg tracking-tighter">UV</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {[
          {
            label: 'NAV / Share',
            value: metrics.sharePriceUSD,
            loading: metrics.isLoading,
          },
          {
            label: 'Invested',
            value: metrics.investedAssetsUSD,
            loading: metrics.isLoading,
          },
          {
            label: 'PNL',
            value: metrics.pnlUSD,
            loading: metrics.isLoading,
            positive: metrics.isProfitable,
          },
          {
            label: 'Return',
            value: metrics.pnlPercentage,
            loading: metrics.isLoading,
            positive: metrics.isProfitable,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="min-w-0 rounded-xl bg-card border-2 border-black dark:border-white/15 px-3.5 py-3.5 sm:px-4 sm:py-4 shadow-[3px_3px_0_rgba(0,0,0,0.85)] transition-transform hover:-translate-y-0.5"
          >
            <span className="block text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              {stat.label}
            </span>

            <div className="mt-1.5 min-w-0">
              {stat.loading ? (
                <div className="h-5 w-20 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
              ) : (
                <span
                  className={`block truncate text-sm sm:text-base font-black font-mono tracking-tight ${
                    stat.positive === undefined
                      ? 'text-foreground'
                      : stat.positive
                        ? 'text-[#5f8f00] dark:text-[#BFFF00]'
                        : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {stat.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* On-chain information */}
      <div>
        <button
          onClick={() => setShowOnChainDetails(!showOnChainDetails)}
          className="flex w-full items-center gap-1.5 text-[10px] text-muted-foreground hover:text-[#BFFF00] transition-colors"
        >
          <Info className="w-3 h-3" />
          <span>On-chain data</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="font-mono">{secondsAgoStr}</span>

          {showOnChainDetails ? (
            <ChevronUp className="w-3 h-3 ml-auto" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-auto" />
          )}
        </button>

        {showOnChainDetails && (
          <div className="mt-2 space-y-2 text-[10px] font-mono text-muted-foreground bg-muted rounded-xl p-3.5 border-2 border-black dark:border-white/10">
            <div className="flex items-center gap-1.5 text-foreground">
              <Database className="w-3 h-3" />
              <span className="font-semibold text-[11px]">Data Sources</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
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

            <div className="flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span className="text-[#5f8f00] dark:text-[#BFFF00]">All data verified on-chain</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
