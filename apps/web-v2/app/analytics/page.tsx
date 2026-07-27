'use client';

import React from 'react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StatCard } from '../../components/ui/StatCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useDashboard } from '../../hooks/useDashboard';
import { usePortfolio } from '../../hooks/usePortfolio';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Layers,
  Activity,
  History,
} from 'lucide-react';

const COLORS = ['#F7931A', '#627EEA', '#2775CA'];

export default function AnalyticsPage() {
  const { totalPortfolioValueUSD, sharePriceUSD } = useDashboard();
  const { holdings } = usePortfolio();

  const allocationData = holdings
    .map((h) => ({
      name: h.symbol,
      value: parseFloat(h.weightPercent.replace('%', '')) || 0,
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Protocol Analytics & Telemetry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold">
              Live On-Chain
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time asset metrics and allocation performance across the index vault.
          </p>
        </div>
      </div>

      {/* Top Stat Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          value={holdings.length}
          subtitle="WBTC, WETH, USDC"
          icon={DollarSign}
          glowColor="purple"
        />
      </div>

      {/* Real-time Allocation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Live Portfolio Asset Allocation"
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
                    innerRadius={60}
                    outerRadius={90}
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
                    formatter={(val: number) => [`${val.toFixed(1)}%`, 'Allocation']}
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

        {/* Historical Charts Reassuring UX Copy */}
        <ChartCard
          title="Historical TVL & Volume Trajectory"
          subtitle="On-chain performance progression"
          icon={Activity}
          className="lg:col-span-2"
        >
          <EmptyState
            title="Historical performance is not yet available."
            description="Historical analytics will appear automatically as on-chain history becomes available. Real-time portfolio state is active above."
            icon={History}
          />
        </ChartCard>
      </div>

      {/* Historical Revenue & Fee Chart */}
      <ChartCard
        title="Protocol Revenue & Fee Accrual History"
        subtitle="Cumulative protocol fee progression"
        icon={BarChart3}
      >
        <EmptyState
          title="Revenue history is accumulating."
          description="Historical fee accrual records will appear automatically as protocol activity grows."
          icon={History}
        />
      </ChartCard>
    </div>
  );
}
