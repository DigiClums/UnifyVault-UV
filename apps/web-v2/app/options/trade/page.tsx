'use client';

import React from 'react';
import { TradePanel } from '../../../components/options/TradePanel';
import { useOptionsProtocol } from '../../../hooks/useOptionsProtocol';
import Link from 'next/link';
import { Table2, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function OptionsTradePage() {
  const { selectedOption } = useOptionsProtocol();

  return (
    <div className="max-w-2xl mx-auto space-y-4 font-mono">
      {/* Top Breadcrumb / Link Back to Chain */}
      <div className="flex items-center justify-between">
        <Link
          href="/options/chain"
          className="text-xs font-black text-foreground hover:text-[#5f8f00] dark:hover:text-[#BFFF00] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Option Chain
        </Link>
        <span className="text-xs text-muted-foreground">
          {selectedOption
            ? `${selectedOption.strike} ${selectedOption.type} (${selectedOption.expiryLabel})`
            : 'Select Contract'}
        </span>
      </div>

      {/* Main Trade Execution Panel */}
      <TradePanel />

      {/* Execution Information & Security Note */}
      <div className="p-4 rounded-2xl bg-surface border border-border-subtle text-xs text-muted-foreground space-y-1.5">
        <div className="font-black text-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
          Atomic Settlement Guarantee
        </div>
        <p>
          Option premiums and writer collaterals are strictly escrowed within the protocol's
          3-bucket architecture. Expired ITM options are automatically snapshotted via 15-minute
          index TWAP.
        </p>
      </div>
    </div>
  );
}
