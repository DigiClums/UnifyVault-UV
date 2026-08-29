'use client';

import React from 'react';
import Link from 'next/link';
import { FantasyWalletCard } from '../../../components/fantasy/FantasyWalletCard';
import { FantasyHistoryView } from '../../../components/fantasy/FantasyHistoryView';
import { ArrowLeft, ShieldCheck, Sparkles, Coins, ArrowRight } from 'lucide-react';

export default function FantasyWalletPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href="/fantasy"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Fantasy Hub</span>
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Coins className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
          UVBE Fantasy Wallet Dashboard
        </h1>
      </div>

      <FantasyWalletCard />

      <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-6 shadow-[3px_3px_0_rgba(0,0,0,0.85)] dark:shadow-none space-y-3">
        <h3 className="text-base font-black text-foreground">
          Future Smart Account Settlement Architecture
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The UVBE Fantasy Cricket contract will interact seamlessly with existing UVBE tokens on
          Base. Contest prize pools are escrowed transparently and settled based on verified match
          results directly to winner wallets without custodial intermediaries.
        </p>

        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-black/40 border border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
          <span className="font-mono text-muted-foreground">Settlement Token</span>
          <span className="font-black font-mono text-foreground">Existing UVBE (Base)</span>
        </div>
      </div>

      <FantasyHistoryView />
    </div>
  );
}
