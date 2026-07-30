'use client';

import React from 'react';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../common/Card';
import { DashboardMetrics } from '../../types';

interface PortfolioAnalyticsCardProps {
  metrics: DashboardMetrics;
}

export function PortfolioAnalyticsCard({ metrics }: PortfolioAnalyticsCardProps) {
  const items = [
    {
      label: 'Current Holding Value',
      value: metrics.currentValueUSD,
      subtitle: `${metrics.userSharesBalance} UVBTCETH`,
      icon: DollarSign,
      iconBg: 'bg-accent-blue/10 text-accent-blue',
      source: 'userShares × Share Price',
    },
    {
      label: 'User Cost Basis',
      value: metrics.investedAssetsUSD,
      subtitle: 'On-chain Recorded Capital',
      icon: Wallet,
      iconBg: 'bg-accent-emerald/10 text-accent-emerald',
      source: 'UnifyVaultController',
    },
    {
      label: 'Net Profit / Loss (PNL)',
      value: metrics.pnlUSD,
      subtitle: `${metrics.pnlPercentage} (${metrics.isProfitable ? 'Net Growth' : 'Capital Loss'})`,
      isPositive: metrics.isProfitable,
      icon: TrendingUp,
      iconBg: metrics.isProfitable
        ? 'bg-accent-emerald/10 text-accent-emerald'
        : 'bg-accent-rose/10 text-accent-rose',
      source: 'Holding Value − Cost Basis',
    },
    {
      label: 'Average Entry Price',
      value: metrics.averageEntryPriceUSD,
      subtitle: 'Per Index Share ($/Share)',
      icon: Activity,
      iconBg: 'bg-accent-cyan/10 text-accent-cyan',
      source: 'Cost Basis ÷ Shares Owned',
    },
    {
      label: 'Protocol Ownership Share',
      value: metrics.ownershipPercentage,
      subtitle: 'Share of Total Pool Supply',
      icon: PieChart,
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      source: 'User Shares ÷ Total Supply',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-accent-blue" />
          <h2 className="text-lg font-bold text-white tracking-tight">User Portfolio Analytics</h2>
        </div>
        <div className="text-xs text-slate-400 font-mono flex items-center space-x-1 bg-surface px-3 py-1 rounded-xl border border-border-subtle">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time On-Chain Accounting</span>
        </div>
      </div>

      {/* Streamlined Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card
              key={idx}
              glow
              className="relative group overflow-hidden p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">{item.label}</span>
                  <div className={`p-2 rounded-xl ${item.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xl font-bold text-white tracking-tight font-mono">
                    {metrics.isLoading ? (
                      <div className="h-7 w-28 bg-slate-800 rounded animate-pulse" />
                    ) : (
                      item.value
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-400">
                    {item.isPositive !== undefined &&
                      (item.isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-accent-emerald inline" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-accent-rose inline" />
                      ))}
                    <span
                      className={
                        item.isPositive !== undefined
                          ? item.isPositive
                            ? 'text-accent-emerald'
                            : 'text-accent-rose'
                          : 'text-slate-400'
                      }
                    >
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Source Footnote */}
              <div className="mt-4 pt-2.5 border-t border-border-subtle/60 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center space-x-1">
                  <Info className="w-3 h-3 text-slate-500" />
                  <span>Source</span>
                </div>
                <span className="font-mono text-[9px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-border-subtle/80 truncate max-w-[150px]">
                  {item.source}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
