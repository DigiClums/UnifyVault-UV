'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useDashboard } from '../../hooks/useDashboard';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useHistoricalNAV, useTransactionHistory } from '../../hooks/useIndexerData';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  ShieldCheck,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import { NavSnapshot } from '../../types';

const AnalyticsNavChart = dynamic(
  () => import('../../components/analytics/AnalyticsNavChart').then((mod) => mod.AnalyticsNavChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 sm:h-52 w-full flex items-center justify-center">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

type PeriodOption = '1D' | '7D' | '30D' | '90D' | 'ALL';
const PERIODS: PeriodOption[] = ['1D', '7D', '30D', '90D', 'ALL'];

// ─── Colours matching Portfolio AllocationChart ───
const ASSET_COLORS: Record<string, { bg: string; bar: string; dot: string }> = {
  BTC: { bg: 'bg-[#BFFF00]/10', bar: 'bg-[#BFFF00]', dot: 'bg-[#BFFF00]' },
  ETH: { bg: 'bg-slate-400/15', bar: 'bg-slate-400', dot: 'bg-slate-400' },
  USDC: { bg: 'bg-slate-500/10', bar: 'bg-slate-500', dot: 'bg-slate-500' },
};

const FALLBACK_COLOR = { bg: 'bg-slate-500/10', bar: 'bg-slate-500', dot: 'bg-slate-500' };

export default function AnalyticsPage() {
  const metrics = useDashboard();
  const { holdings } = usePortfolio();
  const [period, setPeriod] = useState<PeriodOption>('ALL');
  const { navHistory, isLoading: isLoadingNav } = useHistoricalNAV(period);
  const { transactions } = useTransactionHistory();

  // ── Detect genuine historical data ──
  const hasRealHistoricalData = useMemo(() => {
    if (!navHistory || navHistory.length < 2) return false;
    return navHistory.some((s) => (s.totalAssets ?? 0) > 0 || (s.nav ?? 0) > 0);
  }, [navHistory]);

  // ── Allocation from live holdings ──
  const allocationData = useMemo(() => {
    return holdings
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        weightPercent: parseFloat(h.weightPercent.replace('%', '')) || 0,
        valueUSD: h.valueUSD,
        color: ASSET_COLORS[h.symbol] || FALLBACK_COLOR,
      }))
      .filter((d) => d.weightPercent > 0);
  }, [holdings]);

  // ── Recent activity from transactions ──
  const recentActivity = useMemo(() => {
    return transactions.filter((tx) => tx.type === 'DEPOSIT' || tx.type === 'REDEEM').slice(0, 5);
  }, [transactions]);

  const activityCount = useMemo(() => {
    return transactions.filter((tx) => tx.type === 'DEPOSIT' || tx.type === 'REDEEM').length;
  }, [transactions]);

  return (
    <div className="space-y-2.5 sm:space-y-5 pt-1 pb-6 sm:py-2">
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
            Analytics
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            Portfolio performance &amp; UV price history
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2 py-1 rounded-lg bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#BFFF00] animate-pulse" />
          <span className="hidden sm:inline">Base Mainnet Live</span>
          <span className="sm:hidden">Live</span>
        </div>
      </div>

      {/* ── Current UV Price Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border-2 border-black dark:border-white/15 shadow-[4px_4px_0_#BFFF00] px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BFFF00]/60 to-transparent" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current UV Price
          </span>
          <span className="text-[10px] font-mono text-[#5f8f00] dark:text-[#BFFF00]">
            {metrics.sharePriceUSD}
          </span>
        </div>
        <div className="mb-1">
          {metrics.isLoading ? (
            <div className="h-8 w-28 bg-muted rounded animate-pulse" />
          ) : (
            <div className="text-[24px] sm:text-[30px] font-black text-foreground tracking-tight font-mono leading-tight">
              {metrics.sharePriceUSD}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-[11px] text-muted-foreground font-mono">
            Portfolio Value{' '}
            <span className="text-foreground">{metrics.totalPortfolioValueUSD}</span>
          </span>
        </div>
      </div>

      {/* ── Period Selector + Chart ── */}
      <div className="rounded-xl bg-card border border-border-subtle px-3.5 py-3 sm:px-4 sm:py-3.5">
        {/* Header: "Portfolio Performance" + period selector */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio Performance
            </span>
          </div>
          <div className="flex items-center space-x-0.5 bg-muted/60 p-0.5 rounded-lg border border-border-subtle">
            {PERIODS.map((p) => {
              const isActive = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                    isActive
                      ? 'bg-[#BFFF00] text-black shadow-sm shadow-[#BFFF00]/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart or Empty / Skeleton */}
        {isLoadingNav ? (
          <div className="h-48 sm:h-52 w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : !hasRealHistoricalData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-xl bg-muted border border-border-subtle text-muted-foreground mb-3">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">No historical price data yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mt-1 leading-relaxed">
              Your UV price history will appear after portfolio activity is recorded.
            </p>
          </div>
        ) : (
          <AnalyticsNavChart navHistory={navHistory} />
        )}
      </div>

      {/* ── Asset Distribution ── */}
      <div className="rounded-xl bg-card border border-border-subtle px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1.5">
            <PieChart className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Asset Distribution
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {allocationData.length} assets
          </span>
        </div>

        {allocationData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <p className="text-xs text-slate-500">No asset liquidity detected</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {allocationData.map((asset) => (
              <div key={asset.symbol}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${asset.color.dot} shrink-0`} />
                    <span className="text-[11px] font-semibold text-foreground">
                      {asset.symbol}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-foreground font-mono">
                      {asset.weightPercent.toFixed(1)}%
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {asset.valueUSD}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${asset.color.bar} transition-all duration-500`}
                    style={{ width: `${Math.min(asset.weightPercent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Portfolio Metrics 2×2 Grid ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Assets
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            ) : (
              metrics.totalPortfolioValueUSD
            )}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Return
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <span
                className={
                  metrics.isProfitable
                    ? 'text-[#5f8f00] dark:text-[#BFFF00]'
                    : 'text-rose-500 dark:text-rose-400'
                }
              >
                {metrics.pnlUSD}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current UVBE Price
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {metrics.isLoading ? (
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            ) : (
              metrics.sharePriceUSD
            )}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Asset Count
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {holdings.length}
          </div>
        </div>
      </div>

      {/* ── Protocol Fee Architecture ── */}
      <div className="rounded-xl bg-card border border-border-subtle px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-center space-x-1.5 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Protocol Fees
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg bg-muted border border-border-subtle px-3 py-2">
            <span className="text-muted-foreground">Deposit Fee</span>
            <div className="text-sm font-bold font-mono text-[#5f8f00] dark:text-[#BFFF00] mt-0.5">
              0.25% (25 BPS)
            </div>
          </div>
          <div className="rounded-lg bg-muted border border-border-subtle px-3 py-2">
            <span className="text-muted-foreground">Redemption Fee</span>
            <div className="text-sm font-bold font-mono text-[#5f8f00] dark:text-[#BFFF00] mt-0.5">
              2.00% (200 BPS)
            </div>
          </div>
          <div className="rounded-lg bg-muted border border-border-subtle px-3 py-2">
            <span className="text-muted-foreground">Performance Fee</span>
            <div className="text-sm font-bold font-mono text-muted-foreground mt-0.5">
              0.00% (Disabled)
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      {activityCount > 0 && (
        <div className="rounded-xl bg-card border border-border-subtle px-3.5 py-3 sm:px-4 sm:py-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Portfolio Activity
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {activityCount} events
            </span>
          </div>
          <div className="space-y-0.5">
            {recentActivity.map((tx, idx) => {
              const isDeposit = tx.type === 'DEPOSIT';
              return (
                <div
                  key={tx.txHash || idx}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isDeposit
                          ? 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00]'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownLeft className="w-3 h-3" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-foreground truncate">
                      {isDeposit ? 'Deposit' : 'Redeem'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {tx.sharesMinted && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {tx.sharesMinted.slice(0, 10)} UV
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-semibold font-mono ${
                        isDeposit
                          ? 'text-[#5f8f00] dark:text-[#BFFF00]'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isDeposit ? '+' : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
