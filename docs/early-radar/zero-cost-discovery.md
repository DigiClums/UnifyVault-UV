# Zero-Cost Discovery Architecture — UnifyVault Early Radar

## 1. Executive Summary

UnifyVault Early Radar is designed with a **Strict Zero-Cost Discovery Architecture**. The complete discovery, analysis, and validation pipelines operate **without requiring paid API subscriptions**, commercial data aggregators, or private scraping tools.

```text
               ZERO-COST DISCOVERY PIPELINE

   [ GitHub Public API ]        [ Public Explorers / RPC ]      [ Manual X Evidence ]
   (Free / Anonymous / Token)   (BaseScan Free / Public RPC)    (100% Free / User UI)
              │                             │                            │
   AUTOMATED: Repos, Commits,    AUTOMATED: Bytecode,         MANUAL: Tweet URL,
   Releases, Solidity Code,      Deployments, Verified        Timestamp, Technical
   SDKs, Architecture Docs       Contract Artifacts           Anchor, SHA-256 Hash
              │                             │                            │
              └──────────────────────┬──────┴────────────────────────────┘
                                     │
                        MULTI-SOURCE CORRELATION LAYER
                        (De-duplicates by owner/repo,
                         tweetId, & contract address)
                                     │
                        COHORT B (OBSERVATIONAL STREAM)
                        (Zero mutations to Frozen Cohort A)
```

---

## 2. Source Inventory & Access Modalities

| Source                   | Collection Mode | Access Type                           | Cost          | Automated Sweeps  | External Limits                                                         |
| :----------------------- | :-------------- | :------------------------------------ | :------------ | :---------------- | :---------------------------------------------------------------------- |
| **GitHub**               | `AUTOMATED`     | Public REST API (`api.github.com`)    | **$0** (Free) | YES (Active)      | 5,000 req/hr (with free personal token) or 60 req/hr anonymous          |
| **BaseScan / Explorers** | `AUTOMATED`     | Public Free API (`api.basescan.org`)  | **$0** (Free) | YES (Active)      | 5 req/sec free rate limit                                               |
| **Public RPC Nodes**     | `AUTOMATED`     | Public EVM JSON-RPC (Base / Ethereum) | **$0** (Free) | YES (Active)      | Standard public node rate limits                                        |
| **X (Twitter)**          | `MANUAL`        | User-submitted verified post URL      | **$0** (Free) | **NO (Disabled)** | Automated keyword search disabled (`X_SIGNAL_COLLECTION_ENABLED=false`) |

> **Cost & Compliance Guarantee:**
>
> - `PAID_EXTERNAL_APIS_REQUIRED=false`
> - Unofficial X scraping, headless browser automation against X, or private reverse-engineered APIs are **strictly prohibited and not used**.

---

## 3. Automated Free Discovery Pipeline (GitHub Primary)

GitHub serves as the primary automated zero-cost discovery source. The engine scans for engineering genesis signals using technical Web3 anchors:

### Technical Anchors Monitored

`ERC`, `EIP`, `AVS`, `zkVM`, `zkEVM`, `rollup`, `coprocessor`, `verifier`, `paymaster`, `bundler`, `smart contract`, `SDK`, `RPC`, `testnet`, `devnet`, `deploy`, `contract address`, `explorer`, `RFC`, `solidity`, `vyper`, `rust sdk`.

### Negative Noise Filters

Posts containing generic marketing or sybil farming phrases are automatically filtered out:
`airdrop`, `giveaway`, `100x`, `bull`, `free token`, `tag 3 friends`.

### Extracted Genesis Artifacts

- **Repository Creation Genesis:** Immutable creation date ($T_{\text{GitHub}}$).
- **Commit Velocity:** Commits pushed within the initial 30 days of genesis.
- **Smart Contract Code Analysis:** AST & syntax detection for Solidity, Vyper, or Rust contracts.
- **Release Documentation:** Tagged releases, README genesis, and RFC architecture specs.

---

## 4. Manual X Evidence Workflow

Because official automated X keyword search requires a paid subscription ($100/mo Basic Tier), UnifyVault Early Radar utilizes a **100% Free Manual Evidence Workflow**:

1. **URL Input & Format Validation:**
   - Supported formats: `https://x.com/<username>/status/<tweet_id>` or `https://twitter.com/<username>/status/<tweet_id>`.
2. **Tweet ID & Author Extraction:**
   - Regex-based extraction of `tweetId` and `authorUsername`.
3. **Cryptographic Provenance:**
   - Generates SHA-256 hash: `sha256(tweetId + ":" + authorId + ":" + publishedAt + ":" + evidenceText)`.
4. **5-Dimension Qualification Evaluation:**
   - Evaluates `artifactProvenance`, `genesisAuthor`, `nonFarming`, `architecturalSpecificity`, and `temporalLead`.
5. **Provenance Tagging:**
   - Explicitly records `source: 'X'`, `collectionMode: 'MANUAL'`, `queryFamily: 'MANUAL_ENTRY'`.
   - Never misrepresents manual entry as automated discovery.

---

## 5. Multi-Source Correlation & Deduplication

### Deduplication Identifiers

- **GitHub Projects:** `owner/repository`
- **X Signals:** `tweetId`
- **Smart Contracts:** `chainId:contractAddress`
- **Documentation:** `canonical URL`

### Multi-Source Corroboration Rules

- When an X signal references an already indexed GitHub repository, the engine links the signal to the existing project as **corroborating evidence** (`collectionMode: 'CORROBORATED'`) rather than creating a duplicate candidate.
- Cross-source indicators:
  - `xCorroboration: boolean`
  - `githubCorroboration: boolean`
  - `contractCorroboration: boolean`

---

## 6. Experiment Safety & Cohort Isolation

- **Cohort A (Frozen 17-Project Baseline):**
  - Frozen on **18 September 2026** ($T_0$).
  - Immutable fields: `baselineEarlynessScore`, `baselineSignalStrength`, `baselineDetectionLagDays`, and `baselineStage`.
  - Database regression tests verify that incoming automated GitHub discoveries and manual X evidence **never mutate baseline fields**.
- **Cohort B (Observational Stream):**
  - All newly discovered projects enter Cohort B with `baselineEarlynessScore = null` and initial stage `DISCOVERED`.
