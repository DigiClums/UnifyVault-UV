'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { Skeleton } from '../ui/Skeleton';

export function StrategySection() {
  const data = useUnifiedProtocolData();
  const hasStrategy = data.targetBtcBps !== undefined && data.targetEthBps !== undefined;
  const btcPct = hasStrategy ? data.targetBtcPercent! : '50%';
  const ethPct = hasStrategy ? data.targetEthPercent! : '50%';
  const btcNum = hasStrategy ? data.targetBtcBps! / 100 : 50;
  const ethNum = hasStrategy ? data.targetEthBps! / 100 : 50;

  return (
    <section className="px-4 sm:px-6 pb-14 sm:pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="overflow-hidden bg-white/[0.025] border border-white/[0.08]">
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/[0.08]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFFF00]/80 mb-1 font-mono">
              Primary Strategy
            </p>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">UVBE</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              A multi-asset strategy designed around BTC and ETH exposure, managed through on-chain
              portfolio accounting with transparent custody.
            </p>
          </div>

          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Target Allocation
            </p>

            {data.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 bg-[#BFFF00] shrink-0" />
                      <span className="text-sm font-semibold text-white">BTC</span>
                    </div>
                    <span className="text-sm font-bold text-[#BFFF00] font-mono">{btcPct}</span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full bg-[#BFFF00] transition-all duration-700"
                      style={{ width: `${btcNum}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 bg-slate-300 shrink-0" />
                      <span className="text-sm font-semibold text-white">ETH</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200 font-mono">{ethPct}</span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full bg-slate-300 transition-all duration-700"
                      style={{ width: `${ethNum}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-white/[0.08]">
              <Link
                href="/portfolio"
                className="inline-flex items-center space-x-2 text-xs font-semibold text-[#BFFF00] hover:text-[#d7ff66] transition-colors"
              >
                <span>View Portfolio Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
