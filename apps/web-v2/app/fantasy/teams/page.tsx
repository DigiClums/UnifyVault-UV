'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFantasy } from '../../../lib/fantasy/fantasyStore';
import { MyTeamsList } from '../../../components/fantasy/MyTeamsList';
import { CricketGroundView } from '../../../components/fantasy/CricketGroundView';
import { FantasyUserTeam } from '../../../lib/fantasy/types';
import { Users, ArrowLeft, Plus } from 'lucide-react';

export default function FantasyTeamsPage() {
  const { userTeams, matches } = useFantasy();
  const [selectedFormationTeam, setSelectedFormationTeam] = useState<FantasyUserTeam | null>(null);

  const selectedTeamMatch = selectedFormationTeam
    ? matches.find((m) => m.id === selectedFormationTeam.matchId)
    : null;

  const selectedTeamPlayers =
    selectedFormationTeam && selectedTeamMatch
      ? selectedTeamMatch.players.filter((p) => selectedFormationTeam.playerIds.includes(p.id))
      : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/fantasy"
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
              My Fantasy Teams
            </h1>
            <p className="text-xs text-muted-foreground">
              Review, edit, and duplicate your created fantasy XI lineups.
            </p>
          </div>
        </div>

        <Link
          href="/fantasy/matches"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border-2 border-black shadow-[2px_2px_0_#000] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Build New XI</span>
        </Link>
      </div>

      <MyTeamsList onViewTeamGround={(team) => setSelectedFormationTeam(team)} />

      {/* Formation Ground View Modal */}
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
