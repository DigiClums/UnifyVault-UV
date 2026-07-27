'use client';

import React from 'react';
import { usePortfolio } from '../../../hooks/usePortfolio';
import { StatCard } from '../../../components/ui/StatCard';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { RefreshCw, PieChart, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';

export default function AdminRebalancePage() {
  const { holdings } = usePortfolio();

  const btcHolding = holdings.find((h) => h.symbol === 'BTC');
  const ethHolding = holdings.find((h) => h.symbol === 'ETH');

  const btcWeight = btcHolding ? parseFloat(btcHolding.weightPercent.replace('%', '')) : 0.0;
  const ethWeight = ethHolding ? parseFloat(ethHolding.weightPercent.replace('%', '')) : 0.0;

  const targetWeight = 50.0;
  const btcDev = Math.abs(btcWeight - targetWeight);
  const ethDev = Math.abs(ethWeight - targetWeight);
  const maxDev = Math.max(btcDev, ethDev);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Strategy Allocation & Rebalance
            </h1>
            <StatusBadge
              status={maxDev > 5 ? 'Warning' : 'Healthy'}
              label={maxDev > 5 ? 'ATTENTION NEEDED' : 'BALANCED'}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor index asset weights against target ratios (50% BTC / 50% ETH).
          </p>
        </div>
      </div>

      {/* Real On-Chain Weight Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Current BTC Weight"
          value={`${btcWeight.toFixed(1)}%`}
          subtitle="Target: 50.0%"
          icon={PieChart}
          glowColor="amber"
        />
        <StatCard
          title="Current ETH Weight"
          value={`${ethWeight.toFixed(1)}%`}
          subtitle="Target: 50.0%"
          icon={PieChart}
          glowColor="blue"
        />
        <StatCard
          title="Maximum Weight Deviation"
          value={`${maxDev.toFixed(1)}%`}
          subtitle="Target threshold: 5.0%"
          icon={AlertTriangle}
          glowColor={maxDev > 5 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Allocation Breakdown Table */}
      <TableCard
        title="Asset Allocation vs Strategy Target Breakdown"
        subtitle="Live asset weights calculated from custody balances and market prices"
        icon={RefreshCw}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-slate-400 font-semibold">
              <th className="py-3 px-3">Strategy Asset</th>
              <th className="py-3 px-3">Custody Balance</th>
              <th className="py-3 px-3">USD Valuation</th>
              <th className="py-3 px-3">Current Weight</th>
              <th className="py-3 px-3">Target Weight</th>
              <th className="py-3 px-3 text-right">Deviation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 font-mono">
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px] font-extrabold">
                  BT
                </div>
                <span>Wrapped Bitcoin (WBTC)</span>
              </td>
              <td className="py-4 px-3 text-slate-200">
                {btcHolding?.balanceFormatted || '0.00'} BTC
              </td>
              <td className="py-4 px-3 text-emerald-400 font-bold">
                {btcHolding?.valueUSD || '$0.00'}
              </td>
              <td className="py-4 px-3 text-accent-blue font-bold">{btcWeight.toFixed(1)}%</td>
              <td className="py-4 px-3 text-slate-400">50.0%</td>
              <td className="py-4 px-3 text-right font-bold text-amber-400">
                {btcDev.toFixed(1)}%
              </td>
            </tr>

            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] font-extrabold">
                  ET
                </div>
                <span>Wrapped Ether (WETH)</span>
              </td>
              <td className="py-4 px-3 text-slate-200">
                {ethHolding?.balanceFormatted || '0.00'} ETH
              </td>
              <td className="py-4 px-3 text-emerald-400 font-bold">
                {ethHolding?.valueUSD || '$0.00'}
              </td>
              <td className="py-4 px-3 text-accent-blue font-bold">{ethWeight.toFixed(1)}%</td>
              <td className="py-4 px-3 text-slate-400">50.0%</td>
              <td className="py-4 px-3 text-right font-bold text-amber-400">
                {ethDev.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </TableCard>

      {/* Contract Function Availability Box */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle space-y-4">
        <div className="flex items-center space-x-2 text-white font-bold text-base border-b border-border-subtle/40 pb-3">
          <ShieldCheck className="w-5 h-5 text-accent-blue" />
          <span>Automated Portfolio Rebalancing</span>
        </div>
        <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-900/60 border border-border-subtle text-xs text-slate-300">
          <Lock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white">Rebalancing Is Temporarily Paused</p>
            <p className="text-slate-400 leading-relaxed">
              Target asset allocations are currently monitored automatically. Automated portfolio
              rebalancing will activate automatically when weight deviation exceeds threshold
              limits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
