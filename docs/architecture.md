# Architecture Overview — UnifyVault Early Radar

UnifyVault Early Radar is an autonomous intelligence and research platform designed to discover early Web3 projects from public development signals before they appear on mainstream trackers.

## System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Public Signal Sources                    │
│      • GitHub REST API (Search, Commits, Contributors)      │
│      • Contract Bytecode / Testnet Deployments              │
│      • Technical Documentation / Whitepaper Portals         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                NestJS Radar Backend (:4005)                 │
│  ├── GitHubModule (Rate-limited repository ingestion)       │
│  ├── DiscoveryModule (Deduplication, normalization)         │
│  ├── SignalsModule (Fact-checked signal extraction)         │
│  ├── ScoringModule (Early Signal Strength math 0-100)       │
│  ├── ResearchModule (Deterministic anti-hallucination)      │
│  └── ProjectsModule (REST API, manual verification)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               PostgreSQL Database (early_radar)             │
│  ├── Project (Immutable firstDetectedAt, stage, status)     │
│  ├── ProjectSignal (Source URL, confidence, evidence)       │
│  ├── GitHubRepository (Stars, commits, language, topics)    │
│  ├── ScoreSnapshot (Category breakdown + rationale)         │
│  ├── ResearchReport (Confirmed facts vs unconfirmed claims) │
│  └── ProjectTimelineEvent (Historical detection milestone)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Next.js 15 Intelligence Dashboard               │
│  • /radar: Live candidate grid, search, stages, filters     │
│  • /projects/[slug]: Evidence, Timeline, Verification UI    │
└─────────────────────────────────────────────────────────────┘
```
