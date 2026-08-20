'use client';

import React from 'react';
import { TableCard } from '../ui/TableCard';
import { EmptyState } from '../ui/EmptyState';
import {
  History,
  ExternalLink,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { LiquidityEventItem } from '../../hooks/useLiquidityAdmin';

export interface LiquidityEventHistoryProps {
  events: LiquidityEventItem[];
  isLoadingEvents: boolean;
  explorerBaseUrl: string;
}

export function LiquidityEventHistory({
  events,
  isLoadingEvents,
  explorerBaseUrl,
}: LiquidityEventHistoryProps) {
  const renderEventBadge = (eventName: string) => {
    switch (eventName) {
      case 'OperationalLiquidityRefilled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <ArrowDownCircle className="w-3 h-3" />
            <span>Liquidity Refilled</span>
          </span>
        );
      case 'ReserveLiquiditySwept':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ArrowUpCircle className="w-3 h-3" />
            <span>Liquidity Swept</span>
          </span>
        );
      case 'ThresholdsConfigured':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Sliders className="w-3 h-3" />
            <span>Thresholds Configured</span>
          </span>
        );
      case 'RefillRequired':
      case 'ReserveSweepRequired':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" />
            <span>Threshold Triggered</span>
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

  const renderDetails = (item: LiquidityEventItem) => {
    const args = item.args;
    if (
      item.eventName === 'OperationalLiquidityRefilled' ||
      item.eventName === 'ReserveLiquiditySwept'
    ) {
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">Asset:</span>{' '}
            <span className="text-foreground">
              {args.asset ? `${args.asset.slice(0, 6)}...${args.asset.slice(-4)}` : '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground font-sans">Amount:</span>{' '}
            <span className="text-foreground font-bold">
              {args.amount ? args.amount.toString() : '0'}
            </span>
          </div>
        </div>
      );
    }

    if (item.eventName === 'ThresholdsConfigured') {
      const target = Number(args.operationalTargetBps || 0);
      const refill = Number(args.refillThresholdBps || 0);
      const excess = Number(args.excessThresholdBps || 0);
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">Target:</span>{' '}
            {(target / 100).toFixed(2)}% |{' '}
            <span className="text-muted-foreground font-sans">Refill:</span>{' '}
            {(refill / 100).toFixed(2)}% |{' '}
            <span className="text-muted-foreground font-sans">Excess:</span>{' '}
            {(excess / 100).toFixed(2)}%
          </div>
        </div>
      );
    }

    return <span className="text-muted-foreground text-xs font-mono">-</span>;
  };

  return (
    <TableCard
      title="Liquidity & Reserve Management Audit Log"
      subtitle="Historical event logs emitted by LiquidityManager on Base Sepolia"
      icon={History}
    >
      {isLoadingEvents ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span>Querying on-chain liquidity logs...</span>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No Recent Liquidity Events"
          description="No OperationalLiquidityRefilled, ReserveLiquiditySwept, or ThresholdsConfigured events found in recent blocks."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Block</th>
                <th className="py-3 px-4">Decoded Log Parameters</th>
                <th className="py-3 px-4 text-right">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {events.map((item, idx) => (
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
                  <td className="py-3.5 px-4">{renderDetails(item)}</td>
                  <td className="py-3.5 px-4 text-right font-sans">
                    <a
                      href={`${explorerBaseUrl}/tx/${item.transactionHash}`}
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
