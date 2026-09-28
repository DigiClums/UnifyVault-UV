# X Signal Collector — Query Families & Qualification Architecture

## Overview

The X Signal Collector architecture in UnifyVault Early Radar operates with high-precision **Query Families**, multi-family deduplication, cryptographic provenance, and 5-dimension early signal qualification.

Automated polling remains **DISABLED** by default (`X_SIGNAL_COLLECTION_ENABLED=false`) to protect API quotas and preserve the integrity of the 30-day blind validation phase ($T_0$ = 18 Sep 2026).

---

## 1. Query Families Specification

| Family ID                        | Name                                        | Version | Query String                                                                                                                                                            | Primary Intent                                                |
| :------------------------------- | :------------------------------------------ | :------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| `REPOSITORY_GENESIS`             | Family 1 — Repository / Code Genesis        | `1.0.0` | `("building on" OR "open sourced" OR "smart contract") (url:github.com OR url:gitlab.com) (EVM OR Ethereum OR Base OR Arbitrum OR Solana) -is:retweet lang:en`          | Code & smart contract genesis with direct repository links    |
| `INFRASTRUCTURE_TESTNET_GENESIS` | Family 2 — Infrastructure / Testnet Genesis | `1.0.0` | `(testnet OR devnet) ("faucet" OR "explorer" OR "RPC" OR "documentation" OR "deploy") (Base OR Ethereum OR ZK OR Rollup OR AVS) -airdrop -giveaway -is:retweet lang:en` | Testnet and devnet launches with negative farming filters     |
| `ARCHITECTURE_RFC`               | Family 3 — Architecture / RFC Announcements | `1.0.0` | `("announcing" OR "introducing" OR "RFC") ("protocol" OR "SDK" OR "coprocessor" OR "verifier" OR "modular") (crypto OR web3 OR Ethereum OR Base) -is:retweet lang:en`   | Novel technical primitives, coprocessors, verifiers, and RFCs |

---

## 2. Signal Provenance & Deduplication

### Cryptographic Provenance

Every ingested X signal preserves:

- `tweetId`: Unique identifier from X.
- `authorUsername` & `authorId`: Public author handle and numeric ID.
- `queryFamily`: Primary originating query family.
- `queryUsed`: Exact boolean query string executed.
- `queryVersion`: Version of the query schema (e.g., `1.0.0`).
- `observedAt`: Ingestion timestamp.
- `publishedAt`: Authentic tweet publication timestamp.
- `rawPayloadHash`: SHA-256 hash (`id:author_id:created_at:text`).
- `matchedFamilies`: Array of all query families that matched this post.
- `qualification`: 5-dimension qualification metadata.

### Deduplication Policy

- A single tweet matching multiple query families is **persisted exactly once** in `ProjectSignal`.
- Subsequent matches append the family ID to `metadata.matchedFamilies` without inflating signal counts or triggering duplicate rows.

---

## 3. Early Radar 5-Dimension Qualification Framework

Each tweet is evaluated across 5 observational dimensions:

1. **Artifact Provenance (`artifactProvenance`):**
   - Verified if the tweet or embedded entities contains a link to `github.com`, `gitlab.com`, `docs.*`, block explorers, or a valid EVM contract address (`0x[a-fA-F0-9]{40}`).
2. **Genesis Author (`genesisAuthor`):**
   - Verified if the author bio, name, or username identifies them as a `builder`, `founder`, `engineer`, `dev`, `protocol`, or `core` contributor.
3. **Non-Farming (`nonFarming`):**
   - Negative filter checking against sybil farming phrases (_"drop your address"_, _"like and retweet"_, _"giveaway"_, _"free tokens"_, _"tag 3 friends"_).
4. **Architectural Specificity (`architecturalSpecificity`):**
   - Verified if the post mentions technical Web3 primitives (`paymaster`, `coprocessor`, `zkVM`, `AVS`, `bundler`, `hook`, `SDK`, `verifier`, `prover`, `ERC-4337`, `EIP-7702`).
5. **Temporal Lead (`temporalLead`):**
   - Verifies timestamp validity ($T_{\text{X}} \le T_{\text{Tracker}}$).

> **Observational Notice:** Qualification results are stored strictly as metadata. They do **NOT** modify investment scores, stage classifications, or baseline metrics during the 30-day blind validation phase.

---

## 4. Production Enable/Disable Configuration

To prevent unintended credit consumption or automated polling:

- The system checks `process.env.X_SIGNAL_COLLECTION_ENABLED`.
- Default: `false`.
- When `false`, calling `POST /integrations/x/collect` returns:
  ```json
  {
    "source": "X",
    "signalsCollected": 0,
    "newSignalsPersisted": 0,
    "status": "DISABLED",
    "message": "Automated X signal collection is currently disabled in configuration (X_SIGNAL_COLLECTION_ENABLED=false)."
  }
  ```

---

## 5. Experiment Safety & Cohort Isolation

- **Cohort A (Frozen Baseline):** 17 frozen baseline projects ($T_0$ = 18 Sep 2026) are protected by immutable database assertions. X collection code contains explicit regression guards preventing mutations to `baselineEarlynessScore`, `baselineSignalStrength`, `baselineDetectionLagDays`, and `baselineStage`.
- **Cohort B (Observational Stream):** New candidate projects discovered via X are created with `baselineEarlynessScore = null` and stage `DISCOVERED`.
