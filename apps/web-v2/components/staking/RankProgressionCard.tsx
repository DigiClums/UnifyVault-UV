'use client';

import React from 'react';
import { Award, CheckCircle2, ChevronRight, Lock, Sparkles, TrendingUp, Users } from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking, RANK_REQUIREMENTS } from '../../hooks/useStaking';

export function RankProgressionCard() {
  const { permanentStake, activeDirectCount, teamVolume, currentRank, rankDetails } = useStaking();

  const nextRank = rankDetails.next;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#8B5CF6] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-500" />
            Deterministic Rank Progression
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Achieve higher tiers by growing your personal stake, active direct partners, and team
            volume.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
            Current Status
          </span>
          <div className="text-sm font-mono font-black text-violet-600 dark:text-violet-400">
            {rankDetails.rankName} (Tier {currentRank})
          </div>
        </div>
      </div>

      {/* Next Rank Progress Box */}
      {nextRank ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-black dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-800 dark:text-slate-200">
              Progress to {nextRank.name} (Tier {nextRank.rank})
            </span>
            <span className="text-violet-600 dark:text-violet-400 font-mono">
              Milestone Reward: +
              {Number(formatUnits(nextRank.milestoneReward, 18)).toLocaleString()} UVBE
            </span>
          </div>

          {/* 1. Personal Stake Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Personal Stake
              </span>
              <span>
                {Number(formatUnits(permanentStake, 18)).toLocaleString()} /{' '}
                {Number(formatUnits(nextRank.personalStake, 18)).toLocaleString()} UVBE (
                {rankDetails.stakeProgress}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#BFFF00] transition-all duration-300"
                style={{ width: `${rankDetails.stakeProgress}%` }}
              />
            </div>
          </div>

          {/* 2. Active Directs Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" /> Active Directs (≥50 UVBE)
              </span>
              <span>
                {activeDirectCount} / {nextRank.activeDirects} partners (
                {rankDetails.directsProgress}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${rankDetails.directsProgress}%` }}
              />
            </div>
          </div>

          {/* 3. Team Volume Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 10-Gen Team Volume
              </span>
              <span>
                {Number(formatUnits(teamVolume, 18)).toLocaleString()} /{' '}
                {Number(formatUnits(nextRank.teamVolume, 18)).toLocaleString()} UVBE (
                {rankDetails.volumeProgress}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-300"
                style={{ width: `${rankDetails.volumeProgress}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 text-center font-bold text-xs">
          🏆 Maximum Crown Ambassador rank achieved! You hold 10 DAO Leadership Pool shares.
        </div>
      )}

      {/* Rank Tiers Overview Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-3.5 py-2">Rank Tier</th>
              <th className="px-3.5 py-2">Personal Stake</th>
              <th className="px-3.5 py-2">Active Directs</th>
              <th className="px-3.5 py-2">Team Volume</th>
              <th className="px-3.5 py-2">Milestone Reward</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono text-[11px]">
            {RANK_REQUIREMENTS.slice(1).map((r) => {
              const isAchieved = currentRank >= r.rank;
              return (
                <tr
                  key={r.rank}
                  className={`transition-colors ${
                    isAchieved
                      ? 'bg-[#BFFF00]/5 dark:bg-[#BFFF00]/10 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <td className="px-3.5 py-2 font-sans font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    {isAchieved && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    {r.name}
                  </td>
                  <td className="px-3.5 py-2">
                    {Number(formatUnits(r.personalStake, 18)).toLocaleString()} UVBE
                  </td>
                  <td className="px-3.5 py-2">{r.activeDirects} Directs</td>
                  <td className="px-3.5 py-2">
                    {Number(formatUnits(r.teamVolume, 18)).toLocaleString()} UVBE
                  </td>
                  <td className="px-3.5 py-2 font-black text-violet-600 dark:text-violet-400">
                    +{Number(formatUnits(r.milestoneReward, 18)).toLocaleString()} UVBE
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
