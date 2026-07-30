'use client';

import React from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Wallet,
  Coins,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import { Card } from '../common/Card';
import { DashboardMetrics } from '../../types';

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      title: 'Total Portfolio Value',
      value: metrics.totalPortfolioValueUSD,
      change: 'Custody Vault Total Valuation',
      isPositive: true,
      icon: DollarSign,
      iconBg: 'bg-accent-blue/10 text-accent-blue',
      source: 'On-chain: PortfolioManager.calculatePortfolioValue()',
    },
    {
      title: 'Current NAV / Share Price',
      value: metrics.navPerShareUSD,
      change: '1 Share = ' + metrics.navPerShareUSD,
      isPositive: true,
      icon: Activity,
      iconBg: 'bg-accent-violet/10 text-accent-violet',
      source: 'On-chain: PortfolioManager.calculateNAV()',
    },
    {
      title: 'Your Invested Capital',
      value: metrics.investedAssetsUSD,
      change: 'Recorded Cost Basis',
      isPositive: true,
      icon: Wallet,
      iconBg: 'bg-accent-emerald/10 text-accent-emerald',
      source: 'On-chain: UnifyVaultController',
    },
    {
      title: 'Current Holding Value',
      value: metrics.currentValueUSD,
      change: metrics.userSharesBalance + ' UVBTCETH',
      isPositive: true,
      icon: Coins,
      iconBg: 'bg-accent-cyan/10 text-accent-cyan',
      source: 'On-chain: userShares * sharePriceUSD',
    },
    {
      title: 'Net Profit & Loss (PnL)',
      value: metrics.pnlUSD,
      change: metrics.pnlPercentage,
      isPositive: metrics.isProfitable,
      icon: TrendingUp,
      iconBg: metrics.isProfitable
        ? 'bg-accent-emerald/10 text-accent-emerald'
        : 'bg-accent-rose/10 text-accent-rose',
      source: 'Calculated: currentValue - investedAssets',
    },
    {
      title: 'Strategy Index Allocation',
      value: `${metrics.btcAllocationPercent} BTC / ${metrics.ethAllocationPercent} ETH`,
      change: 'Target Multi-Asset Strategy',
      isPositive: true,
      icon: PieChart,
      iconBg: 'bg-accent-amber/10 text-accent-amber',
      source: 'On-chain: StrategyManager.getTargetWeights()',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} glow className="relative group overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400">{card.title}</span>
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-white tracking-tight">
                {metrics.isLoading ? (
                  <div className="h-8 w-32 bg-slate-800 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold">
                {card.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-accent-emerald" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-accent-rose" />
                )}
                <span className={card.isPositive ? 'text-accent-emerald' : 'text-accent-rose'}>
                  {card.change}
                </span>
              </div>
            </div>

            {/* Documented Source Tooltip */}
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center space-x-1">
                <Info className="w-3 h-3 text-slate-400" />
                <span>Source</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-border-subtle">
                {card.source}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
