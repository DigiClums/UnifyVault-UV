'use client';

import React from 'react';
import { FlashPulseArena } from '../../components/predict/FlashPulseArena';
import { Zap, Flame, ShieldAlert, Sparkles } from 'lucide-react';

export default function PredictPage() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black dark:border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span>FlashPulse 30s</span>
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black bg-[#BFFF00] text-black border border-black animate-pulse">
              <Flame className="w-3 h-3 text-red-600" />
              LIVE ARENA
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            High-speed 30-second Pyth Oracle Micro-Predictions • Up to 10x Parimutuel Payouts
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1 rounded-xl bg-card border-2 border-black dark:border-white/15 shadow-2xs text-muted-foreground">
            Settlement: <span className="font-bold text-[#5f8f00] dark:text-[#BFFF00]">Instant UVBE</span>
          </div>
        </div>
      </div>

      {/* Main FlashPulse Arena */}
      <FlashPulseArena />
    </div>
  );
}
