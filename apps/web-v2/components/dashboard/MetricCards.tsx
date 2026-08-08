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
  Zap,
} from 'lucide-react';
import { Card } from '../common/Card';
import { DashboardMetrics } from '../../types';

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const secondsAgoStr =
    metrics.secondsAgo !== undefined && metrics.secondsAgo !== null
      ? metrics.secondsAgo <= 1
        ? 'Updated just now'
        : `Updated ${metrics.secondsAgo}s ago`
      : 'Updated 5s ago';

  const cards = [
    {
      title: 'Total Portfolio Value',
      value: metrics.totalPortfolioValueUSD,
      change: 'Custody Vault Total Valuation',
      isPositive: true,
      icon: DollarSign,
      iconBg: 'bg-accent-blue/10 text-accent-blue',
      source: 'On-chain: PortfolioManager.calculatePortfolioValue()',
      isLiveSynced: metrics.isLiveSynced ?? true,
      timeText: secondsAgoStr,
    },
    {
      title: 'Current NAV / Share Price',
      value: metrics.sharePriceUSD,
      change: '1 Share = ' + metrics.sharePriceUSD,
      isPositive: true,
      icon: Activity,
      iconBg: 'bg-accent-violet/10 text-accent-violet',
      source: 'On-chain: PortfolioManager.calculateNAV()',
      isLiveSynced: metrics.isLiveSynced ?? true,
      timeText: secondsAgoStr,
    },
    {
      title: 'Your Invested Capital',
      value: metrics.investedAssetsUSD,
      change: 'Recorded Cost Basis',
      isPositive: true,
      icon: Wallet,
      iconBg: 'bg-accent-emerald/10 text-accent-emerald',
      source: 'On-chain: CostBasisManager',
      isLiveSynced: false,
    },
    {
      title: 'Current Holding Value',
      value: metrics.currentValueUSD,
      change: metrics.userSharesBalance + ' UVBTCETH',
      isPositive: true,
      icon: Coins,
      iconBg: 'bg-accent-cyan/10 text-accent-cyan',
      source: 'On-chain: userShares × onChainNAV',
      isLiveSynced: metrics.isLiveSynced ?? true,
      timeText: secondsAgoStr,
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
      source: 'Calculated: currentValue - costBasis',
      isLiveSynced: metrics.isLiveSynced ?? true,
      timeText: secondsAgoStr,
    },
    {
      title: 'Strategy Index Allocation',
      value: `${metrics.btcAllocationPercent} BTC / ${metrics.ethAllocationPercent} ETH`,
      change: 'Target Multi-Asset Strategy',
      isPositive: true,
      icon: PieChart,
      iconBg: 'bg-accent-amber/10 text-accent-amber',
      source: 'On-chain: StrategyManager.getTargetWeights()',
      isLiveSynced: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} glow className="relative group overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {card.title}
                </span>
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  {card.isLiveSynced ? (
                    <>
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                        <Zap className="w-2.5 h-2.5 animate-pulse" />
                        <span>LIVE • Oracle valued</span>
                      </span>
                      {card.timeText && (
                        <span className="text-[10px] font-medium text-slate-400">
                          {card.timeText}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">On-chain Sync</span>
                  )}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${card.iconBg} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate font-mono">
                {metrics.isLoading ? (
                  <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold">
                {card.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-accent-emerald shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-accent-rose shrink-0" />
                )}
                <span
                  className={`truncate ${card.isPositive ? 'text-accent-emerald' : 'text-accent-rose'}`}
                >
                  {card.change}
                </span>
              </div>
            </div>

            {/* Provenance Badge & Tooltip */}
            <div className="mt-4 pt-3 border-t border-border-subtle/50 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
              <div className="flex items-center space-x-1 shrink-0">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-400">Provenance</span>
              </div>
              <span
                title={`Source: ${card.source}`}
                className="font-mono text-[10px] text-slate-400 dark:text-slate-300 bg-slate-800/50 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50 transition-colors cursor-help shrink-0"
              >
                On-chain
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
