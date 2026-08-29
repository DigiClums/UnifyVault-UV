import { describe, it, expect } from 'vitest';
import { validateFantasyTeam, DEFAULT_FANTASY_RULES } from '../rules';
import { mockPlayersIndia, mockPlayersAustralia } from '../mockData';
import { Player } from '../types';

describe('Fantasy Cricket Team Validation Engine', () => {
  const teamAId = 'team-ind';
  const teamBId = 'team-aus';

  // Total credits:
  // ind-5 (WK, 9.0)
  // ind-2 (BAT, 10.5)
  // ind-3 (BAT, 9.0)
  // aus-1 (BAT, 9.5)
  // ind-7 (AR, 9.5)
  // ind-8 (AR, 9.0)
  // aus-4 (AR, 9.0)
  // ind-9 (BOWL, 9.5)
  // ind-10 (BOWL, 8.5)
  // aus-9 (BOWL, 9.0)
  // aus-11 (BOWL, 8.5)
  // Total = 9.0+10.5+9.0+9.5+9.5+9.0+9.0+9.5+8.5+9.0+8.5 = 101.0! That was > 100!
  // Let's replace ind-2 with ind-4 (8.5) and ind-7 with ind-12 (BOWL 8.0) to make sure total <= 100

  const validSquad: Player[] = [
    mockPlayersIndia.find((p) => p.id === 'ind-5')!, // 1 WK (9.0)
    mockPlayersIndia.find((p) => p.id === 'ind-3')!, // 1 BAT (9.0)
    mockPlayersIndia.find((p) => p.id === 'ind-4')!, // 2 BAT (8.5)
    mockPlayersAustralia.find((p) => p.id === 'aus-2')!, // 3 BAT (9.0)
    mockPlayersIndia.find((p) => p.id === 'ind-8')!, // 1 AR (9.0)
    mockPlayersAustralia.find((p) => p.id === 'aus-4')!, // 2 AR (9.0)
    mockPlayersAustralia.find((p) => p.id === 'aus-6')!, // 3 AR (8.5)
    mockPlayersIndia.find((p) => p.id === 'ind-9')!, // 1 BOWL (9.5)
    mockPlayersIndia.find((p) => p.id === 'ind-10')!, // 2 BOWL (8.5)
    mockPlayersAustralia.find((p) => p.id === 'aus-11')!, // 3 BOWL (8.5)
    mockPlayersAustralia.find((p) => p.id === 'aus-12')!, // 4 BOWL (8.5)
  ];
  // India: ind-5, ind-3, ind-4, ind-8, ind-9, ind-10 (6 players)
  // Australia: aus-2, aus-4, aus-6, aus-11, aus-12 (5 players)
  // Total credits: 9.0 + 9.0 + 8.5 + 9.0 + 9.0 + 9.0 + 8.5 + 9.5 + 8.5 + 8.5 + 8.5 = 98.0 <= 100

  it('1. Passes valid 11 player squad with valid Captain and Vice Captain', () => {
    const captainId = validSquad[0].id;
    const viceCaptainId = validSquad[1].id;

    const result = validateFantasyTeam(
      validSquad,
      captainId,
      viceCaptainId,
      teamAId,
      teamBId,
      DEFAULT_FANTASY_RULES,
    );

    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
    expect(result.totalPlayers).toBe(11);
    expect(result.totalCredits).toBeLessThanOrEqual(100);
    expect(result.hasCaptain).toBe(true);
    expect(result.hasViceCaptain).toBe(true);
    expect(result.captainDistinctFromViceCaptain).toBe(true);
  });

  it('2. Fails when less than 11 players selected', () => {
    const incompleteSquad = validSquad.slice(0, 10);
    const result = validateFantasyTeam(
      incompleteSquad,
      incompleteSquad[0].id,
      incompleteSquad[1].id,
      teamAId,
      teamBId,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('exactly 11 players'))).toBe(true);
  });

  it('3. Fails when Captain equals Vice Captain', () => {
    const captainId = validSquad[0].id;
    const viceCaptainId = validSquad[0].id;

    const result = validateFantasyTeam(validSquad, captainId, viceCaptainId, teamAId, teamBId);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('Captain and Vice-Captain cannot be the same')),
    ).toBe(true);
  });

  it('4. Fails when more than 7 players from one team', () => {
    const teamHeavySquad: Player[] = [
      ...mockPlayersIndia.slice(0, 8),
      ...mockPlayersAustralia.slice(0, 3),
    ];

    const result = validateFantasyTeam(
      teamHeavySquad,
      teamHeavySquad[0].id,
      teamHeavySquad[1].id,
      teamAId,
      teamBId,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Max 7 players allowed'))).toBe(true);
  });

  it('5. Fails when role minimum constraint is violated (e.g. 0 WK)', () => {
    const noWkSquad = [mockPlayersIndia.find((p) => p.id === 'ind-2')!, ...validSquad.slice(1)];

    const result = validateFantasyTeam(
      noWkSquad,
      noWkSquad[0].id,
      noWkSquad[1].id,
      teamAId,
      teamBId,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('at least 1 Wicket Keepers'))).toBe(true);
  });

  it('6. Enforces 100 credit limit correctly', () => {
    const expensiveSquad: Player[] = validSquad.map((p) => ({
      ...p,
      credits: 10.5,
    }));

    const result = validateFantasyTeam(
      expensiveSquad,
      expensiveSquad[0].id,
      expensiveSquad[1].id,
      teamAId,
      teamBId,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Credits limit exceeded'))).toBe(true);
  });
});
