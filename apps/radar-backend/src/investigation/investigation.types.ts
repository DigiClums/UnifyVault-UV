import { EntityType, ProjectStage } from '@prisma/client';

export { EntityType };

export enum RepoRelationship {
  OFFICIAL = 'OFFICIAL',
  LIKELY_OFFICIAL = 'LIKELY_OFFICIAL',
  RELATED = 'RELATED',
  FORK = 'FORK',
  TEMPLATE = 'TEMPLATE',
  EXAMPLE = 'EXAMPLE',
  UNRELATED = 'UNRELATED',
}

export enum VerificationDegree {
  DOCUMENTED = 'DOCUMENTED',
  VERIFIED = 'VERIFIED',
  CLAIMED = 'CLAIMED',
  NOT_FOUND = 'NOT_FOUND',
}

export enum IncentiveStatus {
  TOKEN_EXISTS = 'TOKEN_EXISTS',
  TOKEN_ANNOUNCED = 'TOKEN_ANNOUNCED',
  AIRDROP_ANNOUNCED = 'AIRDROP_ANNOUNCED',
  POINTS_PROGRAM = 'POINTS_PROGRAM',
  INCENTIVE_TESTNET = 'INCENTIVE_TESTNET',
  NOT_FOUND = 'NOT_FOUND',
}

export interface DiscoveredSourceUrl {
  sourceType: 'X' | 'GITHUB' | 'WEBSITE' | 'DOCS' | 'DISCORD' | 'TELEGRAM' | 'EXPLORER' | 'OTHER';
  url: string;
  discoveredFrom: string;
  firstSeenAt: string;
  lastVerifiedAt: string;
}

export interface TechnicalArtifactsReport {
  languages: string[];
  hasSmartContracts: boolean;
  contractFrameworks: string[]; // Foundry, Hardhat, Anchor, etc.
  technicalPrimitives: string[]; // ERC-4337, zkVM, AVS, coprocessor, etc.
  hasTestnetDeployments: boolean;
  hasMainnetDeployments: boolean;
  repositoryAgeDays: number;
  commitVelocity: number;
  contributorDiversity: 'LOW' | 'MEDIUM' | 'HIGH';
  relationship: RepoRelationship;
}

export interface OnChainEvidenceReport {
  onChainEvidenceScore: number;
  networks: string[];
  contractAddresses: string[];
  status: 'VERIFIED_CONTRACTS' | 'BYTECODE_DETECTED' | 'ON_CHAIN_EVIDENCE_NOT_FOUND';
  deploymentTxCount: number;
  notes: string;
}

export interface EvidenceMatrixCategory {
  score: number;
  maxScore: number;
  evidence: string;
  sourceUrls: string[];
  confidence: number;
  lastVerifiedAt: string;
  missingReason?: string;
}

export interface CompleteEvidenceMatrix {
  development: EvidenceMatrixCategory;
  onChain: EvidenceMatrixCategory;
  community: EvidenceMatrixCategory;
  funding: EvidenceMatrixCategory;
  productDocs: EvidenceMatrixCategory;
  incentives: EvidenceMatrixCategory;
  team: EvidenceMatrixCategory;
  technicalNovelty: EvidenceMatrixCategory;
  crossSourceCorroboration: EvidenceMatrixCategory;
  totalSignalStrength: number;
}

export interface CorroborationGraphNode {
  source: 'X' | 'WEBSITE' | 'GITHUB' | 'CONTRACT' | 'TESTNET';
  url: string;
  verified: boolean;
  discoveredAt: string;
  details: string;
}

export interface CorroborationGraph {
  mode: 'MANUAL' | 'AUTOMATED' | 'CORROBORATED' | 'MULTI_SOURCE_CORROBORATED';
  nodes: CorroborationGraphNode[];
  edges: Array<{ from: string; to: string; relationship: string }>;
}

export interface DeepInvestigationReport {
  entityIdentification: {
    name: string;
    entityType: EntityType;
    isPersonOrKOL: boolean;
    linkedTargetProjectName?: string;
    officialIdentity: string;
    primaryDiscoverySource: string;
  };
  claimedFeatures: string[];
  independentlyVerifiedFacts: string[];
  technicalArchitecture: string;
  githubAnalysis: TechnicalArtifactsReport;
  onChainAnalysis: OnChainEvidenceReport;
  teamAnalysis: {
    identifiedMembers: string[];
    contributorDiversity: 'LOW' | 'MEDIUM' | 'HIGH';
    notes: string;
  };
  fundingAnalysis: {
    status: VerificationDegree;
    amount?: string;
    funders: string[];
    evidenceUrl?: string;
  };
  tokenIncentiveAnalysis: {
    status: IncentiveStatus;
    details: string;
  };
  communityEvidence: {
    xFollowers?: number;
    githubStars?: number;
    notes: string;
  };
  crossSourceCorroboration: CorroborationGraph;
  missingEvidence: string[];
  redFlags: string[];
  currentStatus: ProjectStage;
  recommendedNextInvestigationStep: string;
  evidenceMatrix: CompleteEvidenceMatrix;
  earlynessVsSignalRating: {
    earlynessScore: number;
    signalStrength: number;
    verdict: string; // e.g. "VERY EARLY / HIGH TECHNICAL EVIDENCE"
  };
  generatedAt: string;
}
