'use client';

import React from 'react';
import { formatEther } from 'viem';
import { TableCard } from '../ui/TableCard';
import { StatCard } from '../ui/StatCard';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Percent,
  Clock,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { UserAccountingState } from '../../hooks/useUserAccounting';

export interface PerformanceSectionProps {
  state: UserAccountingState;
}

export function PerformanceSection({ state }: PerformanceSectionProps) {
  // Format USD amounts from 18 decimals
  const formatUSD = (val: bigint): string => {
    const isNegative = val < 0n;
    const absVal = isNegative ? -val : val;
    const num = Number(formatEther(absVal));
    const formatted = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  // Format ROI from BPS (1 BPS = 0.01%)
  const formatROI = (bps: bigint): string => {
    const numBps = Number(bps);
    const percent = numBps / 100;
    const sign = numBps > 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const investedCapitalFormatted = formatUSD(state.investedCapitalUSD);
  const currentValueFormatted = formatUSD(state.currentValueUSD);
  const netProfitFormatted = formatUSD(state.netProfitUSD);
  const roiFormatted = formatROI(state.roiBps);

  const isNetPositive = state.netProfitUSD >= 0n;
  const isRoiPositive = state.roiBps >= 0n;

  // Format holding period in days/hours
  const formatHoldingPeriod = (seconds: bigint): string => {
    if (seconds <= 0n) return '0 Days';
    const totalSec = Number(seconds);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);

    if (days > 0) return `${days} Days ${hours} Hours`;
    if (hours > 0) return `${hours} Hours ${mins} Mins`;
    return `${mins} Minutes`;
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight flex items-center space-x-2">
            <Activity className="w-5 h-5 text-accent-blue" />
            <span>Performance & Return Analytics (PerformanceManager)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Holistic portfolio performance and ROI calculations derived on-chain across protocol
            modules.
          </p>
        </div>
      </div>

      {/* Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Invested Capital"
          value={investedCapitalFormatted}
          subtitle={`${state.investedCapitalUSD.toString()} wei USD`}
          icon={DollarSign}
          glowColor="purple"
        />

        <StatCard
          title="Current Portfolio Value"
          value={currentValueFormatted}
          subtitle={`${state.currentValueUSD.toString()} wei USD`}
          icon={PieChart}
          glowColor="blue"
        />

        <StatCard
          title="Net Profit (Realized + Unrealized)"
          value={netProfitFormatted}
          subtitle={`${state.netProfitUSD.toString()} wei USD`}
          icon={isNetPositive ? TrendingUp : TrendingDown}
          glowColor={isNetPositive ? 'emerald' : 'amber'}
        />

        <StatCard
          title="Return on Investment (ROI)"
          value={roiFormatted}
          subtitle={`${state.roiBps.toString()} BPS on-chain`}
          icon={Percent}
          glowColor={isRoiPositive ? 'emerald' : 'amber'}
        />
      </div>

      {/* On-Chain Performance Struct Table */}
      <TableCard
        title="Authoritative IPerformanceManager.Performance Struct Return"
        subtitle="Direct on-chain response from PerformanceManager.performance(account)"
        icon={Activity}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Struct Field</th>
                <th className="py-3 px-4">Authoritative On-Chain Value</th>
                <th className="py-3 px-4">Formatted UI Value</th>
                <th className="py-3 px-4">Solidity Type & Decimals</th>
                <th className="py-3 px-4 text-right">Calculation Semantics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {/* currentValueUSD */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">currentValueUSD</td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.performanceStruct.currentValueUSD.toString()}
                </td>
                <td className="py-3.5 px-4 font-sans font-semibold text-accent-blue">
                  {formatUSD(state.performanceStruct.currentValueUSD)}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  uint256 (18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  (userShares * currentUVPrice) / 1e18
                </td>
              </tr>

              {/* investedCapitalUSD */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  investedCapitalUSD
                </td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.performanceStruct.investedCapitalUSD.toString()}
                </td>
                <td className="py-3.5 px-4 font-sans font-semibold text-purple-400">
                  {formatUSD(state.performanceStruct.investedCapitalUSD)}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  uint256 (18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  CostBasisManagerV2.costBasis(account)
                </td>
              </tr>

              {/* realizedPnL */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">realizedPnL</td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.performanceStruct.realizedPnL.toString()}
                </td>
                <td
                  className={`py-3.5 px-4 font-sans font-semibold ${
                    state.performanceStruct.realizedPnL >= 0n ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatUSD(state.performanceStruct.realizedPnL)}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  int256 (signed 18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  CostBasisManagerV2.realizedPnL(account)
                </td>
              </tr>

              {/* unrealizedPnL */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">unrealizedPnL</td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.performanceStruct.unrealizedPnL.toString()}
                </td>
                <td
                  className={`py-3.5 px-4 font-sans font-semibold ${
                    state.performanceStruct.unrealizedPnL >= 0n
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatUSD(state.performanceStruct.unrealizedPnL)}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  int256 (signed 18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  currentValueUSD - investedCapitalUSD
                </td>
              </tr>

              {/* netPnL */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">netPnL</td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.performanceStruct.netPnL.toString()}
                </td>
                <td
                  className={`py-3.5 px-4 font-sans font-bold ${
                    state.performanceStruct.netPnL >= 0n ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatUSD(state.performanceStruct.netPnL)}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  int256 (signed 18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  realizedPnL + unrealizedPnL
                </td>
              </tr>

              {/* roiBps */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">roiBps</td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.performanceStruct.roiBps.toString()}
                </td>
                <td
                  className={`py-3.5 px-4 font-sans font-bold ${
                    state.performanceStruct.roiBps >= 0n ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatROI(state.performanceStruct.roiBps)}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  int256 (signed basis points, 1 BPS = 0.01%)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  (netPnL * 10000) / investedCapitalUSD
                </td>
              </tr>

              {/* holdingPeriod */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">holdingPeriod</td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.performanceStruct.holdingPeriod.toString()}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  {formatHoldingPeriod(state.performanceStruct.holdingPeriod)}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  uint256 (seconds elapsed)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  block.timestamp - firstDepositTimestamp
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </TableCard>
    </div>
  );
}
