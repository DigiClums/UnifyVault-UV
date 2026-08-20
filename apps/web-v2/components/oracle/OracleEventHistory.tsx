'use client';

import React from 'react';
import { formatEther } from 'viem';
import { TableCard } from '../ui/TableCard';
import { EmptyState } from '../ui/EmptyState';
import {
  History,
  ExternalLink,
  Loader2,
  Zap,
  AlertTriangle,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import { OracleEventItem } from '../../hooks/useOracleAdmin';

export interface OracleEventHistoryProps {
  events: OracleEventItem[];
  isLoadingEvents: boolean;
  explorerBaseUrl: string;
}

export function OracleEventHistory({
  events,
  isLoadingEvents,
  explorerBaseUrl,
}: OracleEventHistoryProps) {
  const renderEventBadge = (eventName: string) => {
    switch (eventName) {
      case 'CircuitBreakerReset':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Zap className="w-3 h-3" />
            <span>Circuit Breaker Reset</span>
          </span>
        );
      case 'MaxDeviationUpdated':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldCheck className="w-3 h-3" />
            <span>Max Deviation Updated</span>
          </span>
        );
      case 'PrimaryProviderUpdated':
      case 'FallbackProviderUpdated':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Link2 className="w-3 h-3" />
            <span>{eventName}</span>
          </span>
        );
      case 'OracleFailure':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" />
            <span>Oracle Failure</span>
          </span>
        );
      case 'FeedRegistered':
      case 'FeedUpdated':
      case 'FeedRemoved':
      case 'HeartbeatUpdated':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Link2 className="w-3 h-3" />
            <span>{eventName}</span>
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

  const renderDetails = (item: OracleEventItem) => {
    const args = item.args;
    if (item.eventName === 'CircuitBreakerReset') {
      const priceFormatted = args.newPrice
        ? `$${Number(formatEther(args.newPrice)).toFixed(2)}`
        : '$0.00';
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">New Price:</span>{' '}
            <span className="font-bold text-rose-400">{priceFormatted}</span>
          </div>
        </div>
      );
    }

    if (item.eventName === 'MaxDeviationUpdated') {
      const oldBps = Number(args.oldBps || 0);
      const newBps = Number(args.newBps || 0);
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">Old:</span>{' '}
            {(oldBps / 100).toFixed(2)}% &rarr;{' '}
            <span className="text-muted-foreground font-sans">New:</span>{' '}
            <span className="font-bold text-purple-400">{(newBps / 100).toFixed(2)}%</span>
          </div>
        </div>
      );
    }

    if (item.eventName === 'OracleFailure') {
      return (
        <div className="font-mono text-[11px] text-rose-300">
          <span>Reason: {args.reason || 'Validation or Circuit Breaker failed'}</span>
        </div>
      );
    }

    if (item.eventName === 'FeedRegistered' || item.eventName === 'FeedUpdated') {
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">Feed:</span>{' '}
            <span className="text-foreground">{args.feedAddress || args.newFeedAddress}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-sans">Heartbeat:</span>{' '}
            <span className="text-foreground">{args.heartbeat || args.newHeartbeat}s</span>
          </div>
        </div>
      );
    }

    return <span className="text-muted-foreground text-xs font-mono">-</span>;
  };

  return (
    <TableCard
      title="Oracle Activity & Telemetry Audit Log"
      subtitle="Historical event logs emitted by OracleManager and ChainlinkOracleProvider"
      icon={History}
    >
      {isLoadingEvents ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span>Querying on-chain oracle logs...</span>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No Recent Oracle Events"
          description="No CircuitBreakerReset, MaxDeviationUpdated, or FeedUpdated events found in recent blocks."
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
