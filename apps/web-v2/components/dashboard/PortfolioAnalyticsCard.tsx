'use client';

import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Vault,
} from 'lucide-react';
import { Card } from '../common/Card';
import { DashboardMetrics } from '../../types';

interface PortfolioAnalyticsCardProps {
  metrics: DashboardMetrics;
}

export function PortfolioAnalyticsCard({ metrics }: PortfolioAnalyticsCardProps) {
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);

  const items = [
    {
      label: 'Position Value',
      value: metrics.currentValueUSD,
      subtitle: `${metrics.userSharesBalance} UVBE Shares`,
      icon: DollarSign,
      iconBg: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00]',
      source: 'User Shares × Share Price',
    },
    {
      label: 'Vault TVL (Protocol Total)',
      value: metrics.totalPortfolioValueUSD,
      subtitle: 'Total Reserve Assets',
      icon: Vault,
      iconBg: 'bg-card text-foreground border border-border-subtle',
      source: 'Sum of cbBTC + WETH + USDC Reserves',
    },
    {
      label: 'User Cost Basis',
      value: metrics.investedAssetsUSD,
      subtitle: 'On-Chain Recorded Capital',
      icon: Wallet,
      iconBg: 'bg-card text-foreground border border-border-subtle',
      source: 'CostBasisManager',
    },
    {
      label: 'Portfolio PnL (Unrealized)',
      value: metrics.pnlUSD,
      subtitle: `${metrics.pnlPercentage} (${metrics.isProfitable ? 'Unrealized Gain' : 'Unrealized Loss'})`,
      isPositive: metrics.isProfitable,
      icon: TrendingUp,
      iconBg: metrics.isProfitable
        ? 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00]'
        : 'bg-rose-500/10 text-rose-500',
      source: 'Position Value − Cost Basis',
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
    <div className="space-y-2.5 sm:space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border-subtle">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
          <h2 className="text-sm sm:text-lg font-black text-foreground tracking-tight">
            Portfolio Analytics
          </h2>
        </div>

        <button
          onClick={() => setShowCalculationDetails(!showCalculationDetails)}
          className="text-[10px] text-muted-foreground hover:text-[#5f8f00] dark:hover:text-[#BFFF00] font-mono flex items-center space-x-1 bg-surface px-2 py-0.5 rounded-lg border border-border-subtle transition-colors cursor-pointer"
        >
          <span>{showCalculationDetails ? 'Hide Formulas' : 'How calculated'}</span>
          {showCalculationDetails ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Streamlined Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card
              key={idx}
              glow
              className="relative group overflow-hidden p-3 sm:p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
                    {item.label}
                  </span>
                  <div className={`p-1 rounded-lg ${item.iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-base sm:text-xl font-black text-foreground tracking-tight font-mono">
                    {metrics.isLoading ? (
                      <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                    ) : (
                      item.value
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] font-semibold text-muted-foreground">
                    {item.isPositive !== undefined &&
                      (item.isPositive ? (
                        <ArrowUpRight className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00] inline" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-rose-500 inline" />
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
              {showCalculationDetails && (
                <div className="mt-2 pt-1.5 border-t border-border-subtle/50 text-[9px] font-mono text-muted-foreground/80 flex items-center justify-between">
                  <span>{item.source}</span>
                  <span className="text-[#BFFF00]/80">Verified</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
