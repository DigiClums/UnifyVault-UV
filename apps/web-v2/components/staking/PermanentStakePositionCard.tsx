'use client';

import React from 'react';
import {
  Lock,
  ShieldCheck,
  Calendar,
  Layers,
  Award,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking, MIN_ACTIVE_STAKE } from '../../hooks/useStaking';

export function PermanentStakePositionCard() {
  const {
    permanentStake,
    stakeCount,
    initialStakeDate,
    isUserActive,
    currentRank,
    rankDetails,
    lifetimeCapInfo,
    dynamicApy,
    estimatedAnnualReward,
    isLoading,
  } = useStaking();

  const formattedPermStake = Number(formatUnits(permanentStake, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  const formattedEstReward = Number(formatUnits(estimatedAnnualReward, 18)).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 4 },
  );

  const formattedMinActive = Number(formatUnits(MIN_ACTIVE_STAKE, 18)).toFixed(1);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-4 sm:p-5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.85)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-black dark:text-[#BFFF00]" />
              Your Staked Position
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
              Perpetual
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Protocol-owned capital backing continuous dynamic yield and affiliate rights.
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block">
            Status
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              permanentStake > 0n
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                permanentStake > 0n ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {permanentStake > 0n ? 'ACTIVE' : 'NO STAKE'}
          </span>
        </div>
      </div>

      {/* Grid of Position Attributes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. Protocol-Owned Amount Associated with User */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Your Capital</span>
          </div>
          <div className="text-lg font-mono font-black text-slate-950 dark:text-white">
            {formattedPermStake} <span className="text-xs text-slate-500">UVBE</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Net 95% in vault
          </p>
        </div>

        {/* 2. Stake History & Initial Date */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-500" />
            <span>Inception</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-900 dark:text-white pt-1 truncate">
            {initialStakeDate
              ? initialStakeDate.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Events: {stakeCount}
          </p>
        </div>

        {/* 3. Referral Qualification Status */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>MLM Rights</span>
          </div>
          <div className="text-xs font-mono font-black flex items-center gap-1 pt-1 truncate">
            {isUserActive ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Qualified
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                ≥{formattedMinActive} UVBE req
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {isUserActive ? '10 Tiers Active' : 'Min 50 stake'}
          </p>
        </div>

        {/* 4. Current Dynamic Yield */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Est. Yield</span>
          </div>
          <div className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
            ~{formattedEstReward} <span className="text-xs text-slate-500">UVBE/yr</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Rate: {dynamicApy}% APY
          </p>
        </div>
      </div>

      {/* Lifetime Return Cap Indicator */}
      {lifetimeCapInfo.isCapped && (
        <div
          className={`p-4 rounded-xl border space-y-2.5 ${
            lifetimeCapInfo.isCapReached
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck
                className={`w-4 h-4 ${
                  lifetimeCapInfo.isCapReached
                    ? 'text-amber-500'
                    : lifetimeCapInfo.hasUnlocked3x
                      ? 'text-emerald-500'
                      : 'text-blue-500'
                }`}
              />
              <span>
                {lifetimeCapInfo.hasUnlocked3x
                  ? '3× Referral Lifetime Cap'
                  : '2× Passive Lifetime Cap'}
              </span>
            </span>
            <span className="font-mono text-xs">
              {Number(formatUnits(lifetimeCapInfo.totalEarned, 18)).toFixed(2)} /{' '}
              {Number(formatUnits(lifetimeCapInfo.maxEarnings, 18)).toFixed(2)} UVBE (
              {lifetimeCapInfo.progressPercent}%)
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                lifetimeCapInfo.isCapReached
                  ? 'bg-amber-500'
                  : lifetimeCapInfo.hasUnlocked3x
                    ? 'bg-emerald-500'
                    : 'bg-[#BFFF00]'
              }`}
              style={{ width: `${lifetimeCapInfo.progressPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {lifetimeCapInfo.isCapReached ? (
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {!lifetimeCapInfo.hasUnlocked3x
                  ? '2× Cap reached. Refer 1 partner (≥50 UVBE) to unlock 3× cap, or deposit new principal.'
                  : '3× Cap reached. Deposit new principal to expand your lifetime cap.'}
              </span>
            ) : (
              <span>
                {!lifetimeCapInfo.hasUnlocked3x
                  ? 'Passive 2× Cap. Refer 1 partner (≥50 UVBE) to unlock 3× Lifetime Cap.'
                  : `3× Cap Unlocked (Max: ${Number(formatUnits(lifetimeCapInfo.maxEarnings, 18)).toFixed(2)} UVBE).`}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Protocol Information */}
      <div className="p-3 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 text-xs flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-[#BFFF00] shrink-0" />
        <div className="text-slate-700 dark:text-slate-300">
          Permanent vault capital generates dynamic APY, 10-tier affiliate rewards, and DAO
          leadership pool distributions with 0% fee compound restaking.
        </div>
      </div>
    </div>
  );
}
