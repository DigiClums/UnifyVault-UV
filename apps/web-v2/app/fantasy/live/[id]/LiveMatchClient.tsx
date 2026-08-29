'use client';

import React from 'react';
import Link from 'next/link';
import { useFantasy } from '../../../../lib/fantasy/fantasyStore';
import { LiveScoreCard } from '../../../../components/fantasy/LiveScoreCard';
import { LeaderboardTable } from '../../../../components/fantasy/LeaderboardTable';
import { ArrowLeft, Zap, Trophy, Shield } from 'lucide-react';

export default function LiveMatchClient({ matchId }: { matchId: string }) {
  const { getMatchById } = useFantasy();
  const match = getMatchById(matchId);

  if (!match) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-black text-foreground">Match Not Found</h2>
        <Link
          href="/fantasy/matches"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Matches</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href="/fantasy/matches"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Matches</span>
      </Link>

      <LiveScoreCard match={match} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>Live Contest Leaderboards</span>
          </h2>
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            LIVE RANKS
          </span>
        </div>

        <LeaderboardTable matchStatus={match.status} />
      </div>
    </div>
  );
}
