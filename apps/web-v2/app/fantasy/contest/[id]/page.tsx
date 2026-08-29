'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useFantasy } from '../../../../lib/fantasy/fantasyStore';
import { PrizeBreakdownModal } from '../../../../components/fantasy/PrizeBreakdownModal';
import { LeaderboardTable } from '../../../../components/fantasy/LeaderboardTable';
import { ArrowLeft, Trophy, Users, ShieldCheck, ArrowRight, Award } from 'lucide-react';

export default function ContestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const contestId = resolvedParams.id;

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

  const spotsLeft = contest.maxParticipants - contest.currentParticipants;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href={match ? `/fantasy/match/${match.id}` : '/fantasy'}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Match Contests</span>
      </Link>

      {/* Contest Overview Hero */}
      <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-6 shadow-[4px_4px_0_#000] dark:shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-black text-[#BFFF00] dark:bg-white/10 dark:text-[#BFFF00] border border-black dark:border-white/20">
                {contest.type}
              </span>
              {contest.isGuaranteed && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Guaranteed
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">{contest.name}</h1>
            {match && (
              <p className="text-xs text-muted-foreground">
                {match.teamA.name} vs {match.teamB.name} • {match.series}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBreakdownModal(true)}
              className="px-4 py-2.5 rounded-xl bg-card hover:bg-card-hover border-2 border-black dark:border-white/20 text-xs font-bold shadow-[2px_2px_0_#000] dark:shadow-none cursor-pointer"
            >
              View Prize Distribution
            </button>

            {match && !isJoined && (
              <Link
                href={`/fantasy/create-team/${match.id}?autoContestId=${contest.id}`}
                className="px-5 py-2.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0_#000]"
              >
                Join Contest
              </Link>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Prize Pool</div>
            <div className="text-base sm:text-lg font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
              {contest.totalPrizePoolUVBE.toLocaleString('en-US')} UVBE
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Entry Fee</div>
            <div className="text-base sm:text-lg font-black font-mono text-foreground">
              {contest.entryFeeUVBE} UVBE
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Spots Left</div>
            <div className="text-base sm:text-lg font-black font-mono text-foreground">
              {spotsLeft} / {contest.maxParticipants}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">1st Prize</div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {contest.firstPrizeUVBE.toLocaleString('en-US')} UVBE
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table Component */}
      <LeaderboardTable contestName={contest.name} />

      {/* Prize Breakdown Modal */}
      <PrizeBreakdownModal
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        contest={contest}
      />
    </div>
  );
}
