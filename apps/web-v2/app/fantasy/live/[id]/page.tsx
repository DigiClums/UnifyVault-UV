'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useFantasy } from '../../../../lib/fantasy/fantasyStore';
import { LiveScoreCard } from '../../../../components/fantasy/LiveScoreCard';
import { LeaderboardTable } from '../../../../components/fantasy/LeaderboardTable';
import { ArrowLeft, Zap, Trophy, Shield } from 'lucide-react';

export default function LiveMatchCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/fantasy/match/${match.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Match Hub</span>
        </Link>

        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          Simulated Live Feed
        </span>
      </div>

      {/* Live Scores & Fantasy Points Engine */}
      <LiveScoreCard match={match} />

      {/* Live Contest Leaderboard */}
      <LeaderboardTable contestName={`Live Standings — ${match.title}`} />
    </div>
  );
}
