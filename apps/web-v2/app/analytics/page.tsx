'use client';

import React from 'react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StatCard } from '../../components/ui/StatCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { HistoricalNavChart } from '../../components/portfolio/HistoricalNavChart';
import { useDashboard } from '../../hooks/useDashboard';
import { usePortfolio } from '../../hooks/usePortfolio';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Layers,
  ShieldCheck,
  Activity,
} from 'lucide-react';

const COLORS = ['#F7931A', '#627EEA', '#2775CA'];

export default function AnalyticsPage() {
  const metrics = useDashboard();
  const { totalPortfolioValueUSD, sharePriceUSD } = metrics;
  const { holdings } = usePortfolio();

  const allocationData = holdings
    .map((h) => ({
      name: h.symbol,
      value: parseFloat(h.weightPercent.replace('%', '')) || 0,
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Activity className="w-7 h-7 text-accent-blue" />
              <span>Protocol Telemetry & Historical Analytics</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Historical NAV trajectory, asset allocation weights, and protocol fee telemetry on Base
            Mainnet.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold self-start md:self-auto">
          Base Mainnet Live Sync
        </span>
      </div>

      {/* Top Protocol Stat Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Value Locked (TVL)"
          value={totalPortfolioValueUSD || '$0.00'}
          subtitle="Custodied vault assets"
          icon={Layers}
          glowColor="blue"
        />
        <StatCard
          title="NAV Per Index Share"
          value={sharePriceUSD || '$1.000'}
          subtitle="Net Asset Value valuation"
          icon={TrendingUp}
          glowColor="emerald"
        />
        <StatCard
          title="Collateral Assets"
          value={holdings.length.toString()}
          subtitle="cbBTC, WETH, USDC"
          icon={DollarSign}
          glowColor="purple"
        />
      </div>

      {/* Historical NAV Performance & Asset Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical NAV Chart (2 cols) */}
        <div className="lg:col-span-2">
          <HistoricalNavChart />
        </div>

        {/* Live Allocation Pie Chart (1 col) */}
        <ChartCard
          title="Live Asset Distribution"
          subtitle="Current weight breakdown by asset valuation"
          icon={PieIcon}
          className="lg:col-span-1"
        >
          {allocationData.length > 0 ? (
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {allocationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#FFF',
                    }}
                    formatter={(val: unknown) => [`${Number(val || 0).toFixed(1)}%`, 'Allocation']}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No Asset Liquidity"
              description="Vault balance is currently zero. Deposit collateral to view live asset distribution."
              icon={PieIcon}
            />
          )}
        </ChartCard>
      </div>

      {/* Fee & System Architecture Card */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
          <ShieldCheck className="w-5 h-5 text-accent-blue" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Protocol Fee Architecture & Safety Caps
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1">
            <span className="text-slate-400 font-medium">Deposit Protocol Fee</span>
            <div className="text-lg font-bold font-mono text-emerald-400">0.25% (25 BPS)</div>
            <p className="text-[11px] text-slate-400">
              Collected into Treasury upon collateral deposit
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1">
            <span className="text-slate-400 font-medium">Redemption Protocol Fee</span>
            <div className="text-lg font-bold font-mono text-purple-400">2.00% (200 BPS)</div>
            <p className="text-[11px] text-slate-400">
              Deducted from gross payout collateral upon redemption
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1">
            <span className="text-slate-400 font-medium">Performance Fee / HWM</span>
            <div className="text-lg font-bold font-mono text-slate-400">0.00% (Disabled)</div>
            <p className="text-[11px] text-slate-400">
              Zero performance fee charged across all user accounts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
