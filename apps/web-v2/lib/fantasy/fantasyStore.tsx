'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Match,
  ContestTier,
  FantasyUserTeam,
  JoinedContest,
  FantasyWalletState,
  Player,
} from './types';
import { mockMatches, mockContestTiers, mockFantasyWallet } from './mockData';

interface FantasyContextType {
  matches: Match[];
  contests: ContestTier[];
  userTeams: FantasyUserTeam[];
  joinedContests: JoinedContest[];
  wallet: FantasyWalletState;
  createOrUpdateTeam: (
    matchId: string,
    teamName: string,
    playerIds: string[],
    captainId: string,
    viceCaptainId: string,
    creditsUsed: number,
    existingTeamId?: string,
  ) => FantasyUserTeam;
  joinContest: (
    contestId: string,
    matchId: string,
    userTeamId: string,
    entryFeeUVBE: number,
  ) => { success: boolean; message: string; joinedContest?: JoinedContest };
  getTeamById: (teamId: string) => FantasyUserTeam | undefined;
  getTeamsForMatch: (matchId: string) => FantasyUserTeam[];
  getJoinedContestsForMatch: (matchId: string) => JoinedContest[];
  getContestById: (contestId: string) => ContestTier | undefined;
  getMatchById: (matchId: string) => Match | undefined;
}

const STORAGE_KEY_TEAMS = 'uvbe_fantasy_teams_v1';
const STORAGE_KEY_JOINED = 'uvbe_fantasy_joined_v1';
const STORAGE_KEY_WALLET = 'uvbe_fantasy_wallet_v1';

const defaultInitialTeam: FantasyUserTeam = {
  id: 'team-default-1',
  matchId: 'match-ind-aus-1',
  teamName: 'My UV Champions',
  createdAt: new Date().toISOString(),
  playerIds: [
    'ind-1',
    'ind-2',
    'ind-3',
    'ind-5',
    'ind-7',
    'ind-8',
    'ind-9',
    'aus-1',
    'aus-4',
    'aus-5',
    'aus-10',
  ],
  captainPlayerId: 'ind-2',
  viceCaptainPlayerId: 'ind-8',
  totalCreditsUsed: 99.5,
  pointsEarned: 586,
  rank: 3,
};

const defaultInitialJoined: JoinedContest[] = [
  {
    id: 'jc-1',
    contestId: 'contest-gl-1',
    matchId: 'match-ind-aus-1',
    userTeamId: 'team-default-1',
    joinedAt: new Date(Date.now() - 3600000).toISOString(),
    entryFeePaidUVBE: 100,
    rank: 3,
    points: 586,
    potentialWinningUVBE: 7500,
    settled: false,
    settledWinningsUVBE: 0,
  },
  {
    id: 'jc-2',
    contestId: 'contest-h2h-1',
    matchId: 'match-ind-pak-4',
    userTeamId: 'team-default-1',
    joinedAt: new Date(Date.now() - 86400000).toISOString(),
    entryFeePaidUVBE: 100,
    rank: 1,
    points: 512,
    potentialWinningUVBE: 180,
    settled: true,
    settledWinningsUVBE: 180,
  },
];

const FantasyContext = createContext<FantasyContextType | null>(null);

