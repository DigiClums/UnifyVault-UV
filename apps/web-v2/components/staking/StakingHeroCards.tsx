'use client';

import React from 'react';
import { ShieldCheck, Award, Sparkles, Lock, TrendingUp, Users } from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking } from '../../hooks/useStaking';

export function StakingHeroCards() {
  const { permanentStake, rewards, isUserActive, rankDetails, totalPermanentStaked, isLoading } =
    useStaking();

  const formattedPermStake = Number(formatUnits(permanentStake, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  const formattedClaimable = Number(formatUnits(rewards.totalClaimable, 18)).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    },
  );

  const formattedTotalVaultStake = Number(formatUnits(totalPermanentStaked, 18)).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Permanent Staked Principal */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-4 sm:p-5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#BFFF00]" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-black dark:text-[#BFFF00]" />
            Active Staked
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#BFFF00]/20 text-black dark:text-[#BFFF00] border border-[#BFFF00]/40">
            18% APY Active
          </span>
        </div>
        {isLoading ? (
          <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-950 dark:text-white">
              {formattedPermStake} <span className="text-xs font-bold text-slate-500">UVBE</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Protocol Total: {formattedTotalVaultStake} UVBE
            </p>
          </div>
        )}
      </div>

      {/* 2. Total Claimable Rewards */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-4 sm:p-5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#3B82F6]" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Claimable Rewards
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            18% APY Active
          </span>
        </div>
        {isLoading ? (
          <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-950 dark:text-white">
              {formattedClaimable} <span className="text-xs font-bold text-slate-500">UVBE</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Accruing continuously per second
            </p>
          </div>
        )}
      </div>

      {/* 3. Active Direct Status */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-4 sm:p-5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <div
          className={`absolute inset-x-0 top-0 h-1.5 ${isUserActive ? 'bg-[#10B981]' : 'bg-slate-400'}`}
        />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Active Direct Status
          </span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
              isUserActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isUserActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
            />
            {isUserActive ? 'QUALIFIED' : 'INACTIVE'}
          </span>
        </div>
        {isLoading ? (
          <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-950 dark:text-white">
              {isUserActive ? 'Active Direct' : 'Needs ≥ 50 UVBE'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {isUserActive
                ? 'Qualifies uplines for Gen commissions'
                : 'Stake min 50 UVBE to activate'}
            </p>
          </div>
        )}
      </div>

      {/* 4. Current Rank Tier */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-4 sm:p-5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#8B5CF6]" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-violet-500" />
            Current Rank
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30">
            Tier {rankDetails.current.rank} / 6
          </span>
        </div>
        {isLoading ? (
          <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-950 dark:text-white">
              {rankDetails.rankName}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {rankDetails.next ? `Next: ${rankDetails.next.name}` : 'Max Rank Achieved'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
