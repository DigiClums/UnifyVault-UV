import { FantasyRulesConfig, Player, PlayerRole, TeamValidationResult } from './types';

export const DEFAULT_FANTASY_RULES: FantasyRulesConfig = {
  maxPlayers: 11,
  maxCredits: 100,
  maxPlayersPerRealTeam: 7,
  rolesConfig: {
    WK: { min: 1, max: 4, label: 'WK', name: 'Wicket Keepers' },
    BAT: { min: 3, max: 6, label: 'BAT', name: 'Batsmen' },
    AR: { min: 1, max: 4, label: 'AR', name: 'All-Rounders' },
    BOWL: { min: 3, max: 6, label: 'BOWL', name: 'Bowlers' },
  },
  scoringMultipliers: {
    captain: 2.0,
    viceCaptain: 1.5,
  },
};

export function validateFantasyTeam(
  selectedPlayers: Player[],
  captainId: string | null,
  viceCaptainId: string | null,
  teamAId: string,
  teamBId: string,
  rules: FantasyRulesConfig = DEFAULT_FANTASY_RULES,
): TeamValidationResult {
  const errors: string[] = [];

  const totalPlayers = selectedPlayers.length;
  const totalCredits = Number(selectedPlayers.reduce((acc, p) => acc + p.credits, 0).toFixed(1));

  const teamACount = selectedPlayers.filter((p) => p.teamId === teamAId).length;
  const teamBCount = selectedPlayers.filter((p) => p.teamId === teamBId).length;

  const roleCounts: Record<PlayerRole, number> = {
    WK: selectedPlayers.filter((p) => p.role === 'WK').length,
    BAT: selectedPlayers.filter((p) => p.role === 'BAT').length,
    AR: selectedPlayers.filter((p) => p.role === 'AR').length,
    BOWL: selectedPlayers.filter((p) => p.role === 'BOWL').length,
  };

  if (totalPlayers !== rules.maxPlayers) {
    errors.push(`Select exactly ${rules.maxPlayers} players (currently ${totalPlayers}).`);
  }

  if (totalCredits > rules.maxCredits) {
    errors.push(`Credits limit exceeded: ${totalCredits} used out of max ${rules.maxCredits}.`);
  }

  if (teamACount > rules.maxPlayersPerRealTeam) {
    errors.push(
      `Max ${rules.maxPlayersPerRealTeam} players allowed from Team 1 (selected ${teamACount}).`,
    );
  }
  if (teamBCount > rules.maxPlayersPerRealTeam) {
    errors.push(
      `Max ${rules.maxPlayersPerRealTeam} players allowed from Team 2 (selected ${teamBCount}).`,
    );
  }

  (Object.keys(rules.rolesConfig) as PlayerRole[]).forEach((role) => {
    const config = rules.rolesConfig[role];
    const count = roleCounts[role];
    if (count < config.min) {
      errors.push(`Select at least ${config.min} ${config.name} (${count} selected).`);
    }
    if (count > config.max) {
      errors.push(`Maximum ${config.max} ${config.name} allowed (${count} selected).`);
    }
  });

  const hasCaptain = !!captainId && selectedPlayers.some((p) => p.id === captainId);
  const hasViceCaptain = !!viceCaptainId && selectedPlayers.some((p) => p.id === viceCaptainId);
  const captainDistinctFromViceCaptain = Boolean(
    hasCaptain && hasViceCaptain && captainId !== viceCaptainId,
  );

  if (!hasCaptain) {
    errors.push('A Captain must be selected (earns 2x points).');
  }

  if (!hasViceCaptain) {
    errors.push('A Vice-Captain must be selected (earns 1.5x points).');
  }

  if (captainId && viceCaptainId && captainId === viceCaptainId) {
    errors.push('Captain and Vice-Captain cannot be the same player.');
  }

  return {
    isValid: errors.length === 0,
    totalPlayers,
    totalCredits,
    teamACount,
    teamBCount,
    roleCounts,
    hasCaptain,
    hasViceCaptain,
    captainDistinctFromViceCaptain,
    errors,
  };
}
