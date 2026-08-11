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
      subtitle: `${metrics.userSharesBalance} UVBE`,
      icon: DollarSign,
      iconBg: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00]',
      source: 'userShares × Share Price',
    },
    {
      label: 'User Cost Basis',
      value: metrics.investedAssetsUSD,
      subtitle: 'On-chain Recorded Capital',
      icon: Wallet,
      iconBg: 'bg-card text-foreground border border-border-subtle',
      source: 'UnifyVaultController',
    },
    {
      label: 'Net Profit / Loss (PNL)',
      value: metrics.pnlUSD,
      subtitle: `${metrics.pnlPercentage} (${metrics.isProfitable ? 'Net Growth' : 'Capital Loss'})`,
      isPositive: metrics.isProfitable,
      icon: TrendingUp,
      iconBg: metrics.isProfitable
        ? 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00]'
        : 'bg-rose-500/10 text-rose-500',
      source: 'Holding Value − Cost Basis',
    },
    {
      label: 'Average Entry Price',
      value: metrics.averageEntryPriceUSD,
      subtitle: 'Per Index Share ($/Share)',
      icon: Activity,
      iconBg: 'bg-card text-muted-foreground border border-border-subtle',
      source: 'Cost Basis ÷ Shares Owned',
    },
    {
      label: 'Protocol Ownership Share',
      value: metrics.ownershipPercentage,
      subtitle: 'Share of Total Pool Supply',
      icon: PieChart,
      iconBg: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00]',
      source: 'User Shares ÷ Total Supply',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
          <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
            User Portfolio Analytics
          </h2>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono flex items-center space-x-1 bg-surface px-2.5 py-1 rounded-lg border border-border-subtle shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#BFFF00] animate-pulse" />
          <span>Real-time On-Chain Accounting</span>
        </div>
      </div>

      {/* Streamlined Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card
              key={idx}
              glow
              className="relative group overflow-hidden p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {item.label}
                  </span>
                  <div className={`p-1.5 rounded-lg ${item.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-lg sm:text-xl font-black text-foreground tracking-tight font-mono">
                    {metrics.isLoading ? (
                      <div className="h-7 w-28 bg-muted rounded animate-pulse" />
                    ) : (
                      item.value
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] font-semibold text-muted-foreground">
                    {item.isPositive !== undefined &&
                      (item.isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00] inline" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 inline" />
                      ))}
                    <span
                      className={
                        item.isPositive !== undefined
                          ? item.isPositive
                            ? 'text-[#5f8f00] dark:text-[#BFFF00]'
                            : 'text-rose-500 dark:text-rose-400'
                          : ''
                      }
                    >
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Provenance Footnote */}
              <div className="mt-3 pt-2 border-t border-border-subtle/50 text-[10px] font-mono text-muted-foreground/80 flex items-center justify-between">
                <span>{item.source}</span>
                <span className="text-[#BFFF00]/80 opacity-0 group-hover:opacity-100 transition-opacity">
                  Verified
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
