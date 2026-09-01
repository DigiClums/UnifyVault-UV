'use client';

import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { OracleAssetStatus } from '../../hooks/useOracleAdmin';

export interface OracleFeedCardProps {
  status: OracleAssetStatus;
  explorerBaseUrl: string;
}

export function OracleFeedCard({ status, explorerBaseUrl }: OracleFeedCardProps) {
  const shortAddr = (addr: string) =>
    addr === '0x0000000000000000000000000000000000000000'
      ? 'None (Disabled)'
      : `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const isConfigured = status.primaryProvider !== '0x0000000000000000000000000000000000000000';

  const deviationPercent = (Number(status.maxDeviationBps) / 100).toFixed(2);

  return (
    <div className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle/50 pb-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs border ${
              status.symbol === 'cbBTC'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : status.symbol === 'WETH'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {status.symbol === 'cbBTC' ? 'BTC' : status.symbol === 'WETH' ? 'ETH' : 'USD'}
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground tracking-tight flex items-center space-x-1.5">
              <span>{status.name}</span>
              <span className="font-mono text-muted-foreground text-xs font-normal">
                ({status.symbol})
              </span>
            </h4>
            <a
              href={`${explorerBaseUrl}/address/${status.address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 text-[11px] font-mono text-muted-foreground hover:text-purple-400 transition-colors"
            >
              <span>{shortAddr(status.address)}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <StatusBadge
            status={status.isHealthy && status.enabled ? 'Healthy' : 'Warning'}
            label={status.isHealthy && status.enabled ? 'HEALTHY' : 'BREACH / OFFLINE'}
          />
        </div>
      </div>

      {/* Main Metrics (2x2 Grid for optimal readability & zero overflow) */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-card/60 border border-border-subtle space-y-1 min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">
            Normalized Price
          </span>
          <div className="font-mono font-black text-foreground text-sm sm:text-base truncate">
            {status.priceFormatted}
          </div>
          <span className="text-[9px] text-muted-foreground font-mono truncate block">
            18 Decimals
          </span>
        </div>

        <div className="p-3 rounded-xl bg-card/60 border border-border-subtle space-y-1 min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">
            Last Valid Price
          </span>
          <div className="font-mono font-black text-cyan-400 text-sm sm:text-base truncate">
            {status.lastValidPriceFormatted}
          </div>
          <span className="text-[9px] text-muted-foreground font-mono truncate block">
            Circuit Anchor
          </span>
        </div>

        <div className="p-3 rounded-xl bg-card/60 border border-border-subtle space-y-1 min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">
            Max Deviation
          </span>
          <div className="font-mono font-black text-purple-400 text-sm sm:text-base truncate">
            {deviationPercent}%
          </div>
          <span className="text-[9px] text-muted-foreground font-mono truncate block">
            {status.maxDeviationBps.toString()} BPS Cap
          </span>
        </div>

        <div className="p-3 rounded-xl bg-card/60 border border-border-subtle space-y-1 min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">
            Heartbeat
          </span>
          <div className="font-mono font-black text-foreground text-sm sm:text-base flex items-center space-x-1 truncate">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{status.heartbeat}s</span>
          </div>
          <span className="text-[9px] text-muted-foreground truncate block">
            {(status.heartbeat / 3600).toFixed(1)}h Max Age
          </span>
        </div>
      </div>

      {/* Provider Routing Details */}
      <div className="p-3.5 rounded-xl bg-card/40 border border-border-subtle text-xs space-y-2 font-mono">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-sans font-medium">Primary Provider:</span>
          {status.primaryProvider !== '0x0000000000000000000000000000000000000000' ? (
            <a
              href={`${explorerBaseUrl}/address/${status.primaryProvider}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 font-semibold"
            >
              <span>{shortAddr(status.primaryProvider)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-sans font-medium">Fallback Provider:</span>
          {status.fallbackProvider !== '0x0000000000000000000000000000000000000000' ? (
            <a
              href={`${explorerBaseUrl}/address/${status.fallbackProvider}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              <span>{shortAddr(status.fallbackProvider)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-muted-foreground">None (Direct Revert)</span>
          )}
        </div>

        {status.chainlinkFeedAddress &&
          status.chainlinkFeedAddress !== '0x0000000000000000000000000000000000000000' && (
            <div className="flex justify-between items-center border-t border-border-subtle/50 pt-1.5">
              <span className="text-muted-foreground font-sans font-medium">
                Chainlink Aggregator:
              </span>
              <a
                href={`${explorerBaseUrl}/address/${status.chainlinkFeedAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <span>{shortAddr(status.chainlinkFeedAddress)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
      </div>
    </div>
  );
}
