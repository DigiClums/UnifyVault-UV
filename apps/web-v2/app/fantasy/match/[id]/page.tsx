'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFantasy } from '../../../../lib/fantasy/fantasyStore';
import { ContestCard } from '../../../../components/fantasy/ContestCard';
import { PrizeBreakdownModal } from '../../../../components/fantasy/PrizeBreakdownModal';
import { MyTeamsList } from '../../../../components/fantasy/MyTeamsList';
import { TeamConfirmationModal } from '../../../../components/fantasy/TeamConfirmationModal';
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

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const { getMatchById, contests, userTeams, joinedContests, joinContest } = useFantasy();
  const match = getMatchById(matchId);

  const [activeTab, setActiveTab] = useState<'contests' | 'teams' | 'info'>('contests');
  const [selectedBreakdownContest, setSelectedBreakdownContest] = useState<ContestTier | null>(
    null,
  );
  const [selectedContestToJoin, setSelectedContestToJoin] = useState<ContestTier | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

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

  const matchTeams = userTeams.filter((t) => t.matchId === matchId);
  const matchContests = contests.filter(
    (c) => c.matchId === matchId || c.matchId === 'match-ind-aus-1',
  );

  const handleQuickJoinClick = (contest: ContestTier) => {
    setSelectedContestToJoin(contest);
    if (matchTeams.length === 0) {
      router.push(`/fantasy/create-team/${match.id}?autoContestId=${contest.id}`);
    } else {
      setShowJoinModal(true);
    }
  };

  const handleConfirmJoinWithExistingTeam = () => {
    if (selectedContestToJoin && matchTeams.length > 0) {
      joinContest(
        selectedContestToJoin.id,
        match.id,
        matchTeams[0].id,
        selectedContestToJoin.entryFeeUVBE,
      );
      setShowJoinModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Match Hero */}
      <div className="space-y-4">
        <Link
          href="/fantasy/matches"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all matches</span>
        </Link>

        {/* Hero Card */}
        <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-5 sm:p-7 shadow-[4px_4px_0_#000] dark:shadow-none relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30">
                  {match.format}
                </span>
                <span className="text-xs font-bold text-muted-foreground">{match.series}</span>
              </div>

              {/* Teams Display */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl sm:text-4xl">{match.teamA.flag}</span>
                  <div>
                    <div className="text-lg sm:text-xl font-black text-foreground">
                      {match.teamA.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-semibold">
                      {match.teamA.code}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-muted-foreground border border-black/10 dark:border-white/10">
                  VS
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-3xl sm:text-4xl">{match.teamB.flag}</span>
                  <div>
                    <div className="text-lg sm:text-xl font-black text-foreground">
                      {match.teamB.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-semibold">
                      {match.teamB.code}
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Meta */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {match.venue}, {match.city}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Deadline: Match Start Time
                </span>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-col gap-2 shrink-0">
              <Link
                href={`/fantasy/create-team/${match.id}`}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0_#000] active:scale-95 transition-all"
              >
                <span>Create Team</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {match.status === 'live' && (
                <Link
                  href={`/fantasy/live/${match.id}`}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-[2px_2px_0_#000]"
                >
                  <Zap className="w-4 h-4" />
                  <span>Live Center</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-200 dark:bg-black/70 p-1.5 rounded-2xl border-2 border-black dark:border-white/15 shadow-[2px_2px_0_#000] max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('contests')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'contests'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Contests ({matchContests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'teams'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>My Teams ({matchTeams.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'info'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Match Info</span>
        </button>
      </div>

      {/* ── Tab Content: Contests ── */}
      {activeTab === 'contests' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchContests.map((contest) => {
              const isJoined = joinedContests.some((jc) => jc.contestId === contest.id);
              return (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  userJoined={isJoined}
                  onViewDetails={(c) => setSelectedBreakdownContest(c)}
                  onJoinClick={(c) => handleQuickJoinClick(c)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab Content: My Teams ── */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-foreground">Teams Created for This Match</h3>
            <Link
              href={`/fantasy/create-team/${match.id}`}
              className="px-3 py-1.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000]"
            >
              + Add Another Team
            </Link>
          </div>

          <MyTeamsList matchId={match.id} />
        </div>
      )}

      {/* ── Tab Content: Match Info ── */}
      {activeTab === 'info' && (
        <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-6 shadow-[3px_3px_0_rgba(0,0,0,0.85)] dark:shadow-none space-y-4">
          <h3 className="text-base font-black text-foreground">Match Guidelines & Rules</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-black/5 dark:border-white/5 space-y-2">
              <div className="font-bold text-foreground">Fantasy Team Formation:</div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Pick exactly 11 players within 100 credits budget.</li>
                <li>Between 1 - 4 Wicket Keepers (WK).</li>
                <li>Between 3 - 6 Batsmen (BAT).</li>
                <li>Between 1 - 4 All-Rounders (AR).</li>
                <li>Between 3 - 6 Bowlers (BOWL).</li>
                <li>Max 7 players from any single cricket team.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-black/5 dark:border-white/5 space-y-2">
              <div className="font-bold text-foreground">Scoring Multipliers:</div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Captain: 2.0× multiplier on total match points.</li>
                <li>Vice Captain: 1.5× multiplier on total match points.</li>
                <li>Settlement occurs upon verified match result conclusion.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Prize Breakdown Modal */}
      <PrizeBreakdownModal
        isOpen={!!selectedBreakdownContest}
        onClose={() => setSelectedBreakdownContest(null)}
        contest={selectedBreakdownContest}
      />

      {/* Join Contest with Existing Team Modal */}
      {showJoinModal && matchTeams.length > 0 && selectedContestToJoin && (
        <TeamConfirmationModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          match={match}
          selectedPlayers={match.players.filter((p) => matchTeams[0].playerIds.includes(p.id))}
          captainId={matchTeams[0].captainPlayerId}
          viceCaptainId={matchTeams[0].viceCaptainPlayerId}
          teamName={matchTeams[0].teamName}
          selectedContest={selectedContestToJoin}
          onConfirmJoin={handleConfirmJoinWithExistingTeam}
        />
      )}
    </div>
  );
}
