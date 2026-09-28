export interface GeneratedResearchReport {
  summary: string;
  confirmedFacts: string[];
  unconfirmedClaims: string[];
  risks: string[];
  detectedSignals: string[];
  suggestedResearchActions: string[];
}

export interface IResearchProvider {
  generateReport(projectData: {
    name: string;
    description: string | null;
    githubUrl: string | null;
    websiteUrl: string | null;
    docsUrl: string | null;
    stage: string;
    signals: Array<{ type: string; title: string; evidence: string }>;
    score?: { totalScore: number; developmentScore: number; onchainScore: number };
    repoData?: any;
  }): Promise<GeneratedResearchReport>;
}
