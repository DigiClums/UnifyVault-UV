export const RADAR_API_BASE =
  typeof window !== 'undefined'
    ? '/api/radar'
    : process.env.NEXT_PUBLIC_RADAR_API_URL || 'http://127.0.0.1:4005';

export interface ScoreSnapshot {
  id: string;
  projectId: string;
  developmentScore: number;
  onchainScore: number;
  communityScore: number;
  fundingScore: number;
  productScore: number;
  incentiveScore: number;
  totalScore: number;
  earlynessScore?: number;
  explanations?: {
    development: string[];
    onchain: string[];
    community: string[];
    funding: string[];
    product: string[];
    incentive: string[];
    penalties?: string[];
  };
  calculatedAt: string;
}

export interface ProjectSignal {
  id: string;
  projectId: string;
  type: string;
  source: string;
  sourceUrl: string | null;
  title: string;
  evidence: string;
  confidence: number;
  detectedAt: string;
  metadata?: any;
}

export interface GitHubRepository {
  id: string;
  projectId: string;
  repositoryUrl: string;
  owner: string;
  repository: string;
  createdAtGithub: string | null;
  stars: number;
  forks: number;
  contributors: number;
  recentCommits: number;
  lastCommitAt: string | null;
  language: string | null;
  topics: string[];
}

export interface ResearchReport {
  id: string;
  projectId: string;
  summary: string;
  confirmedFacts: string[];
  unconfirmedClaims: string[];
  risks: string[];
  detectedSignals: string[];
  suggestedResearchActions: string[];
  generatedAt: string;
}

export interface ProjectTimelineEvent {
  id: string;
  projectId: string;
  eventType: string;
  title: string;
  description: string;
  sourceUrl: string | null;
  eventDate: string;
}

export interface ProjectOutcome {
  id: string;
  projectId: string;
  status:
    | 'PENDING'
    | 'ACTIVE'
    | 'ABANDONED'
    | 'TESTNET'
    | 'MAINNET'
    | 'TOKEN_LAUNCHED'
    | 'INCENTIVE_CONFIRMED'
    | 'TRACKER_LISTED'
    | 'NO_LONGER_ACTIVE';
  observedAt: string;
  source: string;
  sourceUrl?: string | null;
  evidence: string;
  notes?: string | null;
  createdAt: string;
}

export interface ExternalDiscoveryEvent {
  id: string;
  projectId: string;
  source: string;
  sourceUrl?: string | null;
  discoveryType:
    | 'AIRDROP_TRACKER'
    | 'CRYPTO_NEWS'
    | 'PROJECT_DIRECTORY'
    | 'MAJOR_SOCIAL_ACCOUNT'
    | 'OFFICIAL_ANNOUNCEMENT'
    | 'OTHER';
  discoveredAt: string;
  evidence: string;
  createdAt: string;
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  snapshotDate: string;
  stage: string;
  earlinessScore: number;
  signalStrength: number;
  githubStars: number;
  githubForks: number;
  contributors: number;
  recentCommits: number;
  onchainActivity: number;
  communityActivity: number;
  createdAt: string;
}

