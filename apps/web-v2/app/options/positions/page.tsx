'use client';

import React from 'react';
import { PositionsAndMargin } from '../../../components/options/PositionsAndMargin';
import Link from 'next/link';
import { Table2, SlidersHorizontal } from 'lucide-react';

export default function OptionsPositionsPage() {
  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner / Navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-black uppercase tracking-wider text-foreground">
          Options Portfolio & Margin Desk
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/options/chain"
            className="px-3 py-1.5 rounded-xl bg-surface hover:bg-muted text-foreground border border-border-subtle text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Table2 className="w-3.5 h-3.5" /> Option Chain
          </Link>
          <Link
            href="/options/trade"
            className="px-3 py-1.5 rounded-xl bg-[#BFFF00] text-black border border-black text-xs font-black shadow-sm transition-colors flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Trade
          </Link>
        </div>
      </div>

      <PositionsAndMargin />
    </div>
  );
}
