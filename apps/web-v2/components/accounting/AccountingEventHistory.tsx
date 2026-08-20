'use client';

import React from 'react';
import { formatEther } from 'viem';
import { TableCard } from '../ui/TableCard';
import { EmptyState } from '../ui/EmptyState';
import {
  History,
  ExternalLink,
  Loader2,
  Sparkles,
  ArrowRightLeft,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { UserAccountingState, AccountingEventItem } from '../../hooks/useUserAccounting';

export interface AccountingEventHistoryProps {
  state: UserAccountingState;
}

export function AccountingEventHistory({ state }: AccountingEventHistoryProps) {
  const formatUSD = (val: bigint): string => {
    const isNegative = val < 0n;
    const absVal = isNegative ? -val : val;
    const num = Number(formatEther(absVal));
    const formatted = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const renderEventBadge = (eventName: string) => {
    switch (eventName) {
      case 'CostBasisUpdated':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <DollarSign className="w-3 h-3" />
            <span>Cost Basis Updated</span>
          </span>
        );
      case 'RealizedPnLRecorded':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <ArrowRightLeft className="w-3 h-3" />
            <span>Realized PnL Recorded</span>
          </span>
        );
      case 'AccountingMigrated':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Sparkles className="w-3 h-3" />
            <span>Accounting Migrated</span>
          </span>
        );
      case 'EscrowStatusUpdated':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <ShieldAlert className="w-3 h-3" />
            <span>Escrow Status Changed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border-subtle">
            <span>{eventName}</span>
          </span>
        );
    }
  };

  const renderEventDetails = (item: AccountingEventItem) => {
    const args = item.args;
    if (item.eventName === 'CostBasisUpdated') {
      const basis = args.costBasisUSD ? formatUSD(args.costBasisUSD) : '$0.00';
      const shares = args.sharesBalance
        ? `${Number(formatEther(args.sharesBalance)).toFixed(4)} UVBE`
        : '0 UVBE';
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">New Basis:</span>{' '}
            <span className="font-bold text-foreground">{basis}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-sans">Share Balance:</span>{' '}
            <span className="text-muted-foreground">{shares}</span>
          </div>
        </div>
      );
    }

    if (item.eventName === 'RealizedPnLRecorded') {
      const pnl = args.realizedPnLUSD ? formatUSD(args.realizedPnLUSD) : '$0.00';
      const burned = args.sharesBurned
        ? `${Number(formatEther(args.sharesBurned)).toFixed(4)} UVBE`
        : '0 UVBE';
      const isPositive = (args.realizedPnLUSD || 0n) >= 0n;
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">PnL Recognized:</span>{' '}
            <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pnl}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground font-sans">Shares Burned:</span>{' '}
            <span className="text-muted-foreground">{burned}</span>
          </div>
        </div>
      );
    }

    if (item.eventName === 'AccountingMigrated') {
      const basis = args.costBasisUSD ? formatUSD(args.costBasisUSD) : '$0.00';
      const pnl = args.realizedPnLUSD ? formatUSD(args.realizedPnLUSD) : '$0.00';
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">Initial Basis:</span>{' '}
            <span className="font-bold text-foreground">{basis}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-sans">Initial Realized PnL:</span>{' '}
            <span className="text-muted-foreground">{pnl}</span>
          </div>
        </div>
      );
    }

    if (item.eventName === 'EscrowStatusUpdated') {
      return (
        <div className="font-mono text-[11px]">
          <span className="text-muted-foreground font-sans">Status:</span>{' '}
          <span className="font-bold text-foreground">
            {args.status ? 'TRUE (Escrow Active)' : 'FALSE (Standard)'}
          </span>
        </div>
      );
    }

    return <span className="text-muted-foreground text-xs font-mono">-</span>;
  };

  return (
    <TableCard
      title="On-Chain Accounting & Audit Activity Log"
      subtitle="Historical event logs emitted by CostBasisManagerV2 for the inspected account"
      icon={History}
    >
      {state.isLoadingEvents ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span>Querying on-chain accounting logs...</span>
        </div>
      ) : state.events.length === 0 ? (
        <EmptyState
          title="No Recent Accounting Events"
          description="No CostBasisUpdated, RealizedPnLRecorded, or AccountingMigrated events found in recent blocks for this address."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Block Number</th>
                <th className="py-3 px-4">Decoded Accounting State</th>
                <th className="py-3 px-4 text-right">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {state.events.map((item, idx) => (
                <tr
                  key={`${item.transactionHash}-${idx}`}
                  className="hover:bg-card/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-sans font-medium">
                    {renderEventBadge(item.eventName)}
                  </td>
                  <td className="py-3.5 px-4 text-foreground font-bold">
                    #{item.blockNumber.toString()}
                  </td>
                  <td className="py-3.5 px-4">{renderEventDetails(item)}</td>
                  <td className="py-3.5 px-4 text-right font-sans">
                    <a
                      href={`${state.explorerBaseUrl}/tx/${item.transactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 underline font-mono text-[11px]"
                    >
                      <span>
                        {item.transactionHash.slice(0, 8)}...{item.transactionHash.slice(-6)}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TableCard>
  );
}
