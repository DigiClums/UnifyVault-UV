'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  Match,
  ContestTier,
  FantasyUserTeam,
  FantasyJoinedContest,
  LeaderboardEntry,
  FantasyWalletState,
  Player,
} from './types';
import { mockMatches, mockContestTiers, mockLeaderboards, mockFantasyWallet } from './mockData';
import { validateTeamSelection } from './rules';

interface FantasyContextType {
  matches: Match[];
  contests: ContestTier[];
  userTeams: FantasyUserTeam[];
  joinedContests: FantasyJoinedContest[];
  wallet: FantasyWalletState;
  getMatchById: (id: string) => Match | undefined;
  getContestsByMatchId: (matchId: string) => ContestTier[];
  getContestById: (contestId: string) => ContestTier | undefined;
  getUserTeamsForMatch: (matchId: string) => FantasyUserTeam[];
  getTeamById: (teamId: string) => FantasyUserTeam | undefined;
  createOrUpdateTeam: (
    matchId: string,
    players: Player[],
    captainId: string,
    viceCaptainId: string,
    existingTeamId?: string,
  ) => FantasyUserTeam;
  joinContest: (contestId: string, teamId: string) => boolean;
  claimWinnings: (contestId: string) => void;
  depositToFantasyWallet: (amountUVBE: number) => void;
  withdrawFromFantasyWallet: (amountUVBE: number) => void;
}

const FantasyContext = createContext<FantasyContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TEAMS: 'uv_fantasy_user_teams',
  JOINED: 'uv_fantasy_joined_contests',
  WALLET: 'uv_fantasy_wallet',
};

