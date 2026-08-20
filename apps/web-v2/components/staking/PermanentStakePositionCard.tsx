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
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_rgba(0,0,0,0.85)] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-black dark:text-[#BFFF00]" />
              Your Staked Position
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
              Perpetual Yield
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Protocol-owned capital backing continuous dynamic yield, rank tier qualification, and
            affiliate commission rights.
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Staking Status
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
            {permanentStake > 0n ? 'ACTIVE POSITION' : 'NO STAKE RECORDED'}
          </span>
        </div>
      </div>

      {/* Grid of Position Attributes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Protocol-Owned Amount Associated with User */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Protocol-Owned Capital</span>
          </div>
          <div className="text-2xl font-mono font-black text-slate-950 dark:text-white">
            {formattedPermStake} <span className="text-xs text-slate-500">UVBE</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Net 95% deposited into vault
          </p>
        </div>

        {/* 2. Stake History & Initial Date */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-500" />
            <span>Staking Inception</span>
          </div>
          <div className="text-sm font-mono font-bold text-slate-900 dark:text-white pt-1">
            {initialStakeDate
              ? initialStakeDate.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Total stake events: {stakeCount}
          </p>
        </div>

        {/* 3. Referral Qualification Status */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Referral Qualification</span>
          </div>
          <div className="text-sm font-mono font-black flex items-center gap-1.5 pt-1">
            {isUserActive ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Active Direct (≥{formattedMinActive} UVBE)
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs font-bold">
                Inactive (Requires ≥{formattedMinActive} UVBE)
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {isUserActive ? 'Active for referral tier commissions' : 'Stake min 50 UVBE to qualify'}
          </p>
        </div>

        {/* 4. Current Dynamic Yield */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Estimated Yield</span>
          </div>
          <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
            ~{formattedEstReward} <span className="text-xs text-slate-500">UVBE/yr</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            At current {dynamicApy}% Dynamic APY
          </p>
        </div>
      </div>

      {/* Perpetual Yield Information */}
      <div className="p-3.5 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 text-xs flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-[#BFFF00] shrink-0 mt-0.5" />
        <div className="text-slate-700 dark:text-slate-300">
          <strong className="text-slate-950 dark:text-white font-bold">
            Perpetual Reward Mechanism:
          </strong>{' '}
          Staked UVBE establishes a perpetual reward position in the protocol vault. All earnings,
          affiliate bonuses, and DAO rewards are claimable and restakeable anytime with 0% fees.
        </div>
      </div>
    </div>
  );
}