export function FantasyProvider({ children }: { children: React.ReactNode }) {
  const [matches] = useState<Match[]>(mockMatches);
  const [contests, setContests] = useState<ContestTier[]>(mockContestTiers);
  const [userTeams, setUserTeams] = useState<FantasyUserTeam[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TEAMS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read saved fantasy teams:', e);
      }
    }
    return [defaultInitialTeam];
  });

  const [joinedContests, setJoinedContests] = useState<JoinedContest[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_JOINED);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read saved joined contests:', e);
      }
    }
    return defaultInitialJoined;
  });

  const [wallet, setWallet] = useState<FantasyWalletState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_WALLET);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read saved fantasy wallet:', e);
      }
    }
    return mockFantasyWallet;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(userTeams));
    }
  }, [userTeams]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_JOINED, JSON.stringify(joinedContests));
    }
  }, [joinedContests]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WALLET, JSON.stringify(wallet));
    }
  }, [wallet]);

  const createOrUpdateTeam = (
    matchId: string,
    teamName: string,
    playerIds: string[],
    captainId: string,
    viceCaptainId: string,
    creditsUsed: number,
    existingTeamId?: string,
  ): FantasyUserTeam => {
    if (existingTeamId) {
      const updatedTeams = userTeams.map((t) => {
        if (t.id === existingTeamId) {
          return {
            ...t,
            teamName: teamName || t.teamName,
            playerIds,
            captainPlayerId: captainId,
            viceCaptainPlayerId: viceCaptainId,
            totalCreditsUsed: creditsUsed,
          };
        }
        return t;
      });
      setUserTeams(updatedTeams);
      const updated = updatedTeams.find((t) => t.id === existingTeamId)!;
      return updated;
    }

    const newTeamNumber = userTeams.filter((t) => t.matchId === matchId).length + 1;
    const newTeam: FantasyUserTeam = {
      id: `team-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      matchId,
      teamName: teamName || `Team T${newTeamNumber}`,
      createdAt: new Date().toISOString(),
      playerIds,
      captainPlayerId: captainId,
      viceCaptainPlayerId: viceCaptainId,
      totalCreditsUsed: creditsUsed,
      pointsEarned: 0,
    };

    setUserTeams((prev) => [newTeam, ...prev]);
    return newTeam;
  };

  const joinContest = (
    contestId: string,
    matchId: string,
    userTeamId: string,
    entryFeeUVBE: number,
  ) => {
    const contest = contests.find((c) => c.id === contestId);
    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    if (contest.currentParticipants >= contest.maxParticipants) {
      return { success: false, message: 'Contest is already full' };
    }

    const newJoined: JoinedContest = {
      id: `jc-${Date.now()}`,
      contestId,
      matchId,
      userTeamId,
      joinedAt: new Date().toISOString(),
      entryFeePaidUVBE: entryFeeUVBE,
      rank: contest.currentParticipants + 1,
      points: 0,
      potentialWinningUVBE: contest.firstPrizeUVBE,
      settled: false,
      settledWinningsUVBE: 0,
    };

    setJoinedContests((prev) => [newJoined, ...prev]);

    setContests((prev) =>
      prev.map((c) =>
        c.id === contestId ? { ...c, currentParticipants: c.currentParticipants + 1 } : c,
      ),
    );

    setWallet((prev) => ({
      ...prev,
      availableUVBE: Math.max(0, prev.availableUVBE - entryFeeUVBE),
      fantasyLockedUVBE: prev.fantasyLockedUVBE + entryFeeUVBE,
      totalFantasyEntries: prev.totalFantasyEntries + 1,
    }));

    return {
      success: true,
      message: 'Successfully joined contest in demo mode!',
      joinedContest: newJoined,
    };
  };

  const getTeamById = (teamId: string) => userTeams.find((t) => t.id === teamId);
  const getTeamsForMatch = (matchId: string) => userTeams.filter((t) => t.matchId === matchId);
  const getJoinedContestsForMatch = (matchId: string) =>
    joinedContests.filter((jc) => jc.matchId === matchId);
  const getContestById = (contestId: string) => contests.find((c) => c.id === contestId);
  const getMatchById = (matchId: string) => matches.find((m) => m.id === matchId);

  return (
    <FantasyContext.Provider
      value={{
        matches,
        contests,
        userTeams,
        joinedContests,
        wallet,
        createOrUpdateTeam,
        joinContest,
        getTeamById,
        getTeamsForMatch,
        getJoinedContestsForMatch,
        getContestById,
        getMatchById,
      }}
    >
      {children}
    </FantasyContext.Provider>
  );
}

export function useFantasy() {
  const context = useContext(FantasyContext);
  if (!context) {
    throw new Error('useFantasy must be used within a FantasyProvider');
  }
  return context;
}