export interface ValidationSummary {
  baselineDate: string;
  baselineCount: number;
  newCandidates: number;
  totalCandidates: number;
  freshCandidates: number;
  activeCandidates: number;
  activeAfter7Days: number | null;
  activeAfter14Days: number | null;
  activeAfter30Days: number | null;
  abandonedCandidates: number;
  rejectedCandidates: number;
  externalDiscoveries: number;
  positiveLeadTimes: number;
  negativeLeadTimes: number;
  medianLeadTime: number | null;
  medianDetectionLag: number | null;
  falsePositiveRate: number | null;
  firstSignalSourceDistribution: Record<string, number>;
  signalSequenceDistribution: Record<string, number>;
  rejectionReasonDistribution: Record<string, number>;
  externalDiscoveryCategoryBreakdown?: Record<
    string,
    { count: number; medianLeadTime: number | null }
  >;
  candidates: {
    id: string;
    name: string;
    slug: string;
    stage: string;
    status: string;
    rejectionReason: string | null;
    isBaseline: boolean;
    firstDetectedAt: string;
    firstRadarScanAt: string;
    githubCreatedAt: string | null;
    detectionLagDays: number | null;
    externalDiscoveryDate: string | null;
    actualLeadTimeDays: number | null;
    earlynessScore: number;
    signalStrength: number;
    baselineEarlynessScore?: number;
    baselineSignalStrength?: number;
    baselineDetectionLagDays?: number | null;
    baselineStage?: string;
    verificationType?:
      'NONE' | 'CODE_VERIFIED' | 'CONTRACT_VERIFIED' | 'IDENTITY_VERIFIED' | 'TRACKER_VERIFIED';
    signalDelta?: number;
    earlynessDelta?: number;
    precedenceSource: string;
    sequenceLabel: string;
    signalSequence: string[];
    outcomesCount: number;
    latestOutcome?: {
      status: string;
      observedAt: string;
      source: string;
      evidence: string;
    } | null;
    externalDiscoveriesCount: number;
    latestExternalDiscovery?: {
      source: string;
      discoveryType: string;
      discoveredAt: string;
      evidence: string;
    } | null;
    snapshotsCount: number;
    isTutorialOrFork: boolean;
  }[];
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  docsUrl: string | null;
  xUrl: string | null;
  discordUrl: string | null;
  stage: 'DISCOVERED' | 'EARLY' | 'WATCH' | 'TESTNET' | 'MAINNET' | 'VERIFIED';
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVIEW';
  verificationType?:
    'NONE' | 'CODE_VERIFIED' | 'CONTRACT_VERIFIED' | 'IDENTITY_VERIFIED' | 'TRACKER_VERIFIED';
  rejectionReason?: string | null;
  firstDetectedAt: string;
  firstRadarScanAt?: string;
  githubCreatedAt?: string | null;
  firstXSignalAt?: string | null;
  firstSignalAt?: string | null;
  firstSignalSource?: string | null;
  firstMeaningfulSignalAt?: string | null;
  firstMeaningfulSignalType?: string | null;
  detectionLagDays?: number | null;
  externalDiscoveryDate?: string | null;
  actualLeadTimeDays?: number | null;
  earlynessScore?: number;
  baselineEarlynessScore?: number;
  baselineSignalStrength?: number;
  baselineDetectionLagDays?: number | null;
  baselineStage?: string;
  signalDelta?: number;
  earlynessDelta?: number;
  isTutorialOrFork?: boolean;
  whyDetected?: string[];
  whyNotDetected?: string[];
  lastCheckedAt: string;
  latestScore?: ScoreSnapshot | null;
  scores?: ScoreSnapshot[];
  signals?: ProjectSignal[];
  githubRepository?: GitHubRepository | null;
  researchReports?: ResearchReport[];
  timelineEvents?: ProjectTimelineEvent[];
  outcomes?: ProjectOutcome[];
  externalDiscoveries?: ExternalDiscoveryEvent[];
  snapshots?: ProjectSnapshot[];
}