export function FantasyProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [contests, setContests] = useState<ContestTier[]>(mockContestTiers);
  const [userTeams, setUserTeams] = useState<FantasyUserTeam[]>([]);
  const [joinedContests, setJoinedContests] = useState<FantasyJoinedContest[]>([]);
  const [wallet, setWallet] = useState<FantasyWalletState>(mockFantasyWallet);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedTeams = localStorage.getItem(STORAGE_KEYS.TEAMS);
      if (savedTeams) setUserTeams(JSON.parse(savedTeams));

      const savedJoined = localStorage.getItem(STORAGE_KEYS.JOINED);
      if (savedJoined) setJoinedContests(JSON.parse(savedJoined));

      const savedWallet = localStorage.getItem(STORAGE_KEYS.WALLET);
      if (savedWallet) setWallet(JSON.parse(savedWallet));
    } catch (e) {
      console.error('Error loading fantasy local data', e);
    }
  }, []);

  const saveTeams = (newTeams: FantasyUserTeam[]) => {
    setUserTeams(newTeams);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(newTeams));
    }
  };

  const saveJoined = (newJoined: FantasyJoinedContest[]) => {
    setJoinedContests(newJoined);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.JOINED, JSON.stringify(newJoined));
    }
  };

  const saveWallet = (newWallet: FantasyWalletState) => {
    setWallet(newWallet);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(newWallet));
    }
  };

  const getMatchById = (id: string) => {
    return matches.find((m) => m.id === id) || mockMatches.find((m) => m.id === id);
  };

  const getContestsByMatchId = (matchId: string) => {
    return contests.filter((c) => c.matchId === matchId);
  };

  const getContestById = (contestId: string) => {
    return (
      contests.find((c) => c.id === contestId) || mockContestTiers.find((c) => c.id === contestId)
    );
  };

  const getUserTeamsForMatch = (matchId: string) => {
    return userTeams.filter((t) => t.matchId === matchId);
  };

  const getTeamById = (teamId: string) => {
    return userTeams.find((t) => t.id === teamId);
  };

  const createOrUpdateTeam = (
    matchId: string,
    players: Player[],
    captainId: string,
    viceCaptainId: string,
    existingTeamId?: string,
  ): FantasyUserTeam => {
    const match = getMatchById(matchId);
    if (!match) throw new Error('Match not found');

    const captain = players.find((p) => p.id === captainId);
    const viceCaptain = players.find((p) => p.id === viceCaptainId);

    if (!captain || !viceCaptain) {
      throw new Error('Captain and Vice-Captain must be selected from selected players');
    }

    const totalCreditsUsed = players.reduce((sum, p) => sum + p.credits, 0);

    const teamData: FantasyUserTeam = {
      id: existingTeamId || `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      matchId,
      name: `Team ${userTeams.filter((t) => t.matchId === matchId).length + 1}`,
      players,
      captain,
      viceCaptain,
      totalCreditsUsed,
      createdAt: new Date().toISOString(),
    };

    if (existingTeamId) {
      const updated = userTeams.map((t) => (t.id === existingTeamId ? teamData : t));
      saveTeams(updated);
    } else {
      saveTeams([...userTeams, teamData]);
    }

    return teamData;
  };

  const joinContest = (contestId: string, teamId: string): boolean => {
    const contest = getContestById(contestId);
    const team = getTeamById(teamId);

    if (!contest || !team) return false;
    if (wallet.availableUVBE < contest.entryFeeUVBE) {
      alert('Insufficient UVBE balance in Fantasy Wallet! Please deposit more UVBE.');
      return false;
    }

    const joinedRecord: FantasyJoinedContest = {
      id: `joined-${Date.now()}`,
      contestId,
      teamId,
      joinedAt: new Date().toISOString(),
      entryFeePaid: contest.entryFeeUVBE,
      isClaimed: false,
    };

    saveJoined([...joinedContests, joinedRecord]);

    // Deduct entry fee
    saveWallet({
      ...wallet,
      availableUVBE: wallet.availableUVBE - contest.entryFeeUVBE,
      fantasyLockedUVBE: wallet.fantasyLockedUVBE + contest.entryFeeUVBE,
      totalFantasyEntries: wallet.totalFantasyEntries + 1,
    });

    // Increment participant count
    setContests((prev) =>
      prev.map((c) =>
        c.id === contestId ? { ...c, currentParticipants: c.currentParticipants + 1 } : c,
      ),
    );

    return true;
  };

  const claimWinnings = (contestId: string) => {
    const joined = joinedContests.find((jc) => jc.contestId === contestId && !jc.isClaimed);
    if (!joined || !joined.finalPrizeUVBE) return;

    saveJoined(joinedContests.map((jc) => (jc.id === joined.id ? { ...jc, isClaimed: true } : jc)));

    saveWallet({
      ...wallet,
      availableUVBE: wallet.availableUVBE + joined.finalPrizeUVBE,
      fantasyRewardsUVBE: wallet.fantasyRewardsUVBE + joined.finalPrizeUVBE,
      totalWonUVBE: wallet.totalWonUVBE + joined.finalPrizeUVBE,
    });
  };

  const depositToFantasyWallet = (amountUVBE: number) => {
    saveWallet({
      ...wallet,
      availableUVBE: wallet.availableUVBE + amountUVBE,
    });
  };

  const withdrawFromFantasyWallet = (amountUVBE: number) => {
    if (amountUVBE > wallet.availableUVBE) return;
    saveWallet({
      ...wallet,
      availableUVBE: wallet.availableUVBE - amountUVBE,
    });
  };

  const value = useMemo(
    () => ({
      matches,
      contests,
      userTeams,
      joinedContests,
      wallet,
      getMatchById,
      getContestsByMatchId,
      getContestById,
      getUserTeamsForMatch,
      getTeamById,
      createOrUpdateTeam,
      joinContest,
      claimWinnings,
      depositToFantasyWallet,
      withdrawFromFantasyWallet,
    }),
    [matches, contests, userTeams, joinedContests, wallet],
  );

  return <FantasyContext.Provider value={value}>{children}</FantasyContext.Provider>;
}

const fallbackContext: FantasyContextType = {
  matches: mockMatches,
  contests: mockContestTiers,
  userTeams: [],
  joinedContests: [],
  wallet: mockFantasyWallet,
  getMatchById: (id: string) => mockMatches.find((m) => m.id === id),
  getContestsByMatchId: (matchId: string) => mockContestTiers.filter((c) => c.matchId === matchId),
  getContestById: (contestId: string) => mockContestTiers.find((c) => c.id === contestId),
  getUserTeamsForMatch: () => [],
  getTeamById: () => undefined,
  createOrUpdateTeam: () => ({}) as any,
  joinContest: () => false,
  claimWinnings: () => {},
  depositToFantasyWallet: () => {},
  withdrawFromFantasyWallet: () => {},
};

export function useFantasy() {
  const context = useContext(FantasyContext);
  if (!context) {
    return fallbackContext;
  }
  return context;
}
