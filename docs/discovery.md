# Discovery Pipeline — UnifyVault Early Radar

## 1. Candidate Identification

The discovery engine queries GitHub using focused Web3 keywords:

- `solidity testnet language:solidity`
- `evm rollup testnet`
- `defi protocol testnet`
- `account abstraction erc-4337`

## 2. Normalization & Deduplication

- Generates canonical URL and slug.
- Checks database for existing `githubUrl` or duplicate `slug`.
- If existing, updates telemetry without overriding original `firstDetectedAt`.

## 3. Signal Extraction

Extracts normalized signals with cryptographic verification and evidence strings:

- `GITHUB_REPOSITORY_CREATED`
- `GITHUB_COMMIT_ACTIVITY`
- `GITHUB_SMART_CONTRACT_CODE`
- `TESTNET_REFERENCE`
- `OFFICIAL_WEBSITE`
- `GITHUB_RELEASE`

## 4. Stage Classification

- `DISCOVERED`: Newly identified repository.
- `EARLY`: Active development with smart contract architecture.
- `TESTNET`: Explicit testnet/devnet references detected in repository metadata.
- `WATCH`: Flagged for ongoing telemetry tracking.
- `VERIFIED`: Confirmed by human research team.
