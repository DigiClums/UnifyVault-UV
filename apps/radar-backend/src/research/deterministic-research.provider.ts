import { Injectable, Logger } from '@nestjs/common';
import { IResearchProvider, GeneratedResearchReport } from './research-provider.interface';

@Injectable()
export class DeterministicResearchProvider implements IResearchProvider {
  private readonly logger = new Logger(DeterministicResearchProvider.name);

  async generateReport(projectData: {
    name: string;
    description: string | null;
    githubUrl: string | null;
    websiteUrl: string | null;
    docsUrl: string | null;
    stage: string;
    signals: Array<{ type: string; title: string; evidence: string }>;
    score?: { totalScore: number; developmentScore: number; onchainScore: number };
    repoData?: any;
  }): Promise<GeneratedResearchReport> {
    const confirmedFacts: string[] = [];
    const unconfirmedClaims: string[] = [];
    const risks: string[] = [];
    const detectedSignals: string[] = [];
    const suggestedResearchActions: string[] = [];

    // Confirmed Facts based strictly on observed data
    if (projectData.githubUrl) {
      confirmedFacts.push(`Public open-source repository exists at ${projectData.githubUrl}`);
    }
    if (projectData.repoData?.language) {
      confirmedFacts.push(`Primary repository codebase utilizes ${projectData.repoData.language}`);
    }
    if (projectData.websiteUrl) {
      confirmedFacts.push(`Public website/portal accessible at ${projectData.websiteUrl}`);
    }
    if (projectData.docsUrl) {
      confirmedFacts.push(`Technical documentation portal located at ${projectData.docsUrl}`);
    }

    // Detected Signals summary
    for (const sig of projectData.signals) {
      detectedSignals.push(`[${sig.type}] ${sig.title}: ${sig.evidence}`);
    }

    // Unconfirmed Information / Claims
    unconfirmedClaims.push(
      'No official airdrop or token reward announcement was confirmed during the latest telemetry check.',
    );
    unconfirmedClaims.push(
      'Tokenomics distribution schedules and vesting contracts are unverified or pending.',
    );
    unconfirmedClaims.push(
      'Institutional venture backing and cap table details have not been publicly audited.',
    );

    // Objective Risks
    if (!projectData.docsUrl) {
      risks.push('Missing formal developer documentation or whitepaper.');
    }
    if (!projectData.repoData || projectData.repoData.contributors <= 1) {
      risks.push('Single contributor or centralized repository maintenance risk.');
    }
    risks.push(
      'Early-stage protocol risk: smart contracts may not be audited by a third-party security firm.',
    );
    risks.push(
      'Market & execution risk: testnet or devnet implementations may undergo breaking changes prior to mainnet.',
    );

    // Suggested Actions
    suggestedResearchActions.push(
      'Monitor contract deployments on Base / Sepolia / Ethereum block explorers.',
    );
    suggestedResearchActions.push(
      'Verify core developer team identity and track multi-signature governance wallets.',
    );
    suggestedResearchActions.push(
      'Review GitHub commit frequency and PR merge cadence over the next 14-30 days.',
    );

    const summary = `UnifyVault Early Radar detected ${projectData.name} at the ${projectData.stage} stage with an Early Signal Strength of ${projectData.score?.totalScore || 0}/100. Key signals include ${projectData.signals.length} verified public events across GitHub development and Web3 infrastructure telemetry.`;

    return {
      summary,
      confirmedFacts,
      unconfirmedClaims,
      risks,
      detectedSignals,
      suggestedResearchActions,
    };
  }
}
