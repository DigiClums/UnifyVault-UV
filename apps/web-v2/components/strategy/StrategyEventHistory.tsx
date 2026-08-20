'use client';

import React from 'react';
import { TableCard } from '../ui/TableCard';
import { EmptyState } from '../ui/EmptyState';
import { History, ExternalLink, Loader2, Sliders, Layers, Trash2, PlusCircle } from 'lucide-react';
import { StrategyEventItem } from '../../hooks/useStrategyAdmin';

export interface StrategyEventHistoryProps {
  events: StrategyEventItem[];
  isLoadingEvents: boolean;
  explorerBaseUrl: string;
}

export function StrategyEventHistory({
  events,
  isLoadingEvents,
  explorerBaseUrl,
}: StrategyEventHistoryProps) {
  const renderEventBadge = (eventName: string) => {
    switch (eventName) {
      case 'StrategyRebalanced':
      case 'StrategyUpdated':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Sliders className="w-3 h-3" />
            <span>Strategy Rebalanced</span>
          </span>
        );
      case 'WeightUpdated':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Sliders className="w-3 h-3" />
            <span>Weight Updated</span>
          </span>
        );
      case 'AssetAdded':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <PlusCircle className="w-3 h-3" />
            <span>Asset Added</span>
          </span>
        );
      case 'AssetRemoved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Trash2 className="w-3 h-3" />
            <span>Asset Removed</span>
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

  const renderDetails = (item: StrategyEventItem) => {
    const args = item.args;
    if (item.eventName === 'WeightUpdated') {
      const oldBps = Number(args.oldWeight || 0);
      const newBps = Number(args.newWeight || 0);
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">Asset:</span>{' '}
            <span className="text-foreground">
              {args.asset ? `${args.asset.slice(0, 6)}...${args.asset.slice(-4)}` : '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground font-sans">Weight:</span>{' '}
            {(oldBps / 100).toFixed(2)}% &rarr;{' '}
            <span className="font-bold text-purple-400">{(newBps / 100).toFixed(2)}%</span>
          </div>
        </div>
      );
    }

    if (item.eventName === 'AssetAdded') {
      const bps = Number(args.weightBps || 0);
      return (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground font-sans">Asset:</span>{' '}
            <span className="text-foreground">
              {args.asset ? `${args.asset.slice(0, 6)}...${args.asset.slice(-4)}` : '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground font-sans">Target Weight:</span>{' '}
            <span className="font-bold text-emerald-400">{(bps / 100).toFixed(2)}%</span>
          </div>
        </div>
      );
    }

    if (item.eventName === 'AssetRemoved') {
      return (
        <div className="font-mono text-[11px]">
          <span className="text-muted-foreground font-sans">Asset:</span>{' '}
          <span className="text-rose-400">
            {args.asset ? `${args.asset.slice(0, 6)}...${args.asset.slice(-4)}` : '-'}
          </span>
        </div>
      );
    }

    if (item.eventName === 'StrategyRebalanced' || item.eventName === 'StrategyUpdated') {
      const assets = args.assets || [];
      const weights = args.newWeights || args.weightsBps || [];
      return (
        <div className="font-mono text-[11px] text-muted-foreground">
          <span>{assets.length} assets rebalanced to 10,000 BPS</span>
        </div>
      );
    }

    return <span className="text-muted-foreground text-xs font-mono">-</span>;
  };

  return (
    <TableCard
      title="Strategy & Portfolio Rebalance Audit Log"
      subtitle="Historical event logs emitted by StrategyManager on Base Sepolia"
      icon={History}
    >
      {isLoadingEvents ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span>Querying on-chain strategy logs...</span>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No Recent Strategy Events"
          description="No StrategyRebalanced, WeightUpdated, or AssetAdded events found in recent blocks."
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
