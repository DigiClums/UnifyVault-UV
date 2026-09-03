'use client';

import React from 'react';
import { OptionChain } from '../../../components/options/OptionChain';
import { TradePanel } from '../../../components/options/TradePanel';
import { useOptionsProtocol } from '../../../hooks/useOptionsProtocol';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';

export default function OptionChainPage() {
  const { selectedOption } = useOptionsProtocol();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Primary Option Chain Surface (Left 2 cols on Desktop) */}
      <div className="lg:col-span-2 space-y-4">
        <OptionChain />
      </div>

      {/* Sticky Execution Dock (Right 1 col on Desktop) */}
      <div className="hidden lg:block space-y-4">
        <div className="sticky top-20">
          <TradePanel />
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA for quick trade */}
      {selectedOption && (
        <div className="fixed bottom-14 left-0 right-0 z-30 p-2 sm:hidden bg-background/95 border-t-2 border-black dark:border-white/10 backdrop-blur-md">
          <Link
            href="/options/trade"
            className="w-full py-3 px-4 rounded-xl bg-[#BFFF00] text-black border-2 border-black font-black font-mono text-xs flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span>
                TRADE {selectedOption.strike} {selectedOption.type}
              </span>
            </div>
            <span>{selectedOption.premiumUvbe.toFixed(2)} UVBE →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
