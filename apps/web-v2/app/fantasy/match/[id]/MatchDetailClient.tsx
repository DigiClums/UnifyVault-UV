'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFantasy } from '../../../../lib/fantasy/fantasyStore';
import { ContestCard } from '../../../../components/fantasy/ContestCard';
import { PrizeBreakdownModal } from '../../../../components/fantasy/PrizeBreakdownModal';
import { MyTeamsList } from '../../../../components/fantasy/MyTeamsList';
import { ContestTier, FantasyUserTeam } from '../../../../lib/fantasy/types';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Trophy,
  Users,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Zap,
} from 'lucide-react';

export default function MatchDetailClient({ matchId }: { matchId: string }) {
  const router = useRouter();
  const { getMatchById, getContestsByMatchId, getUserTeamsForMatch, joinContest } = useFantasy();
  const match = getMatchById(matchId);
  const contests = getContestsByMatchId(matchId);
  const userTeams = getUserTeamsForMatch(matchId);

  const [activeTab, setActiveTab] = useState<'contests' | 'my-teams'>('contests');
  const [selectedContestForBreakdown, setSelectedContestForBreakdown] =
    useState<ContestTier | null>(null);
  const [selectedContestToJoin, setSelectedContestToJoin] = useState<ContestTier | null>(null);

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

  const isLive = match.status === 'live' || (match.status as any) === 'LIVE';
  const isUpcoming = match.status === 'upcoming' || (match.status as any) === 'UPCOMING';
  const isCompleted = match.status === 'completed' || (match.status as any) === 'COMPLETED';

  const teamAName = match.teamA?.name || 'Team A';
  const teamACode = match.teamA?.code || 'TMA';
  const teamAFlag = match.teamA?.flag || '🏏';

  const teamBName = match.teamB?.name || 'Team B';
  const teamBCode = match.teamB?.code || 'TMB';
  const teamBFlag = match.teamB?.flag || '🏏';

  const handleJoinContestClick = (contest: ContestTier) => {
    if (userTeams.length === 0) {
      router.push(`/fantasy/create-team/${match.id}?autoContestId=${contest.id}`);
    } else if (userTeams.length === 1) {
      joinContest(contest.id, userTeams[0].id);
      router.push(`/fantasy/contest/${contest.id}`);
    } else {
      setSelectedContestToJoin(contest);
    }
  };

  const handleSelectTeamAndJoin = (team: FantasyUserTeam) => {
    if (selectedContestToJoin) {
      joinContest(selectedContestToJoin.id, team.id);
      setSelectedContestToJoin(null);
      router.push(`/fantasy/contest/${selectedContestToJoin.id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href="/fantasy/matches"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Matches</span>
      </Link>

      {/* Match Header Hero Card */}
      <div className="p-6 rounded-3xl bg-card border-2 border-black dark:border-white/15 shadow-[5px_5px_0_#BFFF00] space-y-4">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-[#1f1f1f] text-foreground border border-border">
            {match.format} &bull; {match.series}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              isLive
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse'
                : isCompleted
                  ? 'bg-slate-500/10 text-muted-foreground border border-border'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            }`}
          >
            {isLive ? 'LIVE NOW' : match.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 items-center text-center py-3">
          <div className="space-y-1">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/60 border-2 border-black dark:border-white/15 flex items-center justify-center font-black text-2xl text-foreground shadow-[2px_2px_0_#000]">
              {teamAFlag}
            </div>
            <div className="font-black text-sm text-foreground">{teamACode}</div>
            <div className="text-[10px] text-muted-foreground">{teamAName}</div>
          </div>

          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-muted text-muted-foreground">
              VS
            </span>
            <div className="text-xs font-mono font-semibold text-foreground/80 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span>{isLive ? 'In Progress' : '7:30 PM'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/60 border-2 border-black dark:border-white/15 flex items-center justify-center font-black text-2xl text-foreground shadow-[2px_2px_0_#000]">
              {teamBFlag}
            </div>
            <div className="font-black text-sm text-foreground">{teamBCode}</div>
            <div className="text-[10px] text-muted-foreground">{teamBName}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t-2 border-black dark:border-white/10 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span>
              {match.venue}, {match.city}
            </span>
          </div>

          {isUpcoming && (
            <Link
              href={`/fantasy/create-team/${match.id}`}
              className="px-4 py-1.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000] flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Team</span>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-black dark:border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('contests')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'contests'
              ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[2px_2px_0_#000]'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          Contests ({contests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('my-teams')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'my-teams'
              ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[2px_2px_0_#000]'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          My Teams ({userTeams.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'contests' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contests.map((contest) => (
            <ContestCard
              key={contest.id}
              contest={contest}
              matchStatus={match.status}
              onJoin={() => handleJoinContestClick(contest)}
              onViewBreakdown={() => setSelectedContestForBreakdown(contest)}
            />
          ))}
        </div>
      ) : (
        <MyTeamsList
          teams={userTeams}
          match={match}
          onCreateTeam={() => router.push(`/fantasy/create-team/${match.id}`)}
          onEditTeam={(teamId) =>
            router.push(`/fantasy/create-team/${match.id}?editTeamId=${teamId}`)
          }
        />
      )}

      {/* Prize Breakdown Modal */}
      {selectedContestForBreakdown && (
        <PrizeBreakdownModal
          isOpen={Boolean(selectedContestForBreakdown)}
          onClose={() => setSelectedContestForBreakdown(null)}
          contestName={selectedContestForBreakdown.name}
          entryFeeUVBE={selectedContestForBreakdown.entryFeeUVBE}
          totalPrizePoolUVBE={selectedContestForBreakdown.totalPrizePoolUVBE}
          breakdown={selectedContestForBreakdown.prizeBreakdown}
        />
      )}

      {/* Multi-Team Selector Modal when user has >1 team */}
      {selectedContestToJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl bg-card border-2 border-black dark:border-white/15 shadow-[6px_6px_0_#BFFF00] space-y-4">
            <h3 className="text-lg font-black text-foreground">Select Team to Join</h3>
            <p className="text-xs text-muted-foreground">
              Choose which of your created teams to enter into {selectedContestToJoin.name} (
              {selectedContestToJoin.entryFeeUVBE} UVBE).
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {userTeams.map((team, idx) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handleSelectTeamAndJoin(team)}
                  className="w-full p-3 rounded-xl bg-muted/40 hover:bg-[#BFFF00]/10 border-2 border-border hover:border-black dark:hover:border-white/20 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-black text-xs text-foreground">
                      Team {idx + 1} ({team.players.length} Players)
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Cap: {team.captain.name} &bull; VC: {team.viceCaptain.name}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedContestToJoin(null)}
              className="w-full py-2.5 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-bold border border-border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
