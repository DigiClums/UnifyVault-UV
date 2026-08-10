'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { useDashboard } from '../../hooks/useDashboard';
import { PortfolioAnalyticsCard } from '../../components/dashboard/PortfolioAnalyticsCard';
import { HistoricalNavChart } from '../../components/portfolio/HistoricalNavChart';
import { HoldingsTable } from '../../components/portfolio/HoldingsTable';
import { AllocationChart } from '../../components/dashboard/AllocationChart';
import { NavDebugLogger } from '../../components/dashboard/NavDebugLogger';
import { getDefaultChainId } from '../../constants';
import { base } from 'viem/chains';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PortfolioPage() {
  const metrics = useDashboard();
  const { chain } = useAccount();
  const currentChainId = chain?.id || getDefaultChainId();
  const networkName = currentChainId === base.id ? 'Base Mainnet' : 'Base Sepolia';

  return (
    <div className="space-y-3 sm:space-y-6 pt-1 pb-6 sm:py-2">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
            Personal Portfolio
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {networkName} · Holdings, cost basis & performance
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2 py-1 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
          <span className="hidden sm:inline">{networkName} Live</span>
          <span className="sm:hidden">Live</span>
        </div>
      </div>

      {/* ── Portfolio Value Summary ── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 border border-slate-800/40 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/50 to-transparent" />

        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Portfolio Value
          </span>
          <div className="flex items-center space-x-1">
            <span
              className={`inline-flex items-center space-x-1 text-[9px] font-medium font-mono ${
                metrics.isLiveSynced !== false ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  metrics.isLiveSynced !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{metrics.isLiveSynced !== false ? 'LIVE' : 'ON-CHAIN'}</span>
            </span>
          </div>
        </div>

        <div className="mb-1">
          {metrics.isLoading ? (
            <div className="h-9 w-40 bg-slate-800 rounded animate-pulse" />
          ) : (
            <div className="text-[28px] sm:text-[36px] font-extrabold text-white tracking-tight font-mono leading-tight">
              {metrics.totalPortfolioValueUSD}
            </div>
          )}
        </div>

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

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            NAV
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              metrics.sharePriceUSD
            )}
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cost Basis
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              metrics.investedAssetsUSD
            )}
          </div>
        </div>
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

      {/* ── Portfolio Analytics ── */}
      <PortfolioAnalyticsCard metrics={metrics} />

      {/* ── Historical NAV ── */}
      <HistoricalNavChart />

      {/* ── Allocation + Holdings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-1">
          <AllocationChart metrics={metrics} />
        </div>
        <div className="lg:col-span-2">
          <HoldingsTable />
        </div>
      </div>

      {/* ── Debug Logger (dev only) ── */}
      <NavDebugLogger data={metrics} />
    </div>
  );
}
