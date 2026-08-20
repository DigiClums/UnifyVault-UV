'use client';

import React from 'react';
import { formatEther } from 'viem';
import { TableCard } from '../ui/TableCard';
import { StatCard } from '../ui/StatCard';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Coins,
  DollarSign,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import { UserAccountingState } from '../../hooks/useUserAccounting';

export interface CostBasisSectionProps {
  state: UserAccountingState;
}

export function CostBasisSection({ state }: CostBasisSectionProps) {
  // Format USD amounts from 18 decimals
  const formatUSD = (val: bigint): string => {
    const isNegative = val < 0n;
    const absVal = isNegative ? -val : val;
    const num = Number(formatEther(absVal));
    const formatted = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const costBasisFormatted = formatUSD(state.costBasisUSD);
  const entryPriceFormatted = formatUSD(state.averageEntryPriceUSD);
  const realizedPnLFormatted = formatUSD(state.realizedPnLUSD);
  const unrealizedPnLFormatted = formatUSD(state.unrealizedPnLUSD);

  const isRealizedPositive = state.realizedPnLUSD >= 0n;
  const isUnrealizedPositive = state.unrealizedPnLUSD >= 0n;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            <span>Cost Basis & PnL Ledger (CostBasisManagerV2)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authoritative on-chain accounting parameters tracked by UnifyVault V2 smart contracts.
          </p>
        </div>
      </div>

      {/* Cost Basis Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Cost Basis"
          value={costBasisFormatted}
          subtitle={`${state.costBasisUSD.toString()} wei USD`}
          icon={DollarSign}
          glowColor="purple"
        />

        <StatCard
          title="Average Entry Price"
          value={`${entryPriceFormatted} / UVBE`}
          subtitle={`${state.averageEntryPriceUSD.toString()} wei USD`}
          icon={Coins}
          glowColor="blue"
        />

        <StatCard
          title="Realized PnL"
          value={realizedPnLFormatted}
          subtitle={`${state.realizedPnLUSD.toString()} wei USD`}
          icon={isRealizedPositive ? TrendingUp : TrendingDown}
          glowColor={isRealizedPositive ? 'emerald' : 'amber'}
        />

        <StatCard
          title="Unrealized PnL"
          value={unrealizedPnLFormatted}
          subtitle={`${state.unrealizedPnLUSD.toString()} wei USD`}
          icon={isUnrealizedPositive ? TrendingUp : TrendingDown}
          glowColor={isUnrealizedPositive ? 'emerald' : 'amber'}
        />
      </div>

      {/* Detailed Cost Basis Breakdown Table */}
      <TableCard
        title="Authoritative Cost Basis Breakdown"
        subtitle="Detailed parameter semantics, units, and raw on-chain state values"
        icon={Layers}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Accounting Parameter</th>
                <th className="py-3 px-4">Authoritative On-Chain Value</th>
                <th className="py-3 px-4">Formatted UI Presentation</th>
                <th className="py-3 px-4">Solidity State Unit</th>
                <th className="py-3 px-4 text-right">Accounting Formula</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {/* Cost Basis */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  Active Cost Basis USD
                </td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.costBasisUSD.toString()}
                </td>
                <td className="py-3.5 px-4 font-sans font-semibold text-purple-400">
                  {costBasisFormatted}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  uint256 (18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  Σ(Deposits) - Σ(Proportional Redemptions)
                </td>
              </tr>

              {/* Entry Price */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  Average Entry Price
                </td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.averageEntryPriceUSD.toString()}
                </td>
                <td className="py-3.5 px-4 font-sans font-semibold text-cyan-400">
                  {entryPriceFormatted} / share
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  uint256 (18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  (costBasisUSD * 1e18) / userShares
                </td>
              </tr>

              {/* Realized PnL */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  Realized PnL USD
                </td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.realizedPnLUSD.toString()}
                </td>
                <td
                  className={`py-3.5 px-4 font-sans font-bold ${
                    isRealizedPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {realizedPnLFormatted}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  int256 (signed 18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  Σ(payoutValueUSD - costBasisReduction)
                </td>
              </tr>

              {/* Unrealized PnL */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  Unrealized PnL USD
                </td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.unrealizedPnLUSD.toString()}
                </td>
                <td
                  className={`py-3.5 px-4 font-sans font-bold ${
                    isUnrealizedPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {unrealizedPnLFormatted}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  int256 (signed 18 decimals USD)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  currentValueUSD - costBasisUSD
                </td>
              </tr>

              {/* First Deposit */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  First Deposit Timestamp
                </td>
                <td className="py-3.5 px-4 text-foreground font-bold">
                  {state.firstDepositTimestamp.toString()}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  {state.firstDepositTimestamp > 0n
                    ? new Date(Number(state.firstDepositTimestamp) * 1000).toISOString()
                    : 'Uninitialized'}
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  uint256 (Unix timestamp in sec)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                  Set on initial deposit; cleared on 100% redeem
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </TableCard>
    </div>
  );
}
