'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFantasy } from '../../../../lib/fantasy/fantasyStore';
import { TeamBuilder } from '../../../../components/fantasy/TeamBuilder';
import { TeamConfirmationModal } from '../../../../components/fantasy/TeamConfirmationModal';
import { Player, ContestTier } from '../../../../lib/fantasy/types';
import { ArrowLeft } from 'lucide-react';

export default function CreateTeamClient({ matchId }: { matchId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTeamId = searchParams.get('editTeamId') || undefined;
  const autoContestId = searchParams.get('autoContestId') || undefined;

  const { getMatchById, getTeamById, getContestById, createOrUpdateTeam, joinContest, userTeams } =
    useFantasy();
  const match = getMatchById(matchId);

  const existingTeam = editTeamId ? getTeamById(editTeamId) : undefined;
  const autoContest = autoContestId ? getContestById(autoContestId) : undefined;

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingTeamData, setPendingTeamData] = useState<{
    players: Player[];
    captainId: string;
    viceCaptainId: string;
    teamName: string;
  } | null>(null);

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

  const handleProceedToConfirmation = (
    selectedPlayers: Player[],
    captainId: string,
    viceCaptainId: string,
    teamName: string,
  ) => {
    setPendingTeamData({ players: selectedPlayers, captainId, viceCaptainId, teamName });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmTeam = () => {
    if (!pendingTeamData) return;

    const team = createOrUpdateTeam(
      match.id,
      pendingTeamData.teamName ||
        `Team ${userTeams.filter((t) => t.matchId === match.id).length + 1}`,
      pendingTeamData.players.map((p) => p.id),
      pendingTeamData.captainId,
      pendingTeamData.viceCaptainId,
      existingTeam?.id,
    );

    if (autoContest) {
      joinContest(autoContest.id, team.id);
      router.push(`/fantasy/contest/${autoContest.id}`);
    } else {
      router.push(`/fantasy/match/${match.id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href={`/fantasy/match/${match.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Match</span>
      </Link>

      <TeamBuilder
        match={match}
        existingTeamId={existingTeam?.id}
        initialSelectedPlayerIds={existingTeam?.playerIds}
        initialCaptainId={existingTeam?.captainPlayerId}
        initialViceCaptainId={existingTeam?.viceCaptainPlayerId}
        onProceedToConfirmation={handleProceedToConfirmation}
      />

      {pendingTeamData && (
        <TeamConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirmJoin={handleConfirmTeam}
          match={match}
          selectedPlayers={pendingTeamData.players}
          captainId={pendingTeamData.captainId}
          viceCaptainId={pendingTeamData.viceCaptainId}
          teamName={pendingTeamData.teamName}
          selectedContest={autoContest}
        />
      )}
    </div>
  );
}