export async function fetchProjects(params?: {
  stage?: string;
  status?: string;
  search?: string;
  sort?: string;
}): Promise<Project[]> {
  const query = new URLSearchParams();
  if (params?.stage) query.set('stage', params.stage);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.sort) query.set('sort', params.sort);

  const res = await fetch(`${RADAR_API_BASE}/projects?${query.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function fetchProjectBySlug(slug: string): Promise<Project> {
  const res = await fetch(`${RADAR_API_BASE}/projects/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function fetchValidationSummary(): Promise<ValidationSummary> {
  const res = await fetch(`${RADAR_API_BASE}/validation/summary`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch validation summary');
  return res.json();
}

export async function recordProjectOutcome(
  id: string,
  payload: {
    status: string;
    source: string;
    sourceUrl?: string;
    evidence: string;
    notes?: string;
    observedAt?: string;
  },
) {
  const res = await fetch(`${RADAR_API_BASE}/validation/projects/${id}/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to record outcome');
  return res.json();
}

export async function recordExternalDiscovery(
  id: string,
  payload: {
    source: string;
    sourceUrl?: string;
    discoveryType: string;
    discoveredAt: string;
    evidence: string;
  },
) {
  const res = await fetch(`${RADAR_API_BASE}/validation/projects/${id}/external-discovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to record external discovery');
  return res.json();
}

export async function rejectCandidate(
  id: string,
  payload: {
    rejectionReason: string;
    notes?: string;
  },
) {
  const res = await fetch(`${RADAR_API_BASE}/validation/projects/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to reject candidate');
  return res.json();
}

export async function triggerValidationSnapshot() {
  const res = await fetch(`${RADAR_API_BASE}/validation/snapshot/run`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to run validation snapshot');
  return res.json();
}

export async function triggerGitHubDiscovery(query?: string, limit?: number) {
  const res = await fetch(`${RADAR_API_BASE}/discovery/github/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error('Discovery trigger failed');
  return res.json();
}

export async function verifyProjectStatus(
  slug: string,
  status: string,
  stage?: string,
  notes?: string,
) {
  const res = await fetch(`${RADAR_API_BASE}/projects/${slug}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, stage, notes }),
  });
  if (!res.ok) throw new Error('Project verification failed');
  return res.json();
}

export async function recalculateProjectScore(slug: string) {
  const res = await fetch(`${RADAR_API_BASE}/projects/${slug}/recalculate-score`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Recalculate score failed');
  return res.json();
}

export interface XIntegrationStatus {
  connected: boolean;
  xUsername: string | null;
  xUserId: string | null;
  scopes: string[];
  tokenExpiresAt: string | null;
  lastSuccessfulApiCallAt: string | null;
  lastErrorAt: string | null;
}

export async function fetchXStatus(): Promise<XIntegrationStatus> {
  const res = await fetch(`${RADAR_API_BASE}/integrations/x/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch X integration status');
  return res.json();
}

export async function getXConnectUrl(): Promise<{ url: string; state: string }> {
  const res = await fetch(`${RADAR_API_BASE}/integrations/x/connect`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to initiate X OAuth flow');
  return res.json();
}

export async function disconnectX() {
  const res = await fetch(`${RADAR_API_BASE}/integrations/x/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to disconnect X integration');
  return res.json();
}

export async function triggerXSignalCollection(query?: string, maxResults?: number) {
  const res = await fetch(`${RADAR_API_BASE}/integrations/x/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, maxResults }),
  });
  if (!res.ok) throw new Error('Failed to trigger X signal collection');
  return res.json();
}

export interface CorrelatedDiscoveryItem {
  id: string;
  projectId: string;
  projectName: string;
  slug: string;
  source: string;
  collectionMode: 'AUTOMATED' | 'MANUAL' | 'CORROBORATED';
  sourceUrl: string | null;
  sourceTimestamp: string | null;
  observedAt: string;
  technicalArtifact: {
    hasGithub: boolean;
    hasContract: boolean;
    hasDocs: boolean;
    technicalMatches: string[];
  };
  xCorroboration: boolean;
  githubCorroboration: boolean;
  contractCorroboration: boolean;
  stage: string;
  status: string;
  cohort: 'COHORT_A_FROZEN' | 'COHORT_B_OBSERVATIONAL';
}

export async function fetchCorrelatedDiscoveryFeed(limit = 50): Promise<CorrelatedDiscoveryItem[]> {
  const res = await fetch(`${RADAR_API_BASE}/discovery/feed?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch correlated discovery feed');
  return res.json();
}

export async function submitManualXEvidence(payload: {
  url: string;
  publishedAt?: string;
  evidenceText?: string;
  authorUsername?: string;
  authorName?: string;
  projectId?: string;
  technicalArtifactUrl?: string;
}) {
  const res = await fetch(`${RADAR_API_BASE}/integrations/x/manual-evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to submit manual X evidence');
  }
  return res.json();
}

export async function runDeepInvestigation(payload: {
  xUrl?: string;
  githubUrl?: string;
  projectId?: string;
  textSnippet?: string;
  authorName?: string;
  authorUsername?: string;
}) {
  const res = await fetch(`${RADAR_API_BASE}/investigation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to execute deep investigation');
  }
  return res.json();
}
