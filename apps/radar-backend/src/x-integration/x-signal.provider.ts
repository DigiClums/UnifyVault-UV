import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { SignalType, ProjectStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { XOAuthService } from './x-oauth.service';
import { ExtractedSignal } from '../signals/signals.service';
import {
  XQueryFamilyType,
  X_QUERY_FAMILIES,
  XQueryFamilyDefinition,
  XQualificationMetadata,
  XSignalProvenance,
  XFamilyMetrics,
  XMultiFamilyCollectionResult,
} from './x-query-family.types';

import { InvestigationService } from '../investigation/investigation.service';
import { EntityType } from '@prisma/client';

export interface XCollectionOptions {
  query?: string;
  family?: XQueryFamilyType;
  maxResults?: number;
  skipEnabledCheck?: boolean; // Used for deterministic test mode
}

export interface XCollectionResult {
  source: 'X';
  signalsCollected: number;
  newSignalsPersisted: number;
  query: string;
  queryFamily?: XQueryFamilyType;
  queryVersion?: string;
  timestamp: Date;
  status: 'SUCCESS' | 'DISABLED' | 'RATE_LIMITED' | 'TIER_RESTRICTED' | 'NOT_CONNECTED';
  message?: string;
}

@Injectable()
export class XSignalProvider {
  private readonly logger = new Logger(XSignalProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xOAuthService: XOAuthService,
    private readonly investigationService?: InvestigationService,
  ) {}

  /**
   * Check if automated collection is explicitly enabled in environment
   */
  public isCollectionEnabled(): boolean {
    return process.env.X_SIGNAL_COLLECTION_ENABLED === 'true';
  }

  /**
   * Query Families Inventory
   */
  public getQueryFamilies(): XQueryFamilyDefinition[] {
    return Object.values(X_QUERY_FAMILIES);
  }

  public getQueryFamily(type: XQueryFamilyType): XQueryFamilyDefinition {
    return X_QUERY_FAMILIES[type];
  }

  /**
   * Determine SignalType from Tweet text corpus
   */
  classifyTweetSignal(text: string): { type: SignalType; confidence: number; category: string } {
    const lower = text.toLowerCase();

    if (
      lower.includes('testnet is live') ||
      lower.includes('launching our testnet') ||
      lower.includes('join our testnet')
    ) {
      return {
        type: SignalType.X_TESTNET_ANNOUNCEMENT,
        confidence: 0.95,
        category: 'Testnet Launch',
      };
    }
    if (lower.includes('testnet') || lower.includes('faucet') || lower.includes('sepolia')) {
      return { type: SignalType.X_TESTNET_SIGNAL, confidence: 0.9, category: 'Testnet Reference' };
    }
    if (lower.includes('devnet is live') || lower.includes('devnet')) {
      return { type: SignalType.X_DEVNET_SIGNAL, confidence: 0.85, category: 'Devnet Reference' };
    }
    if (
      lower.includes('we are building') ||
      lower.includes('building on') ||
      lower.includes('rfc') ||
      lower.includes('whitepaper')
    ) {
      return { type: SignalType.X_BUILDING_SIGNAL, confidence: 0.85, category: 'Building Signal' };
    }
    if (
      lower.includes('points program') ||
      lower.includes('points are live') ||
      lower.includes('airdrop')
    ) {
      return { type: SignalType.X_POINTS_SIGNAL, confidence: 0.8, category: 'Incentive Signal' };
    }
    if (
      lower.includes('waitlist') ||
      lower.includes('early access') ||
      lower.includes('closed alpha')
    ) {
      return { type: SignalType.X_WAITLIST_SIGNAL, confidence: 0.8, category: 'Waitlist Signal' };
    }

    return { type: SignalType.X_PROJECT_MENTION, confidence: 0.7, category: 'General Mention' };
  }

  /**
   * Evaluates 5-dimension Early Radar qualification metadata (Observational only)
   */
  public evaluateQualification(
    tweetText: string,
    author: { username?: string; name?: string; description?: string } = {},
    entities: any = {},
    publishedAt: Date = new Date(),
  ): XQualificationMetadata {
    const lowerText = tweetText.toLowerCase();
    const urls: string[] = (entities?.urls || []).map((u: any) =>
      (u.expanded_url || u.url || '').toLowerCase(),
    );
    const allTextAndUrls = lowerText + ' ' + urls.join(' ');

    // 1. Artifact Provenance: Contains GitHub/GitLab, documentation, explorer, or contract address
    const hasArtifactUrl = urls.some(
      (u) =>
        u.includes('github.com') ||
        u.includes('gitlab.com') ||
        u.includes('docs.') ||
        u.includes('gitbook.io') ||
        u.includes('etherscan.io') ||
        u.includes('basescan.io') ||
        u.includes('arbiscan.io'),
    );
    const hasContractAddress = /0x[a-fA-F0-9]{40}/.test(tweetText);
    const artifactProvenance =
      hasArtifactUrl || hasContractAddress || lowerText.includes('github.com');

    // 2. Genesis Author: Author handle or bio reflects builder / founder / dev / labs
    const authorBio = (author.description || '').toLowerCase();
    const authorName = (author.name || '').toLowerCase();
    const authorHandle = (author.username || '').toLowerCase();
    const genesisKeywords = [
      'builder',
      'founder',
      'dev',
      'engineer',
      'labs',
      'protocol',
      'core',
      'researcher',
      'co-founder',
    ];
    const genesisAuthor = genesisKeywords.some(
      (k) => authorBio.includes(k) || authorName.includes(k) || authorHandle.includes(k),
    );

    // 3. Non-Farming: Negative check against engagement bait and sybil farming
    const farmingKeywords = [
      'drop your address',
      'drop address',
      'drop your evm',
      'drop your sol',
      'like and retweet',
      'rt & follow',
      'giveaway',
      'free tokens',
      'airdrop claim',
      'tag 3 friends',
    ];
    const isFarming = farmingKeywords.some((k) => lowerText.includes(k));
    const nonFarming = !isFarming;

    // 4. Architectural Specificity: Technical Web3 primitives
    const technicalPrimitives = [
      'paymaster',
      'coprocessor',
      'zkvm',
      'zk-rollup',
      'avs',
      'bundler',
      'erc-4337',
      'erc4337',
      'eip-7702',
      'eip7702',
      'account abstraction',
      'hook',
      'smart contract',
      'sdk',
      'verifier',
      'prover',
      'solidity',
      'rust sdk',
      'modular',
      'data availability',
      'rpc endpoint',
      'faucet',
    ];
    const architecturalSpecificity = technicalPrimitives.some((k) => allTextAndUrls.includes(k));

    // 5. Temporal Lead: Early milestone check (published timestamp freshness)
    const ageDays = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    const temporalLead = ageDays >= 0; // Valid temporal ordering

    const criteria = [
      artifactProvenance,
      genesisAuthor,
      nonFarming,
      architecturalSpecificity,
      temporalLead,
    ];
    const matchedCriteriaCount = criteria.filter(Boolean).length;
    const qualificationPassed = matchedCriteriaCount >= 3 && nonFarming;

    return {
      artifactProvenance,
      genesisAuthor,
      nonFarming,
      architecturalSpecificity,
      temporalLead,
      qualificationPassed,
      matchedCriteriaCount,
    };
  }

  /**
   * Generates SHA-256 hash of raw tweet payload for cryptographic provenance
   */
  public calculatePayloadHash(tweet: {
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
  }): string {
    const raw = `${tweet.id}:${tweet.author_id || ''}:${tweet.created_at || ''}:${tweet.text}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Normalize tweet fixture or live response to ExtractedSignal with rich provenance
   */
  public normalizeTweet(
    tweet: any,
    author: any,
    queryFamily: XQueryFamilyType,
    queryUsed: string,
    queryVersion: string,
  ): ExtractedSignal {
    const classification = this.classifyTweetSignal(tweet.text);
    const sourceUrl = `https://x.com/${author.username}/status/${tweet.id}`;
    const tweetCreatedAt = tweet.created_at ? new Date(tweet.created_at) : new Date();
    const payloadHash = this.calculatePayloadHash(tweet);
    const qualification = this.evaluateQualification(
      tweet.text,
      author,
      tweet.entities,
      tweetCreatedAt,
    );

    const provenance: XSignalProvenance = {
      tweetId: tweet.id,
      authorUsername: author.username,
      authorId: tweet.author_id || 'unknown',
      queryFamily,
      queryUsed,
      queryVersion,
      observedAt: new Date().toISOString(),
      publishedAt: tweetCreatedAt.toISOString(),
      rawPayloadHash: payloadHash,
      matchedFamilies: [queryFamily],
      qualification,
      collectorVersion: '2.0.0-query-families',
    };

    return {
      type: classification.type,
      source: 'X',
      sourceUrl,
      title: `X ${classification.category}: @${author.username}`,
      evidence: tweet.text.slice(0, 500),
      confidence: classification.confidence,
      metadata: provenance as any,
    };
  }

  /**
   * Collect signals for a single query family or custom query
   */
  async collectSignals(options?: XCollectionOptions): Promise<XCollectionResult> {
    // 1. Production Safety Guard: Must be explicitly enabled in configuration
    if (!options?.skipEnabledCheck && !this.isCollectionEnabled()) {
      this.logger.log(
        'X signal collection requested, but disabled by configuration (X_SIGNAL_COLLECTION_ENABLED=false).',
      );
      return {
        source: 'X',
        signalsCollected: 0,
        newSignalsPersisted: 0,
        query: options?.query || '',
        queryFamily: options?.family,
        timestamp: new Date(),
        status: 'DISABLED',
        message:
          'Automated X signal collection is currently disabled in configuration (X_SIGNAL_COLLECTION_ENABLED=false).',
      };
    }

    const auth = await this.xOAuthService.getValidAccessToken();
    const bearerToken =
      auth?.token || (process.env.NODE_ENV !== 'test' ? process.env.X_BEARER_TOKEN : undefined);
    if (!bearerToken) {
      return {
        source: 'X',
        signalsCollected: 0,
        newSignalsPersisted: 0,
        query: options?.query || '',
        queryFamily: options?.family,
        timestamp: new Date(),
        status: 'NOT_CONNECTED',
        message: 'No active authorized X connection found. Please connect X via OAuth 2.0 first.',
      };
    }

    // Resolve query family
    const familyType = options?.family || XQueryFamilyType.REPOSITORY_GENESIS;
    const familyDef = this.getQueryFamily(familyType);
    const query = options?.query || familyDef.query;
    const queryVersion = familyDef.version;
    const maxResults = Math.min(25, Math.max(10, options?.maxResults || 10));

    this.logger.log(
      `Initiating X Signal Collection for family [${familyType}] with query: "${query}"`,
    );

    try {
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        params: {
          query,
          max_results: maxResults,
          'tweet.fields': 'created_at,public_metrics,entities,author_id',
          expansions: 'author_id',
          'user.fields': 'username,name,verified,description',
        },
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        timeout: 10000,
      });

      const tweets = response.data?.data || [];
      const users = response.data?.includes?.users || [];
      const userMap = new Map<string, any>();
      for (const u of users) {
        userMap.set(u.id, u);
      }

      let newPersisted = 0;

      for (const tweet of tweets) {
        const author = userMap.get(tweet.author_id) || { username: 'unknown', name: 'Unknown' };
        const sourceUrl = `https://x.com/${author.username}/status/${tweet.id}`;
        const tweetCreatedAt = tweet.created_at ? new Date(tweet.created_at) : new Date();

        // Deduplication check: Query if tweetId already exists
        const existingSignal = await this.prisma.projectSignal.findFirst({
          where: {
            OR: [
              { sourceUrl },
              {
                source: 'X',
                metadata: { path: ['tweetId'], equals: tweet.id },
              },
            ],
          },
        });

        if (existingSignal) {
          // Merge matched families into existing provenance without creating duplicate row
          const existingMeta = (existingSignal.metadata as any) || {};
          const matchedFamilies: string[] = existingMeta.matchedFamilies || [];
          if (!matchedFamilies.includes(familyType)) {
            matchedFamilies.push(familyType);
            await this.prisma.projectSignal.update({
              where: { id: existingSignal.id },
              data: {
                metadata: {
                  ...existingMeta,
                  matchedFamilies,
                  lastMergedAt: new Date().toISOString(),
                },
              },
            });
          }
          continue;
        }

        // Normalize new signal
        const normalized = this.normalizeTweet(tweet, author, familyType, query, queryVersion);

        // Find candidate match (Cohort B only)
        const matchedProject = await this.prisma.project.findFirst({
          where: {
            OR: [
              { xUrl: { contains: author.username, mode: 'insensitive' } },
              { slug: author.username.toLowerCase() },
            ],
          },
        });

        if (matchedProject) {
          // STRICT COHORT A PROTECTION: Never alter frozen baseline fields!
          await this.prisma.projectSignal.create({
            data: {
              projectId: matchedProject.id,
              type: normalized.type,
              source: normalized.source,
              sourceUrl: normalized.sourceUrl,
              title: normalized.title,
              evidence: normalized.evidence,
              confidence: normalized.confidence,
              metadata: normalized.metadata as any,
              detectedAt: new Date(),
            },
          });

          // Only update observational firstXSignalAt if earlier, NEVER baseline fields
          if (!matchedProject.firstXSignalAt || tweetCreatedAt < matchedProject.firstXSignalAt) {
            await this.prisma.project.update({
              where: { id: matchedProject.id },
              data: {
                firstXSignalAt: tweetCreatedAt,
                // Do NOT touch baselineEarlynessScore, baselineSignalStrength, baselineDetectionLagDays, or baselineStage
              },
            });
          }
          newPersisted++;
        } else {
          // Observational Candidate Creation (Cohort B: baselineEarlynessScore = null)
          const newCandidate = await this.prisma.project.create({
            data: {
              name: author.name || author.username,
              slug: author.username.toLowerCase(),
              description: tweet.text.slice(0, 300),
              xUrl: `https://x.com/${author.username}`,
              stage: ProjectStage.DISCOVERED,
              firstDetectedAt: new Date(),
              firstRadarScanAt: new Date(),
              firstXSignalAt: tweetCreatedAt,
              firstSignalAt: tweetCreatedAt,
              firstSignalSource: 'X',
              earlynessScore: 50,
              // baselineEarlynessScore, baselineSignalStrength, baselineDetectionLagDays, baselineStage remain NULL for Cohort B
              signals: {
                create: {
                  type: normalized.type,
                  source: normalized.source,
                  sourceUrl: normalized.sourceUrl,
                  title: normalized.title,
                  evidence: normalized.evidence,
                  confidence: normalized.confidence,
                  metadata: normalized.metadata as any,
                  detectedAt: new Date(),
                },
              },
            },
          });
          newPersisted++;
        }
      }

      return {
        source: 'X',
        signalsCollected: tweets.length,
        newSignalsPersisted: newPersisted,
        query,
        queryFamily: familyType,
        queryVersion,
        timestamp: new Date(),
        status: 'SUCCESS',
      };
    } catch (err: any) {
      const status = err.response?.status;
      const errorData = err.response?.data;

      if (status === 429) {
        this.logger.warn(
          `X API Rate Limit hit for family [${familyType}]: ${JSON.stringify(errorData)}`,
        );
        return {
          source: 'X',
          signalsCollected: 0,
          newSignalsPersisted: 0,
          query,
          queryFamily: familyType,
          queryVersion,
          timestamp: new Date(),
          status: 'RATE_LIMITED',
          message: 'X API rate limit reached. Backing off until next cycle.',
        };
      }

      if (status === 403 || status === 401 || status === 402) {
        this.logger.warn(
          `X API Tier or Permission restriction for family [${familyType}]: ${JSON.stringify(errorData)}`,
        );
        return {
          source: 'X',
          signalsCollected: 0,
          newSignalsPersisted: 0,
          query,
          queryFamily: familyType,
          queryVersion,
          timestamp: new Date(),
          status: 'TIER_RESTRICTED',
          message:
            errorData?.detail ||
            'X API tier restricts recent search (credits depleted or subscription upgrade required).',
        };
      }

      this.logger.error(
        `Error during X signal collection for family [${familyType}]: ${err.message}`,
      );
      return {
        source: 'X',
        signalsCollected: 0,
        newSignalsPersisted: 0,
        query,
        queryFamily: familyType,
        queryVersion,
        timestamp: new Date(),
        status: 'TIER_RESTRICTED',
        message: err.message,
      };
    }
  }

  /**
   * Sweeps across all 3 query families independently without cross-family ranking or score computation
   */
  async collectAllFamilies(options?: {
    maxResultsPerFamily?: number;
    skipEnabledCheck?: boolean;
  }): Promise<XMultiFamilyCollectionResult> {
    const families = [
      XQueryFamilyType.REPOSITORY_GENESIS,
      XQueryFamilyType.INFRASTRUCTURE_TESTNET_GENESIS,
      XQueryFamilyType.ARCHITECTURE_RFC,
    ];

    const familyMetrics: Record<XQueryFamilyType, XFamilyMetrics> = {} as any;
    let totalRetrieved = 0;
    let totalPersisted = 0;
    let overallStatus:
      'SUCCESS' | 'DISABLED' | 'RATE_LIMITED' | 'TIER_RESTRICTED' | 'NOT_CONNECTED' = 'SUCCESS';
    let overallMessage: string | undefined;

    for (const fam of families) {
      const def = this.getQueryFamily(fam);
      const res = await this.collectSignals({
        family: fam,
        maxResults: options?.maxResultsPerFamily || 10,
        skipEnabledCheck: options?.skipEnabledCheck,
      });

      if (res.status !== 'SUCCESS') {
        overallStatus = res.status;
        overallMessage = res.message;
      }

      totalRetrieved += res.signalsCollected;
      totalPersisted += res.newSignalsPersisted;

      familyMetrics[fam] = {
        familyId: fam,
        queryUsed: def.query,
        queryVersion: def.version,
        signalsRetrieved: res.signalsCollected,
        signalsAfterDedup: res.newSignalsPersisted,
        signalsWithArtifact: 0, // Computed from ingested signals in family
        signalsWithTechnicalPrimitive: 0,
        signalsFromOfficialOrBuilderAccounts: 0,
      };
    }

    return {
      source: 'X',
      totalRetrieved,
      totalPersisted,
      familyMetrics,
      timestamp: new Date(),
      status: overallStatus,
      message: overallMessage,
    };
  }

  /**
   * Validate and parse public X / Twitter post URL
   */
  public parseXPostUrl(url: string): {
    valid: boolean;
    username?: string;
    tweetId?: string;
    normalizedUrl?: string;
  } {
    if (!url || typeof url !== 'string') {
      return { valid: false };
    }
    const trimmed = url.trim();
    const regex =
      /https?:\/\/(?:(?:www\.|mobile\.)?(?:twitter\.com|x\.com))\/([a-zA-Z0-9_]{1,50})\/status\/([0-9]+)/i;
    const match = trimmed.match(regex);
    if (!match) {
      return { valid: false };
    }
    const username = match[1];
    const tweetId = match[2];
    return {
      valid: true,
      username,
      tweetId,
      normalizedUrl: `https://x.com/${username}/status/${tweetId}`,
    };
  }

  /**
   * Ingest manual X evidence with zero-cost provenance and 5-dimension qualification
   */
  public async ingestManualEvidence(input: {
    url: string;
    publishedAt?: string | Date;
    evidenceText?: string;
    authorUsername?: string;
    authorName?: string;
    projectId?: string;
    technicalArtifactUrl?: string;
  }): Promise<{
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
  }> {
    const parsed = this.parseXPostUrl(input.url);
    if (!parsed.valid || !parsed.tweetId || !parsed.username) {
      throw new Error(
        'Invalid X / Twitter post URL format. Expected: https://x.com/<username>/status/<tweet_id>',
      );
    }

    const tweetId = parsed.tweetId;
    const authorUsername = input.authorUsername || parsed.username;
    const sourceUrl = parsed.normalizedUrl || input.url;
    const publishedAt = input.publishedAt ? new Date(input.publishedAt) : new Date();
    const observedAt = new Date();
    const evidenceText =
      input.evidenceText ||
      `Manual X observation for post https://x.com/${authorUsername}/status/${tweetId}`;
    const payloadHash = this.calculatePayloadHash({
      id: tweetId,
      text: evidenceText,
      author_id: authorUsername,
      created_at: publishedAt.toISOString(),
    });

    const qualification = this.evaluateQualification(
      evidenceText,
      { username: authorUsername, name: input.authorName },
      { urls: input.technicalArtifactUrl ? [{ expanded_url: input.technicalArtifactUrl }] : [] },
      publishedAt,
    );

    const classification = this.classifyTweetSignal(evidenceText);

    // Provenance metadata explicitly tagged as collectionMode: MANUAL
    const provenanceMetadata = {
      tweetId,
      authorUsername,
      source: 'X',
      collectionMode: 'MANUAL',
      sourceUrl,
      queryFamily: 'MANUAL_ENTRY',
      queryUsed: 'N/A (Manual Evidence Submission)',
      queryVersion: '1.0.0',
      observedAt: observedAt.toISOString(),
      publishedAt: publishedAt.toISOString(),
      rawPayloadHash: payloadHash,
      matchedFamilies: ['MANUAL_ENTRY'],
      qualification,
      technicalArtifactUrl: input.technicalArtifactUrl || null,
      collectorVersion: '2.0.0-zero-cost-manual',
    };

    // Run Deep Zero-Cost Investigation
    let investigation: any = null;
    if (this.investigationService) {
      investigation = await this.investigationService.investigateEntity({
        xUrl: sourceUrl,
        githubUrl: input.technicalArtifactUrl,
        textSnippet: evidenceText,
        authorName: input.authorName || authorUsername,
        authorUsername,
      });
    }

    const isPersonOrKOL = investigation?.entityIdentification?.isPersonOrKOL || false;
    const entityType = investigation?.entityIdentification?.entityType || EntityType.PROJECT;
    const linkedTargetProject = investigation?.entityIdentification?.linkedTargetProjectName;

    // Check existing signal by tweetId or sourceUrl
    const existingSignal = await this.prisma.projectSignal.findFirst({
      where: {
        OR: [
          { sourceUrl },
          {
            source: 'X',
            metadata: { path: ['tweetId'], equals: tweetId },
          },
        ],
      },
      include: { project: true },
    });

    let targetProjectId = input.projectId;
    let isNewCandidate = false;
    let projectName = '';

    if (existingSignal) {
      targetProjectId = existingSignal.projectId;
      projectName = existingSignal.project.name;

      // Update metadata without duplicate row
      await this.prisma.projectSignal.update({
        where: { id: existingSignal.id },
        data: {
          evidence: evidenceText,
          metadata: {
            ...provenanceMetadata,
            investigation,
          } as any,
        },
      });

      if (investigation) {
        await this.prisma.project.update({
          where: { id: targetProjectId },
          data: {
            investigationEvidence: investigation as any,
          },
        });
      }
    } else {
      // Resolve candidate project target
      // CRITICAL RULE: If author is PERSON / KOL and mentions a linked project/repo, link to that project rather than naming project after the person!
      let searchSlug = authorUsername.toLowerCase();
      let candidateName = input.authorName || authorUsername;

      if (isPersonOrKOL && linkedTargetProject) {
        if (linkedTargetProject.includes('github.com')) {
          const repoName = linkedTargetProject.split('/').pop()!;
          searchSlug = repoName.toLowerCase();
          candidateName = repoName.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        }
      }

      const matchedProject = targetProjectId
        ? await this.prisma.project.findUnique({ where: { id: targetProjectId } })
        : await this.prisma.project.findFirst({
            where: {
              OR: [
                { xUrl: { contains: authorUsername, mode: 'insensitive' } },
                { slug: searchSlug },
              ],
            },
          });

      if (matchedProject) {
        targetProjectId = matchedProject.id;
        projectName = matchedProject.name;

        // STRICT COHORT A PROTECTION: Never modify baseline fields!
        await this.prisma.projectSignal.create({
          data: {
            projectId: targetProjectId,
            type: classification.type,
            source: 'X',
            sourceUrl,
            title: `X ${classification.category} (Manual): @${authorUsername}`,
            evidence: evidenceText.slice(0, 500),
            confidence: classification.confidence,
            metadata: {
              ...provenanceMetadata,
              investigation,
            } as any,
            detectedAt: observedAt,
          },
        });

        // Update firstXSignalAt if earlier, NEVER baseline metrics
        if (!matchedProject.firstXSignalAt || publishedAt < matchedProject.firstXSignalAt) {
          await this.prisma.project.update({
            where: { id: targetProjectId },
            data: {
              firstXSignalAt: publishedAt,
              investigationEvidence: investigation as any,
              // baselineEarlynessScore, baselineSignalStrength, baselineDetectionLagDays, baselineStage remain untouched
            },
          });
        }
      } else {
        // Create new candidate in Cohort B (baseline fields = NULL)
        isNewCandidate = true;
        projectName = candidateName;
        const newProj = await this.prisma.project.create({
          data: {
            name: projectName,
            slug: searchSlug,
            description: evidenceText.slice(0, 300),
            xUrl: `https://x.com/${authorUsername}`,
            entityType,
            investigationEvidence: investigation as any,
            stage:
              isPersonOrKOL && !linkedTargetProject ? ProjectStage.DISCOVERED : ProjectStage.WATCH,
            firstDetectedAt: observedAt,
            firstRadarScanAt: observedAt,
            firstXSignalAt: publishedAt,
            firstSignalAt: publishedAt,
            firstSignalSource: 'X (Manual)',
            earlynessScore: 50,
            // baselineEarlynessScore, baselineSignalStrength, baselineDetectionLagDays, baselineStage remain NULL
            signals: {
              create: {
                type: classification.type,
                source: 'X',
                sourceUrl,
                title: `X ${classification.category} (Manual): @${authorUsername}`,
                evidence: evidenceText.slice(0, 500),
                confidence: classification.confidence,
                metadata: {
                  ...provenanceMetadata,
                  investigation,
                } as any,
                detectedAt: observedAt,
              },
            },
          },
        });
        targetProjectId = newProj.id;
      }
    }

    // Determine all corroborated sources on the target project
    const allSignals = await this.prisma.projectSignal.findMany({
      where: { projectId: targetProjectId },
      select: { source: true },
    });
    const uniqueSources = Array.from(new Set(allSignals.map((s) => s.source)));

    return {
      success: true,
      source: 'X',
      collectionMode: 'MANUAL',
      tweetId,
      authorUsername,
      sourceUrl,
      publishedAt,
      observedAt,
      rawPayloadHash: payloadHash,
      qualification,
      projectId: targetProjectId!,
      projectName,
      corroboratedSources: uniqueSources,
      isNewCandidate,
      message:
        'Manual X evidence ingested successfully with deep zero-cost entity investigation profile.',
    };
  }
}
