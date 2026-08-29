import { describe, it, expect } from 'vitest';
import { validateFantasyTeam, DEFAULT_FANTASY_RULES } from '../fantasy/rules';
import {
  mockMatches,
  mockContestTiers,
  mockLeaderboard,
  mockFantasyWallet,
  mockPlayersIndia,
  mockPlayersAustralia,
} from '../fantasy/mockData';
import { Player } from '../fantasy/types';

describe('UVBE Fantasy Cricket Full UX & Domain Validation Suite', () => {
  const teamAId = 'team-ind';
  const teamBId = 'team-aus';

  it('1. Centralized mock data layer is properly defined and complete', () => {
    expect(mockMatches.length).toBeGreaterThanOrEqual(4);
    expect(mockContestTiers.length).toBeGreaterThanOrEqual(4);
    expect(mockLeaderboard.length).toBeGreaterThanOrEqual(8);
    expect(mockFantasyWallet.availableUVBE).toBe(12450);
    expect(mockFantasyWallet.fantasyLockedUVBE).toBe(300);
    expect(mockFantasyWallet.fantasyRewardsUVBE).toBe(650);

    const liveMatch = mockMatches.find((m) => m.status === 'live');
    expect(liveMatch).toBeDefined();
    expect(liveMatch?.liveScore).toBeDefined();
    expect(liveMatch?.liveScore?.battingScore.runs).toBe(182);
    expect(liveMatch?.liveScore?.battingScore.wickets).toBe(5);
    expect(liveMatch?.liveScore?.battingScore.overs).toBe(34.2);
  });

  it('2. Contest prize pools and types match requirements', () => {
    const h2h = mockContestTiers.find((c) => c.type === 'Head-to-Head');
    const smallLeague = mockContestTiers.find(
      (c) => c.type === 'Small League' && c.maxParticipants === 10,
    );
    const grandLeague = mockContestTiers.find((c) => c.type === 'Grand League');

    expect(h2h).toBeDefined();
    expect(h2h?.entryFeeUVBE).toBe(100);
    expect(h2h?.maxParticipants).toBe(2);
    expect(h2h?.totalPrizePoolUVBE).toBe(180);

    expect(smallLeague).toBeDefined();
    expect(smallLeague?.entryFeeUVBE).toBe(100);
    expect(smallLeague?.maxParticipants).toBe(10);
    expect(smallLeague?.totalPrizePoolUVBE).toBe(900);

    expect(grandLeague).toBeDefined();
    expect(grandLeague?.entryFeeUVBE).toBe(100);
    expect(grandLeague?.maxParticipants).toBe(1000);
    expect(grandLeague?.totalPrizePoolUVBE).toBe(90000);
  });

  it('3. Fantasy Scoring Multipliers are 2x for Captain and 1.5x for Vice Captain', () => {
    expect(DEFAULT_FANTASY_RULES.scoringMultipliers.captain).toBe(2.0);
    expect(DEFAULT_FANTASY_RULES.scoringMultipliers.viceCaptain).toBe(1.5);
  });

  it('4. Team validation correctly enforces 11 players, role boundaries, credit cap, and C/VC', () => {
    const validSquad: Player[] = [
      mockPlayersIndia.find((p) => p.id === 'ind-5')!, // WK (9.0)
      mockPlayersIndia.find((p) => p.id === 'ind-3')!, // BAT (9.0)
      mockPlayersIndia.find((p) => p.id === 'ind-4')!, // BAT (8.5)
      mockPlayersAustralia.find((p) => p.id === 'aus-2')!, // BAT (9.0)
      mockPlayersIndia.find((p) => p.id === 'ind-8')!, // AR (9.0)
      mockPlayersAustralia.find((p) => p.id === 'aus-4')!, // AR (9.0)
      mockPlayersAustralia.find((p) => p.id === 'aus-6')!, // AR (8.5)
      mockPlayersIndia.find((p) => p.id === 'ind-9')!, // BOWL (9.5)
      mockPlayersIndia.find((p) => p.id === 'ind-10')!, // BOWL (8.5)
      mockPlayersAustralia.find((p) => p.id === 'aus-11')!, // BOWL (8.5)
      mockPlayersAustralia.find((p) => p.id === 'aus-12')!, // BOWL (8.5)
    ];

    const res = validateFantasyTeam(
      validSquad,
      validSquad[0].id,
      validSquad[1].id,
      teamAId,
      teamBId,
    );

    expect(res.isValid).toBe(true);
    expect(res.totalPlayers).toBe(11);
    expect(res.totalCredits).toBeLessThanOrEqual(100);
    expect(res.errors.length).toBe(0);
  });
});
