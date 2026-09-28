import { SignalType } from '@prisma/client';

export enum XQueryFamilyType {
  REPOSITORY_GENESIS = 'REPOSITORY_GENESIS',
  INFRASTRUCTURE_TESTNET_GENESIS = 'INFRASTRUCTURE_TESTNET_GENESIS',
  ARCHITECTURE_RFC = 'ARCHITECTURE_RFC',
}

export interface XQueryFamilyDefinition {
  id: XQueryFamilyType;
  name: string;
  query: string;
  version: string;
  description: string;
  expectedSignalTypes: SignalType[];
}

export const X_QUERY_FAMILIES: Record<XQueryFamilyType, XQueryFamilyDefinition> = {
  [XQueryFamilyType.REPOSITORY_GENESIS]: {
    id: XQueryFamilyType.REPOSITORY_GENESIS,
    name: 'Family 1 — Repository / Code Genesis',
    query:
      '("building on" OR "open sourced" OR "smart contract") (url:github.com OR url:gitlab.com) (EVM OR Ethereum OR Base OR Arbitrum OR Solana) -is:retweet lang:en',
    version: '1.0.0',
    description:
      'High-precision sweep for open-source code repositories and smart contract genesis posts with code links.',
    expectedSignalTypes: [
      SignalType.X_BUILDING_SIGNAL,
      SignalType.X_BUILDING_UPDATE,
      SignalType.GITHUB_SMART_CONTRACT_CODE,
    ],
  },
  [XQueryFamilyType.INFRASTRUCTURE_TESTNET_GENESIS]: {
    id: XQueryFamilyType.INFRASTRUCTURE_TESTNET_GENESIS,
    name: 'Family 2 — Infrastructure / Testnet Genesis',
    query:
      '(testnet OR devnet) ("faucet" OR "explorer" OR "RPC" OR "documentation" OR "deploy") (Base OR Ethereum OR ZK OR Rollup OR AVS) -airdrop -giveaway -is:retweet lang:en',
    version: '1.0.0',
    description:
      'Infrastructure and testnet announcement sweep with actionability keywords and farming negative-filters.',
    expectedSignalTypes: [
      SignalType.X_TESTNET_ANNOUNCEMENT,
      SignalType.X_TESTNET_SIGNAL,
      SignalType.X_DEVNET_SIGNAL,
    ],
  },
  [XQueryFamilyType.ARCHITECTURE_RFC]: {
    id: XQueryFamilyType.ARCHITECTURE_RFC,
    name: 'Family 3 — Architecture / RFC Announcements',
    query:
      '("announcing" OR "introducing" OR "RFC") ("protocol" OR "SDK" OR "coprocessor" OR "verifier" OR "modular") (crypto OR web3 OR Ethereum OR Base) -is:retweet lang:en',
    version: '1.0.0',
    description:
      'Early technical primitive and protocol RFC announcements before widespread tracker indexing.',
    expectedSignalTypes: [
      SignalType.X_ALPHA_SIGNAL,
      SignalType.X_FOUNDER_POST,
      SignalType.X_PROJECT_LAUNCH,
    ],
  },
};

export interface XQualificationMetadata {
  artifactProvenance: boolean;
  genesisAuthor: boolean;
  nonFarming: boolean;
  architecturalSpecificity: boolean;
  temporalLead: boolean;
  qualificationPassed: boolean;
  matchedCriteriaCount: number;
}

export interface XSignalProvenance {
  tweetId: string;
  authorUsername: string;
  authorId: string;
  queryFamily: XQueryFamilyType;
  queryUsed: string;
  queryVersion: string;
  observedAt: string;
  publishedAt: string;
  rawPayloadHash: string;
  matchedFamilies: XQueryFamilyType[];
  qualification: XQualificationMetadata;
  collectorVersion: string;
}

export interface XFamilyMetrics {
  familyId: XQueryFamilyType;
  queryUsed: string;
  queryVersion: string;
  signalsRetrieved: number;
  signalsAfterDedup: number;
  signalsWithArtifact: number;
  signalsWithTechnicalPrimitive: number;
  signalsFromOfficialOrBuilderAccounts: number;
}

export interface XMultiFamilyCollectionResult {
  source: 'X';
  totalRetrieved: number;
  totalPersisted: number;
  familyMetrics: Record<XQueryFamilyType, XFamilyMetrics>;
  timestamp: Date;
  status: 'SUCCESS' | 'DISABLED' | 'RATE_LIMITED' | 'TIER_RESTRICTED' | 'NOT_CONNECTED';
  message?: string;
}

export interface XManualEvidenceInput {
  url: string;
  publishedAt?: string | Date;
  evidenceText?: string;
  authorUsername?: string;
  authorName?: string;
  projectId?: string;
  technicalArtifactUrl?: string;
}

export interface XManualEvidenceResult {
  success: boolean;
  source: 'X';
  collectionMode: 'MANUAL';
  tweetId: string;
  authorUsername: string;
  sourceUrl: string;
  publishedAt: Date;
  observedAt: Date;
  rawPayloadHash: string;
  qualification: XQualificationMetadata;
  projectId: string;
  projectName: string;
  corroboratedSources: string[];
  isNewCandidate: boolean;
  message: string;
}
