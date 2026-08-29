'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFantasy } from '../../lib/fantasy/fantasyStore';
import { FantasyWalletCard } from '../../components/fantasy/FantasyWalletCard';
import { MatchCard } from '../../components/fantasy/MatchCard';
import { MyTeamsList } from '../../components/fantasy/MyTeamsList';
import { CricketGroundView } from '../../components/fantasy/CricketGroundView';
import { FantasyUserTeam } from '../../lib/fantasy/types';
import {
  Sparkles,
  Trophy,
  Flame,
  Zap,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function FantasyHomePage() {
  const { matches, userTeams, joinedContests } = useFantasy();
  const [selectedFormationTeam, setSelectedFormationTeam] = useState<FantasyUserTeam | null>(null);

  const featuredMatch = matches.find((m) => m.status === 'live') || matches[0];
  const upcomingMatches = matches.filter((m) => m.status === 'upcoming');
  const liveMatches = matches.filter((m) => m.status === 'live');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  const selectedTeamMatch = selectedFormationTeam
    ? matches.find((m) => m.id === selectedFormationTeam.matchId)
    : null;

  const selectedTeamPlayers =
    selectedFormationTeam && selectedTeamMatch
      ? selectedTeamMatch.players.filter((p) => selectedFormationTeam.playerIds.includes(p.id))
      : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Fantasy Suite Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span className="text-2xl">🏏</span>
              UVBE Fantasy Cricket
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
              Web3 Fantasy League
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select your dream XI, compete on real-match dynamics, and win rewards in existing UVBE
            ecosystem.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
          <Link
            href="/fantasy/matches"
            className="flex items-center gap-1 text-[11px] font-mono font-bold px-3 py-1.5 rounded-xl bg-card hover:bg-card-hover text-foreground border-2 border-black dark:border-white/20 shadow-[2px_2px_0_#000] dark:shadow-none transition-all"
          >
            <span>All Matches</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href={`/fantasy/create-team/${featuredMatch.id}`}
            className="flex items-center gap-1 text-[11px] font-mono font-black px-3 py-1.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black border-2 border-black shadow-[2px_2px_0_#000] transition-all"
          >
            <span>Create Team</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 1. Fantasy Wallet Card Display (Demo View) ── */}
      <FantasyWalletCard />

      {/* ── 2. Featured Match Spotlight ── */}
      {featuredMatch && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Featured Match
            </h2>
            <Link
              href={`/fantasy/match/${featuredMatch.id}`}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <span>View Contests</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <MatchCard match={featuredMatch} featured />
        </div>
      )}

      {/* ── 3. Live & Upcoming Matches Grid ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-black dark:text-[#BFFF00]" />
            Active Tournaments & Matches
          </h2>
          <Link
            href="/fantasy/matches"
            className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.slice(0, 3).map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>

      {/* ── 4. My Active Teams & Contest Participation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Teams Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              My Fantasy Teams ({userTeams.length})
            </h2>
            <Link
              href="/fantasy/teams"
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <span>Manage Teams</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <MyTeamsList onViewTeamGround={(team) => setSelectedFormationTeam(team)} />
        </div>

        {/* Active Contests & History Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Active Contests ({joinedContests.length})
            </h2>
            <Link
              href="/fantasy/history"
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <span>Full History</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {joinedContests.slice(0, 3).map((jc) => {
              const m = matches.find((match) => match.id === jc.matchId);
              return (
                <div
                  key={jc.id}
                  className="p-3.5 rounded-2xl bg-card border-2 border-black/10 dark:border-white/10 flex items-center justify-between shadow-sm"
                >
                  <div>
                    <div className="text-xs sm:text-sm font-black text-foreground">
                      {m?.title || 'Cricket Match'}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Entry: {jc.entryFeePaidUVBE} UVBE • Current Rank: #{jc.rank}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
                      {jc.points} pts
                    </div>
                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {jc.settled ? `Won +${jc.settledWinningsUVBE} UVBE` : 'In Play'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Formation Ground View Modal (from My Teams) ── */}
      {selectedFormationTeam && selectedTeamMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-xl w-full bg-card rounded-3xl border-2 border-black dark:border-white/20 p-4 space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-foreground">
                  {selectedFormationTeam.teamName} Formation
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedTeamMatch.teamA.code} vs {selectedTeamMatch.teamB.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFormationTeam(null)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <CricketGroundView
              players={selectedTeamPlayers}
              captainId={selectedFormationTeam.captainPlayerId}
              viceCaptainId={selectedFormationTeam.viceCaptainPlayerId}
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFormationTeam(null)}
                className="px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000] cursor-pointer"
              >
                Close Formation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
