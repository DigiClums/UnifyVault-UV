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
  const secondsAgoStr =
    metrics.secondsAgo !== undefined && metrics.secondsAgo !== null
      ? metrics.secondsAgo <= 1
        ? 'Updated just now'
        : `Updated ${metrics.secondsAgo}s ago`
      : 'Updated just now';

  const cards = [
    {
      title: 'Total Portfolio Value',
      value: metrics.totalPortfolioValueUSD,
      change: 'Custody Vault Total Valuation',
      isPositive: true,
      icon: DollarSign,
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      source: 'PortfolioManager.calculatePortfolioValue()',
      isLiveSynced: metrics.isLiveSynced ?? true,
      timeText: secondsAgoStr,
      isFeatured: false,
    },
    {
      title: 'Current NAV / Share Price',
      value: metrics.sharePriceUSD,
      change: '1 Share = ' + metrics.sharePriceUSD,
      isPositive: true,
      icon: Activity,
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      source: 'PortfolioManager.calculateNAV()',
      isLiveSynced: metrics.isLiveSynced ?? true,
      timeText: secondsAgoStr,
      isFeatured: true,
    },
    {
      title: 'Your Invested Capital',
      value: metrics.investedAssetsUSD,
      change: 'Recorded Cost Basis',
      isPositive: true,
      icon: Wallet,
      iconBg:
        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      source: 'CostBasisManager',
      isLiveSynced: false,
      isFeatured: false,
    },
    {
      title: 'Current Holding Value',
      value: metrics.currentValueUSD,
      change: metrics.userSharesBalance + ' UVBTCETH',
      isPositive: true,
      icon: Coins,
      iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
      source: 'userShares × onChainNAV',
      isLiveSynced: metrics.isLiveSynced ?? true,
      timeText: secondsAgoStr,
      isFeatured: false,
    },
    {
      title: 'Net Profit & Loss (PnL)',
      value: metrics.pnlUSD,
      change: metrics.pnlPercentage + ' (Holding − Cost)',
      isPositive: metrics.isProfitable,
      icon: TrendingUp,
      iconBg: metrics.isProfitable
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      source: 'currentValue - costBasis',
      isLiveSynced: metrics.isLiveSynced ?? true,
      timeText: secondsAgoStr,
      isFeatured: false,
      isPnL: true,
    },
    {
      title: 'Strategy Index Allocation',
      value: `${metrics.btcAllocationPercent} BTC / ${metrics.ethAllocationPercent} ETH`,
      change: 'Target Multi-Asset Strategy',
      isPositive: true,
      icon: PieChart,
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      source: 'StrategyManager.getTargetWeights()',
      isLiveSynced: false,
      isFeatured: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className={`relative group overflow-hidden transition-all duration-200 ${
              card.isFeatured
                ? 'bg-white dark:bg-slate-900 border-accent-blue/40 shadow-sm ring-1 ring-accent-blue/20'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 shadow-xs'
            }`}
          >
            {/* Header: Title & Icon */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>

                {/* Compact Live Status Badge */}
                <div className="flex items-center space-x-1.5 pt-0.5">
                  {card.isLiveSynced ? (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">LIVE</span>
                      <span>·</span>
                      <span>{card.timeText}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-slate-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>On-chain</span>
                    </span>
                  )}
                </div>
              </div>

              <div className={`p-2 rounded-xl ${card.iconBg} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Main Value Display */}
            <div className="space-y-1 min-w-0 my-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate font-mono">
                {metrics.isLoading ? (
                  <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </div>

              {/* Secondary Context */}
              <div className="flex items-center space-x-1.5 text-xs font-medium pt-0.5">
                {card.isPnL ? (
                  <span
                    className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                      card.isPositive
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    }`}
                  >
                    {card.isPositive ? (
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 shrink-0" />
                    )}
                    <span>{card.change}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate font-medium">
                    {card.change}
                  </span>
                )}
              </div>
            </div>

            {/* Compact Provenance Source Indicator */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <div
                className="flex items-center space-x-1 cursor-help hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title={`Source: ${card.source}`}
              >
                <Info className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="font-mono text-slate-400 dark:text-slate-500">ⓘ On-chain</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                {card.source.split(':')[0]}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
