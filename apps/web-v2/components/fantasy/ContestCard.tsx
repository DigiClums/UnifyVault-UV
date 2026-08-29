'use client';

import React from 'react';
import { ContestTier } from '../../lib/fantasy/types';
import { Trophy, Users, ShieldCheck, ArrowRight, Award } from 'lucide-react';

interface ContestCardProps {
  contest: ContestTier;
  onJoinClick?: (contest: ContestTier) => void;
  onViewDetails?: (contest: ContestTier) => void;
  userJoined?: boolean;
}

export function ContestCard({
  contest,
  onJoinClick,
  onViewDetails,
  userJoined = false,
}: ContestCardProps) {
  const percentageFilled = Math.min(
    100,
    Math.round((contest.currentParticipants / contest.maxParticipants) * 100),
  );

  return (
    <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 sm:p-5 shadow-[3px_3px_0_rgba(0,0,0,0.85)] dark:shadow-none hover:border-[#BFFF00]/50 transition-all flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black text-[#BFFF00] dark:bg-white/10 dark:text-[#BFFF00] border border-black dark:border-white/15">
            {contest.type}
          </span>

          {contest.isGuaranteed && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Guaranteed
            </span>
          )}
        </div>

        {/* Contest Name */}
        <h4 className="text-sm sm:text-base font-black text-foreground mb-3">{contest.name}</h4>

        {/* Prize Pool & Entry Fee Matrix */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5 mb-3">
          <div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase">Prize Pool</div>
            <div className="text-sm sm:text-base font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
              {contest.totalPrizePoolUVBE.toLocaleString('en-US')} UVBE
            </div>
            <div className="text-[9px] text-muted-foreground">
              1st: {contest.firstPrizeUVBE.toLocaleString('en-US')} UVBE
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-muted-foreground font-bold uppercase">Entry Fee</div>
            <div className="text-sm sm:text-base font-black font-mono text-foreground">
              {contest.entryFeeUVBE} UVBE
            </div>
            <div className="text-[9px] text-muted-foreground">
              {contest.winnerPercentage}% Winners
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#BFFF00] rounded-full transition-all duration-300"
              style={{ width: `${percentageFilled}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>{contest.maxParticipants - contest.currentParticipants} spots left</span>
            <span>
              {contest.currentParticipants}/{contest.maxParticipants} Teams
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
        {onViewDetails && (
          <button
            type="button"
            onClick={() => onViewDetails(contest)}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-foreground text-xs font-bold transition-all border border-black/10 dark:border-white/10"
          >
            Prize Breakdown
          </button>
        )}

        {userJoined ? (
          <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black text-center">
            Joined
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onJoinClick && onJoinClick(contest)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border border-black shadow-[2px_2px_0_#000] active:scale-95 transition-all cursor-pointer"
          >
            <span>Join {contest.entryFeeUVBE} UVBE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
