'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { Skeleton } from '../ui/Skeleton';

export function StrategySection() {
  const data = useUnifiedProtocolData();

  const hasStrategy = data.targetBtcBps !== undefined && data.targetEthBps !== undefined;

  const btcPct = hasStrategy ? data.targetBtcPercent! : null;
  const ethPct = hasStrategy ? data.targetEthPercent! : null;
  const btcNum = hasStrategy ? data.targetBtcBps! / 100 : 0;
  const ethNum = hasStrategy ? data.targetEthBps! / 100 : 0;

  return (
    <section className="px-4 sm:px-6 pb-16 sm:pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/40 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800/40">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-blue/70 mb-1 font-mono">
              Primary Strategy
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">UVBTCETH</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              A multi-asset strategy designed around BTC and ETH exposure, managed through on-chain
              portfolio accounting with transparent custody.
            </p>
          </div>

          {/* Allocation */}
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Target Allocation
            </p>

            {data.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : hasStrategy ? (
              <div className="space-y-3">
                {/* BTC */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-sm font-semibold text-white">BTC</span>
                    </div>
                    <span className="text-sm font-bold text-amber-400 font-mono">{btcPct}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-700"
                      style={{ width: `${btcNum}%` }}
                    />
                  </div>
                </div>

                {/* ETH */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-white">ETH</span>
                    </div>
                    <span className="text-sm font-bold text-blue-400 font-mono">{ethPct}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
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

            {/* CTA */}
            <div className="mt-5 pt-4 border-t border-slate-800/40">
              <a
                href="https://app.unifyvault.xyz/portfolio"
                className="inline-flex items-center space-x-2 text-xs font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors"
              >
                <span>View Portfolio Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
