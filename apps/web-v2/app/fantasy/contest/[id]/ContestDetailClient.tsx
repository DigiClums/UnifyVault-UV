'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFantasy } from '../../../../lib/fantasy/fantasyStore';
import { PrizeBreakdownModal } from '../../../../components/fantasy/PrizeBreakdownModal';
import { LeaderboardTable } from '../../../../components/fantasy/LeaderboardTable';
import { ArrowLeft, Trophy, Users, ShieldCheck, ArrowRight, Award } from 'lucide-react';

export default function ContestDetailClient({ contestId }: { contestId: string }) {
  const { getContestById, getMatchById, joinedContests } = useFantasy();
  const contest = getContestById(contestId);
  const match = contest ? getMatchById(contest.matchId) : undefined;
  const isJoined = joinedContests.some((jc) => jc.contestId === contestId);

  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  if (!contest) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-black text-foreground">Contest Not Found</h2>
        <Link
          href="/fantasy"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Fantasy Hub</span>
        </Link>
      </div>
    );
  }

  const isUpcoming = match?.status === 'upcoming' || (match?.status as any) === 'UPCOMING';
  const spotsLeft = contest.maxParticipants - contest.currentParticipants;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href={match ? `/fantasy/match/${match.id}` : '/fantasy/matches'}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Match Contests</span>
      </Link>

      <div className="p-5 sm:p-6 rounded-3xl bg-card border-2 border-black dark:border-white/15 shadow-[5px_5px_0_#BFFF00]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#BFFF00] text-black border border-black shadow-[1px_1px_0_#000]">
                {contest.type}
              </span>
              {contest.isGuaranteed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Guaranteed
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">{contest.name}</h1>
            {match && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {match.title} &bull; {match.teamA?.code || 'IND'} vs {match.teamB?.code || 'AUS'}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs font-semibold text-muted-foreground">Total Prize Pool</div>
            <div className="text-2xl sm:text-3xl font-black text-[#5f8f00] dark:text-[#BFFF00] font-mono">
              {contest.totalPrizePoolUVBE.toLocaleString()} UVBE
            </div>
            <div className="text-xs font-mono font-bold text-muted-foreground">
              Entry: {contest.entryFeeUVBE} UVBE
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b-2 border-black dark:border-white/10 text-center">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border">
            <div className="text-[11px] text-muted-foreground">1st Prize</div>
            <div className="text-sm sm:text-base font-black font-mono text-foreground">
              {contest.firstPrizeUVBE.toLocaleString()} UVBE
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-muted/40 border border-border">
            <div className="text-[11px] text-muted-foreground">Winners</div>
            <div className="text-sm sm:text-base font-black text-foreground">
              {contest.winnerPercentage}%
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-muted/40 border border-border">
            <div className="text-[11px] text-muted-foreground">Max Teams</div>
            <div className="text-sm sm:text-base font-black text-foreground">
              Up to {contest.maxTeamsPerUser}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-muted/40 border border-border">
            <div className="text-[11px] text-muted-foreground">Spots Left</div>
            <div className="text-sm sm:text-base font-black text-foreground">
              {spotsLeft.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowBreakdownModal(true)}
            className="px-4 py-2.5 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-bold border-2 border-black dark:border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_#000]"
          >
            <Trophy className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>View Full Prize Table</span>
          </button>

          {match && isUpcoming && (
            <Link
              href={`/fantasy/create-team/${match.id}?autoContestId=${contest.id}`}
              className="px-6 py-2.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black font-black text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0_#000] flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>
                {isJoined
                  ? 'Join With Another Team'
                  : `Join Contest (${contest.entryFeeUVBE} UVBE)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
          <span>Contest Leaderboard</span>
        </h2>
        <LeaderboardTable matchStatus={match?.status || 'upcoming'} contestId={contest.id} />
      </div>

      <PrizeBreakdownModal
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        contestName={contest.name}
        entryFeeUVBE={contest.entryFeeUVBE}
        totalPrizePoolUVBE={contest.totalPrizePoolUVBE}
        breakdown={contest.prizeBreakdown}
      />
    </div>
  );
}
