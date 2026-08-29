export type PlayerRole = 'WK' | 'BAT' | 'AR' | 'BOWL';

export type MatchStatus = 'upcoming' | 'live' | 'completed';
export type MatchFormat = 'T20' | 'ODI' | 'TEST';

export interface PlayerStats {
  matches: number;
  runs: number;
  wickets: number;
  strikeRate?: number;
  economy?: number;
  recentPoints: number[];
  averagePoints: number;
  selectionRate: number; // percentage e.g. 78.5
}

export interface Player {
  id: string;
  name: string;
  shortName: string;
  teamId: string;
  teamCode: string;
  role: PlayerRole;
  credits: number;
  points: number;
  avatarUrl?: string;
  stats: PlayerStats;
  isCaptainSelected?: boolean;
  isViceCaptainSelected?: boolean;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  flag: string;
  color: string;
  secondaryColor: string;
}

export interface BallEvent {
  ball: string; // e.g. "14.2"
  bowlerName: string;
  batsmanName: string;
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  isSix: boolean;
  commentary: string;
}

export interface BatsmanScore {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissal?: string;
}

export interface BowlerScore {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface LiveMatchScore {
  currentInnings: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  battingScore: {
    runs: number;
    wickets: number;
    overs: number;
  };
  targetRuns?: number;
  crr: number;
  rrr?: number;
  currentBatsmen: BatsmanScore[];
  currentBowler: BowlerScore;
  recentBalls: string[];
  recentBallEvents: BallEvent[];
  partnerships: {
    runs: number;
    balls: number;
    batsman1: string;
    batsman2: string;
  };
}

export interface Match {
  id: string;
  title: string;
  series: string;
  format: MatchFormat;
  status: MatchStatus;
  startTime: string; // ISO string
  deadlineTime: string; // ISO string
  venue: string;
  city: string;
  teamA: Team;
  teamB: Team;
  totalPrizePool: number; // in UVBE
  contestCount: number;
  liveScore?: LiveMatchScore;
  players: Player[];
}

export interface ContestTier {
  id: string;
  matchId: string;
  name: string;
  type: 'Head-to-Head' | 'Small League' | 'Grand League' | 'Practice';
  entryFeeUVBE: number;
  maxParticipants: number;
  currentParticipants: number;
  totalPrizePoolUVBE: number;
  winnerPercentage: number;
  maxTeamsPerUser: number;
  firstPrizeUVBE: number;
  isGuaranteed: boolean;
  prizeBreakdown: {
    rankRange: string;
    prizeUVBE: number;
    percentage: number;
  }[];
}

export interface FantasyUserTeam {
  id: string;
  matchId: string;
  teamName: string;
  createdAt: string;
  playerIds: string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  totalCreditsUsed: number;
  pointsEarned: number;
  rank?: number;
}

export interface JoinedContest {
  id: string;
  contestId: string;
  matchId: string;
  userTeamId: string;
  joinedAt: string;
  entryFeePaidUVBE: number;
  rank: number;
  points: number;
  potentialWinningUVBE: number;
  settled: boolean;
  settledWinningsUVBE: number;
}

export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  userAddress: string;
  points: number;
  captainName: string;
  viceCaptainName: string;
  isUser: boolean;
  estimatedPrizeUVBE: number;
  movement?: 'up' | 'down' | 'same';
}

export interface FantasyWalletState {
  availableUVBE: number;
  fantasyLockedUVBE: number;
  fantasyRewardsUVBE: number;
  totalFantasyEntries: number;
  totalWonUVBE: number;
}

export interface FantasyRulesConfig {
  maxPlayers: number;
  maxCredits: number;
  maxPlayersPerRealTeam: number;
  rolesConfig: {
    WK: { min: number; max: number; label: string; name: string };
    BAT: { min: number; max: number; label: string; name: string };
    AR: { min: number; max: number; label: string; name: string };
    BOWL: { min: number; max: number; label: string; name: string };
  };
  scoringMultipliers: {
    captain: number;
    viceCaptain: number;
  };
}

export interface TeamValidationResult {
  isValid: boolean;
  totalPlayers: number;
  totalCredits: number;
  teamACount: number;
  teamBCount: number;
  roleCounts: Record<PlayerRole, number>;
  hasCaptain: boolean;
  hasViceCaptain: boolean;
  captainDistinctFromViceCaptain: boolean;
  errors: string[];
}
