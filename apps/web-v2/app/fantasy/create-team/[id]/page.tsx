'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFantasy } from '../../../../lib/fantasy/fantasyStore';
import { TeamBuilder } from '../../../../components/fantasy/TeamBuilder';
import { TeamConfirmationModal } from '../../../../components/fantasy/TeamConfirmationModal';
import { Player, ContestTier } from '../../../../lib/fantasy/types';
import { ArrowLeft } from 'lucide-react';

export default function CreateTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTeamId = searchParams.get('editTeamId') || undefined;
  const autoContestId = searchParams.get('autoContestId') || undefined;

  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const { getMatchById, getTeamById, getContestById, createOrUpdateTeam, joinContest } =
    useFantasy();
  const match = getMatchById(matchId);

  const existingTeam = editTeamId ? getTeamById(editTeamId) : undefined;
  const autoContest = autoContestId ? getContestById(autoContestId) : undefined;

  const [confirmationData, setConfirmationData] = useState<{
    selectedPlayers: Player[];
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
    setConfirmationData({
      selectedPlayers,
      captainId,
      viceCaptainId,
      teamName,
    });
  };

  const handleConfirmAndJoin = () => {
    if (!confirmationData) return;

    const totalCreditsUsed = Number(
      confirmationData.selectedPlayers.reduce((acc, p) => acc + p.credits, 0).toFixed(1),
    );

    const savedTeam = createOrUpdateTeam(
      match.id,
      confirmationData.teamName,
      confirmationData.selectedPlayers.map((p) => p.id),
      confirmationData.captainId,
      confirmationData.viceCaptainId,
      totalCreditsUsed,
      editTeamId,
    );

    if (autoContest) {
      joinContest(autoContest.id, match.id, savedTeam.id, autoContest.entryFeeUVBE);
    }

    setConfirmationData(null);
    router.push(`/fantasy/match/${match.id}`);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-2">
        <Link
          href={`/fantasy/match/${match.id}`}
          className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
            {editTeamId ? 'Edit Fantasy XI' : 'Build Your Fantasy XI'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {match.teamA.code} vs {match.teamB.code} • {match.series}
          </p>
        </div>
      </div>

      <TeamBuilder
        match={match}
        existingTeamId={editTeamId}
        initialSelectedPlayerIds={existingTeam?.playerIds || []}
        initialCaptainId={existingTeam?.captainPlayerId || ''}
        initialViceCaptainId={existingTeam?.viceCaptainPlayerId || ''}
        onProceedToConfirmation={handleProceedToConfirmation}
      />

      {confirmationData && (
        <TeamConfirmationModal
          isOpen={!!confirmationData}
          onClose={() => setConfirmationData(null)}
          match={match}
          selectedPlayers={confirmationData.selectedPlayers}
          captainId={confirmationData.captainId}
          viceCaptainId={confirmationData.viceCaptainId}
          teamName={confirmationData.teamName}
          selectedContest={autoContest}
          onConfirmJoin={handleConfirmAndJoin}
        />
      )}
    </div>
  );
}
