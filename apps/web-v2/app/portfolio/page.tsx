'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { useDashboard } from '../../hooks/useDashboard';
import { PortfolioAnalyticsCard } from '../../components/dashboard/PortfolioAnalyticsCard';
import { HoldingsTable } from '../../components/portfolio/HoldingsTable';
import { getDefaultChainId } from '../../constants';
import { base } from 'viem/chains';
import {
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  LineChart,
  PieChart,
  ShieldCheck,
} from 'lucide-react';

const HistoricalNavChart = dynamic(
  () =>
    import('../../components/portfolio/HistoricalNavChart').then((mod) => mod.HistoricalNavChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 sm:h-72 w-full rounded-2xl bg-card border-2 border-black dark:border-white/15 p-4 sm:p-5 flex items-center justify-center shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <div className="w-8 h-8 rounded-full border-2 border-black dark:border-white/30 border-t-[#BFFF00] animate-spin" />
      </div>
    ),
  },
);

const AllocationChart = dynamic(
  () => import('../../components/dashboard/AllocationChart').then((mod) => mod.AllocationChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[160px] rounded-2xl bg-card border-2 border-black dark:border-white/15 p-4 sm:p-5 flex items-center justify-center shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <div className="w-8 h-8 rounded-full border-2 border-black dark:border-white/30 border-t-[#BFFF00] animate-spin" />
      </div>
    ),
  },
);

type PortfolioTab = 'overview' | 'chart' | 'reserves' | 'analytics';

export default function PortfolioPage() {
  const metrics = useDashboard();
  const { chain } = useAccount();
  const currentChainId = chain?.id || getDefaultChainId();
  const networkName = currentChainId === base.id ? 'Base Mainnet' : 'Base Sepolia';
  const [activeTab, setActiveTab] = useState<PortfolioTab>('overview');

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-8">
      {/* ── Mobile Compact Segment Selector (Zero Scroll Experience) ── */}
      <div className="md:hidden flex items-center p-1 bg-slate-200 dark:bg-black/80 rounded-2xl border-2 border-black dark:border-white/15 overflow-x-auto no-scrollbar shadow-[2px_2px_0_#000] gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[75px] py-2 px-2 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'overview'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 min-w-[75px] py-2 px-2 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'chart'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('reserves')}
          className={`flex-1 min-w-[75px] py-2 px-2 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'reserves'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Reserves</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[75px] py-2 px-2 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'analytics'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit</span>
        </button>
      </div>

      {/* ── 1. Position Value Hero Card (Always Visible on Overview / Desktop) ── */}
      <div className={`${activeTab === 'overview' ? 'block' : 'hidden md:block'}`}>
        <div className="relative overflow-hidden rounded-3xl bg-card border-2 border-black dark:border-white/15 p-4 sm:p-7 shadow-[5px_5px_0_#BFFF00] text-foreground">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[#BFFF00]" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Vault Net Value
                </span>
                <span
                  className={`inline-flex items-center space-x-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    metrics.isLiveSynced !== false
                      ? 'bg-[#BFFF00] text-black border-black'
                      : 'bg-muted text-muted-foreground border-border-subtle'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      metrics.isLiveSynced !== false ? 'bg-black animate-pulse' : 'bg-white/30'
                    }`}
                  />
                  <span>{metrics.isLiveSynced !== false ? 'LIVE SYNCED' : 'ON-CHAIN'}</span>
                </span>
              </div>

              {/* Position USD Value */}
              <div className="mt-1.5 text-3xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight font-mono">
                {metrics.isLoading ? (
                  <div className="h-10 w-40 bg-muted rounded-xl animate-pulse" />
                ) : (
                  metrics.currentValueUSD
                )}
              </div>

              {/* PnL & Stats */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-mono">
                {!metrics.isLoading && (
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold ${
                      metrics.isProfitable
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {metrics.isProfitable ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>{metrics.pnlUSD}</span>
                    <span className="opacity-70">({metrics.pnlPercentage})</span>
                  </div>
                )}

                {metrics.userSharesBalance && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-foreground/80 border border-black/10 dark:border-white/10 font-bold">
                    <span>{metrics.userSharesBalance}</span>
                    <span className="text-muted-foreground font-normal">UVBE</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Buttons for Portfolio */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
              <a
                href="/deposit"
                className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs hover:bg-[#a6df00] transition-all border-2 border-black shadow-[2px_2px_0_#000] active:scale-95"
              >
                + Deposit
              </a>
              <a
                href="/redeem"
                className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-foreground font-black text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-all border-2 border-black dark:border-white/15 shadow-[2px_2px_0_rgba(0,0,0,0.85)] active:scale-95"
              >
                Redeem
              </a>
            </div>
          </div>

          {/* ── 4 KEY METRIC TILES ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-border">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-border">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                UV Price
              </span>
              <div className="mt-0.5 text-xs sm:text-base font-black text-foreground font-mono truncate">
                {metrics.isLoading ? (
                  <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                ) : (
                  metrics.sharePriceUSD
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-border">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                Cost Basis
              </span>
              <div className="mt-0.5 text-xs sm:text-base font-black text-foreground font-mono truncate">
                {metrics.isLoading ? (
                  <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                ) : (
                  metrics.investedAssetsUSD
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-border">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                Vault TVL
              </span>
              <div className="mt-0.5 text-xs sm:text-base font-black text-foreground font-mono truncate">
                {metrics.isLoading ? (
                  <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                ) : (
                  metrics.totalPortfolioValueUSD
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-border">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                Pool Share
              </span>
              <div className="mt-0.5 text-xs sm:text-base font-black text-[#5f8f00] dark:text-[#BFFF00] font-mono truncate">
                {metrics.isLoading ? (
                  <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                ) : (
                  metrics.ownershipPercentage || '0.00%'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. ALLOCATION & HOLDINGS SECTION (Active on 'reserves' or desktop) ── */}
      <div className={`${activeTab === 'reserves' ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-1">
            <AllocationChart metrics={metrics} />
          </div>
          <div className="lg:col-span-2">
            <HoldingsTable />
          </div>
        </div>
      </div>

      {/* ── 3. HISTORICAL NAV & PRICE PROGRESSION (Active on 'chart' or desktop) ── */}
      <div className={`${activeTab === 'chart' ? 'block' : 'hidden md:block'}`}>
        <HistoricalNavChart />
      </div>

      {/* ── 4. DEEP AUDIT & ACCOUNTING ANALYTICS (Active on 'analytics' or desktop) ── */}
      <div className={`${activeTab === 'analytics' ? 'block' : 'hidden md:block'}`}>
        <PortfolioAnalyticsCard metrics={metrics} />
      </div>
    </div>
  );
}
