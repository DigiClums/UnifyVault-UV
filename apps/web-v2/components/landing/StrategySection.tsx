'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap, RefreshCw, BarChart2 } from 'lucide-react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { Skeleton } from '../ui/Skeleton';
import { TokenIcon } from '../ui/TokenIcon';

export function StrategySection() {
  const data = useUnifiedProtocolData();
  const hasStrategy = data.targetBtcBps !== undefined && data.targetEthBps !== undefined;
  const btcPct = hasStrategy ? data.targetBtcPercent! : '60%';
  const ethPct = hasStrategy ? data.targetEthPercent! : '40%';
  const btcNum = hasStrategy ? data.targetBtcBps! / 100 : 60;
  const ethNum = hasStrategy ? data.targetEthBps! / 100 : 40;
  const uvbePrice = data.sharePriceNumber || 1.022;

  return (
    <section className="px-4 sm:px-6 py-14 sm:py-20 bg-black/40 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFFF00] mb-2 font-mono">
            AUTOMATED REBALANCING
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Flagship UVBE Index Strategy
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-2">
            Target 60% cbBTC + 40% WETH ratio with automated on-chain drift mitigation.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border-2 border-black dark:border-white/15 p-6 sm:p-8 shadow-[6px_6px_0_#BFFF00] backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Allocation Meters */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold font-mono text-white/70 uppercase tracking-wider">
                  Target Composition
                </span>
                <span className="text-xs font-mono font-bold text-[#BFFF00]">
                  Rebalance Band: ±2.5%
                </span>
              </div>

              <div className="space-y-4">
                {/* cbBTC */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon symbol="cbBTC" size={24} />
                      <div>
                        <span className="text-sm font-bold text-white block">cbBTC</span>
                        <span className="text-[10px] text-white/40 font-mono">Coinbase Wrapped Bitcoin</span>
                      </div>
                    </div>
                    <span className="text-base font-black text-amber-400 font-mono">{btcPct}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${btcNum}%` }} />
                  </div>
                </div>

                {/* WETH */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon symbol="WETH" size={24} />
                      <div>
                        <span className="text-sm font-bold text-white block">WETH</span>
                        <span className="text-[10px] text-white/40 font-mono">Wrapped Ether</span>
                      </div>
                    </div>
                    <span className="text-base font-black text-blue-400 font-mono">{ethPct}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ethNum}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Key Pillars */}
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 text-[#BFFF00] shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white font-sans text-sm">No Impermanent Loss</h4>
                  <p className="text-white/60 font-sans text-xs mt-1">
                    Direct asset holding without liquidity provider divergence loss.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 text-[#BFFF00] shrink-0">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white font-sans text-sm">Dynamic NAV Settlement</h4>
                  <p className="text-white/60 font-sans text-xs mt-1">
                    Every mint/burn calculates real-time net asset value using Pyth Network feeds.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/portfolio"
                  className="w-full py-3 rounded-xl bg-[#BFFF00] text-black font-black text-xs font-sans text-center flex items-center justify-center gap-2 shadow-[3px_3px_0_#000] hover:bg-[#d0ff66] transition-all"
                >
                  <span>Explore Index Analytics</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
