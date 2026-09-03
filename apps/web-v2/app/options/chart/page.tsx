'use client';

import React from 'react';
import { CandlestickChart } from '../../../components/options/CandlestickChart';
import { useOptionsProtocol } from '../../../hooks/useOptionsProtocol';
import Link from 'next/link';
import { Info, SlidersHorizontal } from 'lucide-react';

export default function OptionsChartPage() {
  const { selectedOption } = useOptionsProtocol();

  return (
    <div className="space-y-4 font-mono">
      {/* Index Spot Chart Component */}
      <CandlestickChart />

      {/* Individual Option Contract Chart Section with Empty State Notice */}
      <div className="p-5 rounded-2xl bg-surface border-2 border-black dark:border-white/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500" />
            Selected Strike History:{' '}
            {selectedOption ? `${selectedOption.strike} ${selectedOption.type}` : 'None Selected'}
          </h3>
          {selectedOption && (
            <Link
              href="/options/trade"
              className="text-xs font-black text-[#5f8f00] dark:text-[#BFFF00] hover:underline flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Trade Contract →
            </Link>
          )}
        </div>

        <div className="p-8 rounded-xl bg-background border border-border-subtle flex flex-col items-center justify-center text-center space-y-2">
          <div className="text-sm font-black text-foreground">OPTION PRICE HISTORY</div>
          <p className="text-xs text-muted-foreground max-w-md">
            Historical OHLC candle data for individual strike contracts is not available yet. Live
            Black-Scholes premium, Delta, and IV remain active and tradable.
          </p>
          {selectedOption && (
            <div className="flex items-center gap-4 text-xs font-black text-foreground pt-2">
              <span>Live Premium: {selectedOption.premiumUvbe.toFixed(2)} UVBE</span>
              <span>Delta: {selectedOption.delta.toFixed(2)}</span>
              <span>IV: {selectedOption.iv.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
