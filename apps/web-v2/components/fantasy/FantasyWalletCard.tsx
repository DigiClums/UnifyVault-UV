'use client';

import React from 'react';
import { useFantasy } from '../../lib/fantasy/fantasyStore';
import { Sparkles, Wallet, Lock, Trophy, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface FantasyWalletCardProps {
  onEnterContestClick?: () => void;
}

export function FantasyWalletCard({ onEnterContestClick }: FantasyWalletCardProps) {
  const { wallet } = useFantasy();

  return (
    <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#BFFF00]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#BFFF00] text-black border border-black shadow-[2px_2px_0_#000]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  UVBE Fantasy Wallet
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  DEMO MODE
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Mock contest credits & winnings powered by existing UVBE ecosystem.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-black/50 border border-black/10 dark:border-white/10">
              <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground mb-0.5">
                <Wallet className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" />
                <span>Available</span>
              </div>
              <div className="text-sm sm:text-lg font-black font-mono text-foreground">
                {wallet.availableUVBE.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                <span className="text-[10px] sm:text-xs text-muted-foreground ml-1 font-sans">
                  UVBE
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-black/50 border border-black/10 dark:border-white/10">
              <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground mb-0.5">
                <Lock className="w-3 h-3 text-amber-500" />
                <span>Locked in Play</span>
              </div>
              <div className="text-sm sm:text-lg font-black font-mono text-foreground">
                {wallet.fantasyLockedUVBE.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                <span className="text-[10px] sm:text-xs text-muted-foreground ml-1 font-sans">
                  UVBE
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-black/50 border border-black/10 dark:border-white/10">
              <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground mb-0.5">
                <Trophy className="w-3 h-3 text-emerald-500" />
                <span>Rewards Won</span>
              </div>
              <div className="text-sm sm:text-lg font-black font-mono text-foreground text-emerald-600 dark:text-emerald-400">
                +{wallet.fantasyRewardsUVBE.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                <span className="text-[10px] sm:text-xs text-muted-foreground ml-1 font-sans">
                  UVBE
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-end">
          {onEnterContestClick ? (
            <button
              onClick={onEnterContestClick}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0_#000] active:scale-95 transition-all cursor-pointer"
            >
              <span>Enter Contest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href="/fantasy/matches"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0_#000] active:scale-95 transition-all cursor-pointer"
            >
              <span>Enter Contest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            href="/fantasy/history"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card hover:bg-card-hover text-foreground text-xs font-bold border-2 border-black dark:border-white/20 shadow-[2px_2px_0_#000] dark:shadow-none active:scale-95 transition-all"
          >
            <span>View Activity</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
