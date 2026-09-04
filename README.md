# UnifyVault Protocol V2

<div align="center">
  <img src="UVBE_logo.svg" alt="UnifyVault UVBE" width="120" height="120" />
  <h3>Institutional-Grade Decentralized 60/40 Crypto Index Protocol on Base</h3>
  <p><strong>cbBTC (60%) + WETH (40%) Balanced Exposure • Automated On-Chain Drift Rebalancing • Flash 30s Prediction Arena • Perpetual Staking Engine</strong></p>

  <p>
    <a href="https://unifyvault.xyz"><strong>unifyvault.xyz</strong></a> •
    <a href="https://app.unifyvault.xyz"><strong>app.unifyvault.xyz</strong></a> •
    <a href="https://docs.unifyvault.xyz"><strong>docs.unifyvault.xyz</strong></a> •
    <a href="https://v2.unifyvault.xyz"><strong>v2.unifyvault.xyz</strong></a>
  </p>
</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Multi-Domain Architecture](#-multi-domain-ecosystem)
- [Key Features](#-key-features)
- [Protocol Architecture](#-protocol-architecture)
- [Products & Subsystems](#-products--subsystems)
  - [1. UVBE Index Coin (60/40 Strategy)](#1-uvbe-index-coin-6040-strategy)
  - [2. Flash 30s Rapid Binary Markets](#2-flash-30s-rapid-binary-markets)
  - [3. Perpetual Dynamic Staking & 10-Tier MLM](#3-perpetual-dynamic-staking--10-tier-mlm)
  - [4. Dynamic Cost-Basis & FIFO Accounting](#4-dynamic-cost-basis--fifo-accounting)
  - [5. P2P Fiat-to-Crypto Escrow Marketplace](#5-p2p-fiat-to-crypto-escrow-marketplace)
- [Repository Structure](#-repository-structure)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Local Development](#-local-development)
- [Build & Deployment](#-build-instructions)
- [Android Production Release & In-App Updates](#-android-production-release--in-app-updates)
- [Canonical Deployed Contracts](#-canonical-deployed-contracts-base-sepolia--base-mainnet)
- [Security & Timelocks](#-security--timelocks)
- [Documentation Portal](#-documentation-portal)
- [License](#-license)

---

## 🌟 Overview

**UnifyVault Protocol V2** is an institutional-grade, non-custodial multi-asset index and yield management protocol deployed on Ethereum Layer-2 (**Base Network**).

By depositing collateral (**USDC**), users receive **UVBE Index Coins** that represent 1:1 backed, proportional ownership of a dynamically managed portfolio consisting of **60% Coinbase Wrapped Bitcoin (cbBTC)** and **40% Wrapped Ether (WETH)** with zero impermanent loss and automated on-chain drift rebalancing.

---

## 🌐 Multi-Domain Ecosystem

The platform operates across four dedicated domains:

| Domain                                                 | Purpose                    | Shell / Features                                                                     |
| :----------------------------------------------------- | :------------------------- | :----------------------------------------------------------------------------------- |
| [**unifyvault.xyz**](https://unifyvault.xyz)           | **Institutional Landing**  | Hero showcase, live UVBE NAV ticker, Pyth prices, features grid, strategy visualizer |
| [**app.unifyvault.xyz**](https://app.unifyvault.xyz)   | **Full DeFi DApp**         | Portfolio, Deposit, Redeem, Flash 30s (`/predict`), Staking, P2P Escrow, QR Transfer |
| [**docs.unifyvault.xyz**](https://docs.unifyvault.xyz) | **Documentation Portal**   | Human-readable guides, contract directory, API specs, interactive sidebar            |
| [**v2.unifyvault.xyz**](https://v2.unifyvault.xyz)     | **Protocol Admin Console** | Module directory controller, oracle configuration, emergency circuit breakers        |

---

## ⚡ Key Features

- **Automated 60/40 Portfolio**: Single-coin exposure to cbBTC (60%) and WETH (40%) with automated $\pm2.5\%$ drift rebalancing.
- **Dual-Oracle Resilience**: Low-latency millisecond price feeds from **Pyth Network** paired with **Chainlink** heartbeat fallbacks.
- **Donation-Immune Custody**: Internal accounting separates tracked user collateral from untracked transfers, immunizing against ERC-4626 inflation attacks.
- **On-Chain FIFO Cost-Basis**: Automated tax-lot accounting tracks user acquisition prices, realized returns, and gross/net unrealized PnL.
- **Flash 30s Rapid Arena**: 30-second binary rounds on BTC/ETH with custom reward multipliers (**2x**, **3x**, **5x**, **10x**, **20x**) backed by an 80% bankroll vault.
- **Perpetual Staking & 10-Tier MLM**: Dynamic APY calculated from real protocol surplus capacity, 10-generation overrides, 6 leadership ranks, and a 1% DAO pool.
- **Non-Custodial P2P Escrow**: Trustless fiat-to-crypto OTC marketplace with cryptographic receipts and automated dispute timeouts.
- **48-Hour Timelock Governance**: Critical parameter updates and contract upgrades require an on-chain 48-hour timelock delay.

---

## 🏗️ Protocol Architecture

```mermaid
flowchart TD
    User([User / Investor]) <-->|Deposit USDC / Redeem| Controller[UnifyVaultController]
    Keeper([Bot / Keeper]) -->|Rebalance / Sync NAV| Controller
    Governance([Timelock / Gnosis Safe]) -->|Config / Modules| Directory[ProtocolDirectory]

    Controller -->|Resolve Modules| Directory
    Controller -->|Mint / Burn UVBE Coins| Token[UVBEV2 Index Coin]
    Controller -->|Hold Collateral Assets| Vault[CustodyVault]
    Controller -->|Fetch Live Price Feeds| Oracle[OracleManager - Pyth / Chainlink]
    Controller -->|Execute Strategy Rebalance| Portfolio[PortfolioManager]
    Controller -->|Record Entry Price / Lots| CBM[CostBasisManagerV2]

    Token -->|Pre-Transfer Hook| CBM
    Portfolio -->|Query Target Weights| Strategy[StrategyManager]
    Portfolio -->|Execute Optimal Swaps| Swap[SwapAdapter -> DEX Router]

    Staker([Staker / Affiliate]) <-->|Perpetual Stake| StakingVault[UVBEStakingVault]
    StakingVault -->|Dynamic APY Accrual| Distributor[UVBERewardDistributor]
    Distributor -->|10-Tier Generations| Registry[UVBEReferralRegistry]
    Distributor -->|Fund Yield| Reserve[UVBERewardReserve]

    Predictor([Flash 30s Trader]) <-->|Predict 30s Rounds| FlashPulse[FlashPulseArena]
    FlashPulse -->|Losing Bets 80% / 15% / 5%| BankrollVault[Bankroll / Buyback Reserve]
```

---

## 🎯 Products & Subsystems

### 1. UVBE Index Coin (60/40 Strategy)

- **Target Weights**: 60% cbBTC + 40% WETH.
- **Drift Threshold**: Automated on-chain rebalancing triggered when asset allocation diverges beyond $\pm2.5\%$.
- **Zero Impermanent Loss**: Unlike AMM LP pools, assets are held in pure non-custodial custody.

### 2. Flash 30s Rapid Binary Markets

- **Round Duration**: 30 seconds total (10s betting window, 20s live active tracking).
- **Custom Multipliers**: Auto mode (~1.95x - 2.00x) or fixed risk targets (**2x**, **3x**, **5x**, **10x**, **20x**).
- **Losing Bet Flow**:
  - **80% Payout Bankroll Vault**: Instant liquidity buffer for high multiplier hits.
  - **15% Protocol Buyback & Burn**: UVBE deflationary market purchase and burn.
  - **5% Keeper Gas Subsidy**: Settlement bot automation refund.

### 3. Perpetual Dynamic Staking & 10-Tier MLM

- **Perpetual Staked Position**: 50 UVBE minimum stake (47.5 UVBE net principal after 5% treasury allocation).
- **Dynamic APY Formula**:
  $$\text{Dynamic APY (BPS)} = \frac{\text{Surplus Capacity} \times 10{,}000}{\text{Total Permanent Staked}}$$
  _(Enforced 600.00% annual APY safety ceiling)._
- **10-Generation Overrides**: Gen 1 (5.00%), Gen 2 (2.00%), Gen 3 (1.50%), Gen 4 (1.00%), Gen 5 (0.75%), Gen 6 & 7 (0.50%), Gen 8, 9 & 10 (0.25%).
- **6 Leadership Ranks**: Bronze, Silver, Gold, Platinum (+1 DAO share), Diamond (+3 DAO shares), Crown Ambassador (+10 DAO shares).
- **1.00% DAO Leadership Pool**: Weekly revenue distributions to qualified rank leaders.

### 4. Dynamic Cost-Basis & FIFO Accounting

- **On-Chain Tax Lots**: Tracks individual mint lot timestamps and entry prices.
- **FIFO Realization**: Oldest lots realized first upon redemption.
- **Weighted Average**: Real-time display of average acquisition cost and gross/net unrealized PnL.

### 5. P2P Fiat-to-Crypto Escrow Marketplace

- **Non-Custodial Escrow**: Seller collateral locked in `P2PEscrow.sol`.
- **Fiat Settlement**: Direct bank / UPI transfer with cryptographic payment receipt proof.
- **Arbitration Support**: Automated timeout refunds and dispute arbitration resolution.

---

## 📁 Repository Structure

```
UnifyVault-UV/
├── apps/
│   ├── web-v2/             # Next.js 15 App (unifyvault.xyz, app.unifyvault.xyz, docs.unifyvault.xyz)
│   └── telegram-bot/       # Real-time Telegram alert & price bot
├── packages/
│   ├── protocol/           # Foundry smart contracts, test suites, & scripts
│   ├── design-system/      # Shared UI primitives & themes
│   ├── sdk/                # TypeScript client SDK
│   ├── shared/             # Shared TypeScript types & constants
│   ├── eslint-config/      # Monorepo ESLint config
│   └── tsconfig/           # TypeScript base configs
├── docs/                   # Markdown specifications & audit reports
├── pnpm-workspace.yaml     # Monorepo workspace
├── turbo.json              # Turborepo orchestration pipeline
└── package.json            # Root workspace scripts
```

---

## 💻 Tech Stack

- **Smart Contracts**: Solidity `0.8.24`, Foundry (`forge`), OpenZeppelin v5.0.2.
- **Web Frontend**: Next.js 15 (React 19), TailwindCSS, Framer Motion, Lucide Icons.
- **Web3 Layer**: Wagmi v2, Viem v2, RainbowKit v2, TanStack Query v5.
- **Oracles**: Pyth Network low-latency price feeds + Chainlink Data Feeds.
- **Network**: Base Mainnet (Chain ID `8453`) & Base Sepolia (Chain ID `84532`).

---

## 🚀 Quick Start

### Prerequisites

- Node.js `>= 18.0.0`
- pnpm `>= 9.4.0`
- Foundry (`forge` `>= 0.2.0`)

```bash
# 1. Clone repository
git clone git@github.com:DigiClums/UnifyVault-UV.git
cd UnifyVault-UV

# 2. Install dependencies
pnpm install

# 3. Start local development server
pnpm dev
```

---

## 🛠️ Build Instructions

```bash
# Build all smart contracts
pnpm --filter @unifyvault/protocol build

# Run smart contract test suites
pnpm --filter @unifyvault/protocol test

# Build production web application
pnpm --filter @unifyvault/web-v2 build
```

---

## 📱 Android Production Release & In-App Updates

UnifyVault provides an automated, non-custodial Android production release pipeline and VPS-free in-app update mechanism managed entirely via GitHub Actions and GitHub Releases.

### 1. Automated Android Release Pipeline

- **Workflow File**: [`.github/workflows/android-release.yml`](.github/workflows/android-release.yml)
- **Toolchain**:
  - **Node.js**: `22` (pnpm `9.4.0`)
  - **Java JDK**: `17` (Eclipse Temurin)
  - **Android SDK**: Build Tools `35.0.0` & Target SDK `35`
- **Capacitor Android Sync**: Static web export from `@unifyvault/web-v2` (`NEXT_EXPORT=true`) synchronized into native Android assets via `@capacitor/cli`.
- **Production Keystore Signing**: Securely decoded and signed using GitHub Repository Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).
- **Integrity Verification**:
  - Validates APK v2/v3 signing scheme with `apksigner verify --verbose`.
  - Generates reproducible `SHA256SUMS.txt` cryptographic checksums.
- **GitHub Release Assets**: Releases publish `app-release.apk` along with `SHA256SUMS.txt`.

### 2. Release Versioning Scheme

- **Canonical Release Tags**: Production releases follow semantic versioning tags in the canonical format `v1.0.x` (e.g. `v1.0.1`, `v1.0.2`).
- **Workflow Dispatch Triggers**: Manual release builds via `workflow_dispatch` support parameters:
  - `version_name`: Semantic version override (e.g. `1.0.2`).
  - `version_code`: Incremental Android integer version code (auto-calculated from semver if omitted).
  - `publish_release`: Boolean flag (`true`/`false`) to publish or clobber release assets on GitHub.

### 3. VPS-Free In-App Update Architecture

The in-app updater operates without any VPS, server-side API, or PM2 process dependencies:

- **Client Component**: [`UpdateCheckerModal.tsx`](apps/web-v2/components/common/UpdateCheckerModal.tsx)
- **GitHub-Hosted Metadata**: Directly queries raw version metadata from:
  ```text
  https://raw.githubusercontent.com/DigiClums/UnifyVault-UV/main/apps/web-v2/public/version.json
  ```
- **Metadata Specification (`version.json`)**:
  ```json
  {
    "latestVersion": "1.0.1",
    "minimumVersion": "1.0.0",
    "mandatory": false,
    "downloadUrl": "https://github.com/DigiClums/UnifyVault-UV/releases/download/v1.0.1/app-release.apk",
    "sha256": "19c9c7c63e0037fbc43604cbb44f87bca7ce1235c54e76a89b339585bbcff9be",
    "releaseNotes": [
      "🚀 Production Release v1.0.1",
      "⚡ Automated CI/CD Android Signing & Release Pipeline",
      "🛡️ Node 22 & Android SDK 35 Toolchain Compatibility",
      "📊 Compact Single-Screen Portfolio & Strategy Dashboard",
      "🔒 Decentralized P2P Escrow & Zero-Gas Account Abstraction",
      "🛡️ Verified APK SHA-256: 19c9c7c63e0037fbc43604cbb44f87bca7ce1235c54e76a89b339585bbcff9be"
    ]
  }
  ```
- **Native Android Installation Flow**:
  - Downloads APK directly from GitHub Releases (`/releases/download/v${V_NAME}/app-release.apk`).
  - Native Capacitor filesystem downloads and Android `FileProvider` (`ACTION_VIEW`, `application/vnd.android.package-archive`) prompt seamless user updates.

### 4. Automated Release Metadata Updates

Upon successful compilation, signing, signature verification, and release publication, the GitHub Actions release workflow:

1. Clones an isolated temporary workspace of the canonical `main` branch.
2. Updates `apps/web-v2/public/version.json` with the newly published version, verified SHA-256 checksum, canonical download URL, and fresh release notes.
3. Automatically commits and pushes changes back to `main`.
4. Directly feeds active Android installations worldwide without server maintenance.

### 5. End-to-End Developer Release Flow

```text
Code Commit → GitHub Actions CI → Build & Sign APK → SHA256 Verification → GitHub Release Assets → Automatic version.json (main) → In-App Client Check (GitHub Raw) → Native APK Download & Install
```

---

## 📋 Canonical Deployed Contracts

### 🌐 Base Mainnet (Chain ID `8453`)

| Contract Module                       | Address (BaseScan Link)                                                                    | Role / Purpose                                        | Status                 |
| :------------------------------------ | :----------------------------------------------------------------------------------------- | :---------------------------------------------------- | :--------------------- |
| **ProtocolDirectory**                 | [`0xe74b...d60e`](https://basescan.org/address/0xe74b400f4aea3a0b593be5acbc54f56631c0d60e) | Canonical Module Registry & Dynamic Address Resolver  | 🟢 Verified            |
| **UVBE Index Coin (`UVBEToken`)**     | [`0xd271...f145`](https://basescan.org/address/0xd2715141a0f5998b707baa963990bfc2e94cf145) | 60/40 Backed Index Share (cbBTC + WETH)               | 🟢 Verified            |
| **UnifyVaultController (UUPS Proxy)** | [`0xe6cd...c366`](https://basescan.org/address/0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366) | Atomic Deposit, Mint, NAV & Redemption Controller     | 🟢 Verified            |
| **CustodyVault**                      | [`0xbb35...69ca`](https://basescan.org/address/0xbb35a3434c689942e0b7d58909eae0d2cc0769ca) | Segregated Collateral Asset Vault (cbBTC, WETH, USDC) | 🟢 Verified            |
| **Treasury**                          | [`0x5756...9B53`](https://basescan.org/address/0x57561F781b2f558A7445D2E93a365C03BA2c9B53) | Protocol Reserve Capital & Fee Accrual                | 🟢 Verified            |
| **PortfolioManager**                  | [`0x6618...e83f`](https://basescan.org/address/0x66182f56bd5e523c655f6890290ab519f528e83f) | Asset Balancing & Valuation Calculation Engine        | 🟢 Verified            |
| **StrategyManager**                   | [`0x4f7f...354a`](https://basescan.org/address/0x4f7f99653d9d7acd462429fffc0c4b6c8cf4354a) | Target Allocation Weights (60% cbBTC / 40% WETH)      | 🟢 Verified            |
| **LiquidityManager**                  | [`0x9af8...16d3`](https://basescan.org/address/0x9af86a9ac1563b7fdbf43b19335348240a8c16d3) | Buffer & Active Rebalance Liquidity Router            | 🟢 Verified            |
| **PerformanceManager**                | [`0x19ec...9473`](https://basescan.org/address/0x19ec1b685c2ced1400b4f249da6be89662e59473) | High-Water Mark & Performance Fee Tracking            | 🟢 Verified            |
| **FeeManager**                        | [`0xa5b0...7881`](https://basescan.org/address/0xa5b0a1c71f4ffa357ddf5f50cc5003ff69c87881) | Dynamic Fee Split & Treasury Routing                  | 🟢 Verified            |
| **OracleManager (Pyth + Chainlink)**  | [`0x91b4...8ea7`](https://basescan.org/address/0x91b488cde0f2ef28141fe4ffd8531c4179b48ea7) | Dual-Oracle Price Aggregation Engine                  | 🟢 Verified            |
| **CostBasisManagerV2**                | [`0x27b5...e97e`](https://basescan.org/address/0x27b5c6dea90678b78856b0b10dba37a789fde97e) | On-Chain FIFO Cost-Basis & Accounting Migration       | 🟢 Verified            |
| **SwapAdapter**                       | [`0xaae7...4b67`](https://basescan.org/address/0xaae7104a120e7c6e518a936fcbc102bcd0454b67) | Uniswap V3 Execution Adapter                          | 🟢 Verified            |
| **UVBEStakingVault**                  | [`0x9174...c5ee`](https://basescan.org/address/0x91744fa47837474c7e9d9d532c7fd8a2fe04c5ee) | Perpetual Dynamic Staking Engine (47.5 Net Principal) | 🟢 Verified            |
| **UVBEReferralRegistry**              | [`0x6a94...36d9`](https://basescan.org/address/0x6a94ee7b0a89ad1b9488b0d29bf99294f5e236d9) | 10-Tier On-Chain Referral & Lineage Tree              | 🟢 Verified            |
| **UVBERewardDistributor**             | [`0xd3c7...dbc3`](https://basescan.org/address/0xd3c7073f5a2d98e1f80590b84dd628fcfd6fdbc3) | Dynamic APY Distribution & DAO Leadership Pool        | 🟢 Verified (600% APY) |
| **P2PEscrowV2**                       | [`0xa938...c329`](https://basescan.org/address/0xa938aacea64be8f41c90960aff232da4df7fc329) | Non-Custodial OTC Escrow & Fiat Settlement            | 🟢 Verified            |
| **P2PReputation**                     | [`0xdab9...64c8`](https://basescan.org/address/0xdab9e0b8caac7ba5dba9fd49ae782d049b5964c8) | On-Chain Trader Reputation & Trust Scoring            | 🟢 Verified            |
| **Marketplace**                       | [`0xabfe...e5a6`](https://basescan.org/address/0xabfe3034db275e32de396c7bdd1649a62ac9e5a6) | P2P Orderbook & Matchmaking Engine                    | 🟢 Verified            |
| **UnifyVaultPaymaster (ERC-4337)**    | [`0xb5b7...d0e9`](https://basescan.org/address/0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9) | Zero-Gas Account Abstraction Sponsorship              | 🟢 Verified            |
| **GasTreasury**                       | [`0x1664...0c17`](https://basescan.org/address/0x166477b1eb662dd553287d32af958436cad20c17) | Paymaster Refill Reserve & Operator Policy Guard      | 🟢 Verified            |
| **StabilizerVault**                   | [`0xc268...0c11`](https://basescan.org/address/0xc268709ebb4d3f0f473c6c5767f60e540d330c11) | Protocol Floor Liquidity Stabilizer                   | 🟢 Verified            |
| **TimelockController**                | [`0x610c...cff1`](https://basescan.org/address/0x610c5f66d99993d444561d270fba172db1f7cff1) | 48-Hour Governance Delay Enforcement                  | 🟢 Verified (48h)      |

---

### 🪙 Underlying Collateral Assets (Base Mainnet)

| Asset Symbol | Asset Name               | Contract Address (BaseScan Link)                                                         | Decimals |
| :----------- | :----------------------- | :--------------------------------------------------------------------------------------- | :------- |
| **cbBTC**    | Coinbase Wrapped Bitcoin | [`0xcbB7...33Bf`](https://basescan.org/token/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf) | 8        |
| **WETH**     | Wrapped Ether            | [`0x4200...0006`](https://basescan.org/token/0x4200000000000000000000000000000000000006) | 18       |
| **USDC**     | USD Coin (Native Circle) | [`0x8335...2913`](https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) | 6        |

---

### 🧪 Base Sepolia Testnet (Chain ID `84532`) _(Legacy / Devnet)_

| Contract Module                       | Address (BaseScan Link)                                                                             | Status         |
| :------------------------------------ | :-------------------------------------------------------------------------------------------------- | :------------- |
| **ProtocolDirectory**                 | [`0xe293...c01f`](https://sepolia.basescan.org/address/0xe293143a52dc2555bf4f92ac9cbf11668bbfc01f)  | Verified       |
| **UVBE Index Coin (`UVBEToken`)**     | [`0xa3db...5bde`](https://sepolia.basescan.org/address/0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde)  | Verified       |
| **UnifyVaultController (UUPS Proxy)** | [`0x07f3...1cea`](https://sepolia.basescan.org/address/0x07f3d3432b64dbf67c5b061af2bc8aef70221cea)  | Verified       |
| **CustodyVault**                      | [`0x6385...eb64`](https://sepolia.basescan.org/address/0x63856ae48d9b3e74b538a0d720b8d8a5e5f7eb64)  | Verified       |
| **Treasury**                          | [`0xe076...5316`](https://sepolia.basescan.org/address/0xe0764477914f8eb0fe90c7f27bca0ade1ee95316)  | Verified       |
| **PortfolioManager**                  | [`0x1c65...cdc4`](https://sepolia.basescan.org/address/0x1c65b1667c8cc03138b8e57cdd40b0bf28a4cdc4)  | Verified       |
| **StrategyManager**                   | [`0x1405...d6a3`](https://sepolia.basescan.org/address/0x14058459198a2cffc8ce89c364334a80da82d6a3)  | Verified       |
| **OracleManager**                     | [`0xabfe...e5a6`](https://sepolia.basescan.org/address/0xabfe3034db275e32de396c7bdd1649a62ac9e5a6)  | Verified       |
| **CostBasisManagerV2**                | [`0xcc40...8ddd`](https://sepolia.basescan.org/address/0xcc405c38ed50efc715afcebadc37c01da6838ddd)  | Verified       |
| **SwapAdapter**                       | [`0x8dec...db90`](https://sepolia.basescan.org/address/0x8deca9efb0bdc300aae96111bdf0dcd32651db90)  | Verified       |
| **UVBEStakingVault**                  | [`0xaa5d...27e4`](https://sepolia.basescan.org/address/0xaa5deaF54BCfb5ddf4C7196eDEd2A4B981a327e4)  | Verified       |
| **UVBEReferralRegistry**              | [`0xc1F0...9Ddd`](https://sepolia.basescan.org/address/0xc1F00539B6869b2445d85056EDc036114b939Ddd)  | Verified       |
| **UVBERewardDistributor**             | [`0x49D3...20E9`](https://sepolia.basescan.org/address/0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9)  | Verified       |
| **UVBERewardReserve**                 | [`0xf1E4...7Fda`](https://sepolia.basescan.org/address/0xf1E40C0e7aA253CE259A224f1CFEDEDEd6D77Fda)  | Verified       |
| **P2PEscrowV2**                       | [`0xcba6...cf655`](https://sepolia.basescan.org/address/0xcba65af8a993061cf1acc47d9b02d7ebacbcf655) | Verified       |
| **P2PReputation**                     | [`0x4946...C70c`](https://sepolia.basescan.org/address/0x49460e2fF8c20ba96121C18e7D36Fd4aE293C70c)  | Verified       |
| **Marketplace**                       | [`0xe908...451A`](https://sepolia.basescan.org/address/0xe908377f96F313a6b7771570ff6Fb414D38F451A)  | Verified       |
| **Paymaster**                         | [`0x42c6...EA88`](https://sepolia.basescan.org/address/0x42c6342516714CFd64474bd41Ce360605b9fEA88)  | Verified       |
| **TimelockController**                | [`0x9094...8d02`](https://sepolia.basescan.org/address/0x9094145Cd2AEA2f309eDf14237444a07edF98d02)  | Verified (48h) |

---

## 🔒 Security & Timelocks

1. **48-Hour Timelock**: All parameter adjustments, module updates, and fee changes require a 48-hour timelock execution queue.
2. **Reentrancy Protection**: OpenZeppelin `ReentrancyGuard` on all state-changing financial entrypoints.
3. **Dead Share Protection**: Initial deposit burns `1000` wei dead shares to prevent ERC-4626 inflation attacks.
4. **P2P Escrow Isolation**: P2P transfers are isolated from cost-basis and share valuation mutations.
5. **Emergency Circuit Breakers**: Guardians can immediately pause deposits/redemptions in response to oracle or market anomalies.
6. **Gas Policy Guards**: `GasTreasury` enforces strict daily refill ceilings and per-transaction limits to protect against drain vectors.

---

## 📚 Documentation Portal

Comprehensive human-readable guides and technical specifications are available at:
👉 **[https://docs.unifyvault.xyz](https://docs.unifyvault.xyz)**

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
