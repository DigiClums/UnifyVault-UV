'use client';

import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import {
  Droplets,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { AssetLiquidityStatus } from '../../hooks/useLiquidityAdmin';

export interface LiquidityOverviewCardsProps {
  assetStatuses: AssetLiquidityStatus[];
  explorerBaseUrl: string;
}

export function LiquidityOverviewCards({
  assetStatuses,
  explorerBaseUrl,
}: LiquidityOverviewCardsProps) {
  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {assetStatuses.map((asset) => {
        const targetPct = (Number(asset.operationalTargetBps) / 100).toFixed(1);
        const refillPct = (Number(asset.refillThresholdBps) / 100).toFixed(1);
        const excessPct = (Number(asset.excessThresholdBps) / 100).toFixed(1);

        const statusBadge = asset.needsRefill
          ? { status: 'Warning' as const, label: 'REFILL REQUIRED' }
          : asset.needsSweep
            ? { status: 'Admin' as const, label: 'EXCESS SWEEP' }
            : { status: 'Healthy' as const, label: 'OPTIMAL LIQUIDITY' };

        return (
          <div
            key={asset.symbol}
            className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl shadow-xl space-y-4"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-3">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs border ${
                    asset.symbol === 'cbBTC'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : asset.symbol === 'WETH'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {asset.symbol === 'cbBTC' ? 'BTC' : asset.symbol === 'WETH' ? 'ETH' : 'USD'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground tracking-tight">{asset.name}</h4>
                  <a
                    href={`${explorerBaseUrl}/address/${asset.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-[11px] font-mono text-muted-foreground hover:text-purple-400 transition-colors"
                  >
                    <span>{shortAddr(asset.address)}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <StatusBadge status={statusBadge.status} label={statusBadge.label} />
            </div>

            {/* Balances Breakdown */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-card/60 border border-border-subtle flex justify-between items-center">
                <span className="text-muted-foreground font-sans">Operational:</span>
                <span className="font-bold text-foreground">
                  {asset.operationalBalanceFormatted}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card/60 border border-border-subtle flex justify-between items-center">
                <span className="text-muted-foreground font-sans">Reserve:</span>
                <span className="font-bold text-purple-400">{asset.reserveBalanceFormatted}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-card/40 border border-border-subtle flex justify-between items-center">
                <span className="text-muted-foreground font-sans font-semibold">
                  Total Liquidity:
                </span>
                <span className="font-bold text-cyan-400">{asset.totalBalanceFormatted}</span>
              </div>
            </div>

            {/* Thresholds Badges */}
            <div className="p-3 rounded-xl bg-card/40 border border-border-subtle text-[11px] space-y-1.5 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-sans">Target Operational:</span>
                <span className="font-bold text-foreground">
                  {targetPct}% ({asset.operationalTargetBps.toString()} BPS)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-sans">Refill Trigger:</span>
                <span className="text-amber-400 font-bold">
                  &lt; {refillPct}% ({asset.refillThresholdBps.toString()} BPS)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-sans">Sweep Trigger:</span>
                <span className="text-purple-400 font-bold">
                  &gt; {excessPct}% ({asset.excessThresholdBps.toString()} BPS)
                </span>
              </div>
            </div>

            {/* Assessment Action Callout */}
            {(asset.needsRefill || asset.needsSweep) && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  asset.needsRefill
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  {asset.needsRefill ? (
                    <ArrowDownCircle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 text-purple-400" />
                  )}
                  <span>{asset.needsRefill ? 'Refill Deficit:' : 'Sweep Surplus:'}</span>
                </div>
                <span className="font-mono">{asset.actionAmountFormatted}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
