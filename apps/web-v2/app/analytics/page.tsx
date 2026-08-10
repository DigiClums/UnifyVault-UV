'use client';

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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

type PeriodOption = '1D' | '7D' | '30D' | '90D' | 'ALL';
const PERIODS: PeriodOption[] = ['1D', '7D', '30D', '90D', 'ALL'];

function formatAxisDate(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return timestampStr;
  }
}

function formatTooltipDate(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestampStr;
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NavSnapshot }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 p-2.5 rounded-lg shadow-xl backdrop-blur-md text-[11px] space-y-1.5 min-w-[190px]">
      <div className="border-b border-slate-800 pb-1 font-semibold text-slate-300">
        {formatTooltipDate(data.timestamp)}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-cyan-400 font-medium">NAV:</span>
          <span className="font-bold text-white font-mono">
            ${Number(data.nav || data.sharePrice || 0).toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Assets:</span>
          <span className="font-semibold font-mono">
            $
            {Number(data.totalAssets || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Colours matching Portfolio AllocationChart ───
const ASSET_COLORS: Record<string, { bg: string; bar: string; dot: string }> = {
  BTC: { bg: 'bg-amber-500/10', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  ETH: { bg: 'bg-blue-500/10', bar: 'bg-blue-500', dot: 'bg-blue-500' },
  USDC: { bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
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

  const activityCount = transactions.filter(
    (tx) => tx.type === 'DEPOSIT' || tx.type === 'REDEEM',
  ).length;

  return (
    <div className="space-y-2.5 sm:space-y-5 pt-1 pb-6 sm:py-2">
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
            Analytics
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            Portfolio performance &amp; historical NAV
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2 py-1 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
          <span className="hidden sm:inline">Base Mainnet Live</span>
          <span className="sm:hidden">Live</span>
        </div>
      </div>

      {/* ── Current NAV Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 border border-slate-800/40 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/50 to-transparent" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Current NAV
          </span>
          <span className="text-[10px] font-mono text-emerald-400">{metrics.sharePriceUSD}</span>
        </div>
        <div className="mb-1">
          {metrics.isLoading ? (
            <div className="h-8 w-28 bg-slate-800 rounded animate-pulse" />
          ) : (
            <div className="text-[24px] sm:text-[30px] font-extrabold text-white tracking-tight font-mono leading-tight">
              {metrics.sharePriceUSD}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-[11px] text-slate-500 font-mono">
            Portfolio Value <span className="text-slate-300">{metrics.totalPortfolioValueUSD}</span>
          </span>
        </div>
      </div>

      {/* ── Period Selector + Chart ── */}
      <div className="rounded-xl bg-card border border-border-subtle px-3.5 py-3 sm:px-4 sm:py-3.5">
        {/* Header: "Portfolio Performance" + period selector */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio Performance
            </span>
          </div>
          <div className="flex items-center space-x-0.5 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/60">
            {PERIODS.map((p) => {
              const isActive = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                    isActive
                      ? 'bg-accent-blue text-white shadow-sm shadow-accent-blue/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
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
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-400 mb-3">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No historical NAV data yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">
              Your NAV history will appear after portfolio activity is recorded.
            </p>
          </div>
        ) : (
          <div className="h-48 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={navHistory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsNavGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={formatAxisDate}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  domain={['dataMin - 0.002', 'dataMax + 0.002']}
                  tickFormatter={(val) => `$${Number(val || 0).toFixed(3)}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="nav"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#analyticsNavGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Asset Distribution ── */}
      <div className="rounded-xl bg-card border border-border-subtle px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1.5">
            <PieChart className="w-3.5 h-3.5 text-amber-400" />
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
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
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
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className={metrics.isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                {metrics.pnlUSD}
              </span>
            )}
          </div>
        </div>

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
          <ShieldCheck className="w-3.5 h-3.5 text-accent-blue" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Protocol Fees
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 px-3 py-2">
            <span className="text-slate-400">Deposit Fee</span>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              0.25% (25 BPS)
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 px-3 py-2">
            <span className="text-slate-400">Redemption Fee</span>
            <div className="text-sm font-bold font-mono text-purple-400 mt-0.5">
              2.00% (200 BPS)
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 px-3 py-2">
            <span className="text-slate-400">Performance Fee</span>
            <div className="text-sm font-bold font-mono text-slate-400 mt-0.5">
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
              <Activity className="w-3.5 h-3.5 text-accent-blue" />
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
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isDeposit
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
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
                        isDeposit ? 'text-emerald-400' : 'text-amber-400'
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
