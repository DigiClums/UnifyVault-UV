'use client';

import React from 'react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { formatNAVUSD } from '../../lib/math';
import { Skeleton } from '../ui/Skeleton';

export function ProductPreview() {
  const data = useUnifiedProtocolData();

  const hasStrategy = data.targetBtcBps !== undefined && data.targetEthBps !== undefined;

  const btcPct = hasStrategy ? data.targetBtcPercent! : '50%';
  const ethPct = hasStrategy ? data.targetEthPercent! : '50%';
  const btcNum = hasStrategy ? data.targetBtcBps! / 100 : 50;
  const ethNum = hasStrategy ? data.targetEthBps! / 100 : 50;

  return (
    <section className="px-4 sm:px-6 pb-16 sm:pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border-subtle px-5 py-5 sm:px-6 sm:py-6">
          {/* Accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BFFF00]/40 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                UVBTCETH
              </p>
              <p className="text-xs text-muted-foreground">Multi-Asset Index</p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/25">
              {data.isLoading
                ? 'Loading…'
                : `${btcNum.toFixed(0)}% BTC / ${ethNum.toFixed(0)}% ETH`}
            </span>
          </div>

          {/* NAV */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Current NAV
            </p>
            {data.isLoading ? (
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">
                {formatNAVUSD(data.sharePriceNumber)}
              </p>
            )}
          </div>

          {/* Allocation bars */}
          {data.isLoading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* BTC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#BFFF00] shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">BTC</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#5f8f00] dark:text-[#BFFF00] font-mono">
                    {btcPct}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#BFFF00] transition-all duration-700"
                    style={{ width: `${btcNum}%` }}
                  />
                </div>
              </div>

              {/* ETH */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">ETH</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 font-mono">{ethPct}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-400 transition-all duration-700"
                    style={{ width: `${ethNum}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
