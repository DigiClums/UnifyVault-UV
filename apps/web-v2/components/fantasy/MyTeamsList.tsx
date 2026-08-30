'use client';

import React from 'react';
import { FantasyUserTeam, Match } from '../../lib/fantasy/types';
import { useFantasy } from '../../lib/fantasy/fantasyStore';
import Link from 'next/link';
import { Users, Crown, Shield, Edit3, Copy, Eye, Trophy } from 'lucide-react';

interface MyTeamsListProps {
  matchId?: string;
  onViewTeamGround?: (team: FantasyUserTeam) => void;
}

export function MyTeamsList({ matchId, onViewTeamGround }: MyTeamsListProps) {
  const { userTeams, matches, createOrUpdateTeam } = useFantasy();

  const filteredTeams = matchId ? userTeams.filter((t) => t.matchId === matchId) : userTeams;

  const handleDuplicate = (team: FantasyUserTeam) => {
    createOrUpdateTeam(
      team.matchId,
      `${team.teamName} (Copy)`,
      [...team.playerIds],
      team.captainPlayerId,
      team.viceCaptainPlayerId,
    );
  };

  if (filteredTeams.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-black/20 dark:border-white/20 p-8 text-center bg-card space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#BFFF00]/20 border border-black/10 dark:border-white/10 mx-auto flex items-center justify-center text-foreground">
          <Users className="w-6 h-6" />
        </div>
        <h4 className="text-base font-black text-foreground">No Fantasy Teams Yet</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Create your fantasy XI now to participate in leagues and compete for UVBE rewards.
        </p>
        {matchId ? (
          <Link
            href={`/fantasy/create-team/${matchId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0_#000]"
          >
            <span>Create Team</span>
          </Link>
        ) : (
          <Link
            href="/fantasy/matches"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0_#000]"
          >
            <span>Explore Matches</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredTeams.map((team) => {
        const match = matches.find((m) => m.id === team.matchId);
        const captain = match?.players.find((p) => p.id === team.captainPlayerId);
        const viceCaptain = match?.players.find((p) => p.id === team.viceCaptainPlayerId);

        return (
          <div
            key={team.id}
            className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 sm:p-5 shadow-[3px_3px_0_rgba(0,0,0,0.85)] dark:shadow-none space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#BFFF00] text-black flex items-center justify-center font-black text-xs border border-black shadow-[1px_1px_0_#000]">
                  XI
                </span>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-foreground">
                    {team.teamName}
                  </h4>
                  {match && (
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {match.teamA.code} vs {match.teamB.code} • {match.series}
                    </p>
                  )}
                </div>
              </div>

              {team.pointsEarned > 0 && (
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Score</div>
                  <div className="text-sm sm:text-base font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
                    {team.pointsEarned} pts
                  </div>
                </div>
              )}
            </div>

            {/* Captain & VC Pill Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase">
                    Captain (2x)
                  </div>
                  <div className="text-xs font-black text-foreground truncate">
                    {captain?.name || 'Selected'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase">
                    Vice Captain (1.5x)
                  </div>
                  <div className="text-xs font-black text-foreground truncate">
                    {viceCaptain?.name || 'Selected'}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex p-2.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5 items-center justify-between">
                <div className="text-[9px] font-bold text-muted-foreground uppercase">
                  Credits Used
                </div>
                <div className="text-xs font-black font-mono text-foreground">
                  {team.totalCreditsUsed} / 100
                </div>
              </div>
            </div>

            {/* Team Actions */}
            <div className="flex items-center gap-2 pt-1">
              {onViewTeamGround && (
                <button
                  type="button"
                  onClick={() => onViewTeamGround(team)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-foreground text-xs font-bold transition-all border border-black/10 dark:border-white/10 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Formation</span>
                </button>
              )}

              <Link
                href={`/fantasy/create-team/${team.matchId}?editTeamId=${team.id}`}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-foreground text-xs font-bold transition-all border border-black/10 dark:border-white/10"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Team</span>
              </Link>

              <button
                type="button"
                onClick={() => handleDuplicate(team)}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-bold border border-black shadow-[2px_2px_0_#000] cursor-pointer"
                title="Duplicate Team"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
