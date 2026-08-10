'use client';

import React from 'react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { formatNAVUSD } from '../../lib/math';
import { Skeleton } from '../ui/Skeleton';

export function ProductPreview() {
  const data = useUnifiedProtocolData();

  const hasStrategy = data.targetBtcBps !== undefined && data.targetEthBps !== undefined;

  const btcPct = hasStrategy ? data.targetBtcPercent! : null;
  const ethPct = hasStrategy ? data.targetEthPercent! : null;
  const btcNum = hasStrategy ? data.targetBtcBps! / 100 : 0;
  const ethNum = hasStrategy ? data.targetEthBps! / 100 : 0;

  return (
    <section className="px-4 sm:px-6 pb-16 sm:pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800/40 px-5 py-5 sm:px-6 sm:py-6">
          {/* Accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/40 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
                UVBTCETH
              </p>
              <p className="text-xs text-slate-400">Multi-Asset Index</p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {data.isLoading
                ? 'Loading…'
                : hasStrategy
                  ? `${btcNum.toFixed(0)}% BTC / ${ethNum.toFixed(0)}% ETH`
                  : '—'}
            </span>
          </div>

          {/* NAV */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
              Current NAV
            </p>
            {data.isLoading ? (
              <div className="h-8 w-32 bg-slate-800 rounded animate-pulse" />
            ) : (
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
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
          ) : hasStrategy ? (
            <div className="space-y-2.5">
              {/* BTC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-white">BTC</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-400 font-mono">{btcPct}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-700"
                    style={{ width: `${btcNum}%` }}
                  />
                </div>
              </div>

              {/* ETH */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-white">ETH</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-400 font-mono">{ethPct}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${ethNum}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">
              Strategy allocation unavailable
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
