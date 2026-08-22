'use client';

import React from 'react';
import { ShieldCheck, Award, Sparkles, Lock, TrendingUp, Users, Coins } from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking } from '../../hooks/useStaking';

export function StakingHeroCards() {
  const {
    permanentStake,
    rewards,
    isUserActive,
    rankDetails,
    totalPermanentStaked,
    availableProtocolCapital,
    dynamicApy,
    healthRatio,
    surplusCapacity,
    isLoading,
  } = useStaking();

  const formattedPermStake = Number(formatUnits(permanentStake, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  const formattedClaimable = Number(formatUnits(rewards.totalClaimable, 18)).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    },
  );

  const formattedTotalVaultStake = Number(formatUnits(totalPermanentStaked, 18)).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

  const formattedSurplus = Number(formatUnits(surplusCapacity, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* 1. Protocol-Owned Capital (User Position) */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-3.5 sm:p-4 shadow-[3px_3px_0_#000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#BFFF00]" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Lock className="w-3 h-3 text-black dark:text-[#BFFF00]" />
            Your Stake
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
            Perpetual
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
              Earning continuous dynamic staking rewards
            </p>
          </div>
        )}
      </div>

      {/* 2. Live Dynamic APY & Health */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-3.5 sm:p-4 shadow-[3px_3px_0_#000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#10B981]" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            Dynamic APY
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Capacity-Backed
          </span>
        </div>
        {isLoading ? (
          <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {dynamicApy}% <span className="text-xs font-bold text-slate-500">APY</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Surplus: {formattedSurplus} UVBE
            </p>
          </div>
        )}
      </div>

      {/* 3. Total Claimable Rewards */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-3.5 sm:p-4 shadow-[3px_3px_0_#000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#3B82F6]" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-500" />
            Claimable
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            Yield + MLM
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
              Claim or restake at 0% fee
            </p>
          </div>
        )}
      </div>

      {/* 4. Total Protocol Capital Staked */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-3.5 sm:p-4 shadow-[3px_3px_0_#000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#8B5CF6]" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Coins className="w-3 h-3 text-violet-500" />
            Vault Staked
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30">
            Tier {rankDetails.current.rank}
          </span>
        </div>
        {isLoading ? (
          <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-950 dark:text-white">
              {formattedTotalVaultStake}{' '}
              <span className="text-xs font-bold text-slate-500">UVBE</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Total active protocol stake
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
