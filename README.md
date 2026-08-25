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
- [Build & Deployment](#-build--deployment)
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

| Domain | Purpose | Shell / Features |
| :--- | :--- | :--- |
| [**unifyvault.xyz**](https://unifyvault.xyz) | **Institutional Landing** | Hero showcase, live UVBE NAV ticker, Pyth prices, features grid, strategy visualizer |
| [**app.unifyvault.xyz**](https://app.unifyvault.xyz) | **Full DeFi DApp** | Portfolio, Deposit, Redeem, Flash 30s (`/predict`), Staking, P2P Escrow, QR Transfer |
| [**docs.unifyvault.xyz**](https://docs.unifyvault.xyz) | **Documentation Portal** | Human-readable guides, contract directory, API specs, interactive sidebar |
| [**v2.unifyvault.xyz**](https://v2.unifyvault.xyz) | **Protocol Admin Console** | Module directory controller, oracle configuration, emergency circuit breakers |

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
  *(Enforced 100.00% annual APY safety ceiling).*
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

## 📋 Canonical Deployed Contracts

### 🌐 Base Mainnet (Chain ID `8453`)

| Contract Module | Address | Verification Status |
| :--- | :--- | :--- |
| **ProtocolDirectory** | `0xe74b400f4aea3a0b593be5acbc54f56631c0d60e` | Verified |
| **UVBE Index Coin (`UVBEToken`)** | `0xd2715141a0f5998b707baa963990bfc2e94cf145` | Verified |
| **UnifyVaultController (UUPS Proxy)** | `0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366` | Verified |
| **CustodyVault** | `0xbb35a3434c689942e0b7d58909eae0d2cc0769ca` | Verified |
| **Treasury** | `0x57561F781b2f558A7445D2E93a365C03BA2c9B53` | Verified |
| **PortfolioManager** | `0x66182f56bd5e523c655f6890290ab519f528e83f` | Verified |
| **StrategyManager** | `0x4f7f99653d9d7acd462429fffc0c4b6c8cf4354a` | Verified |
| **OracleManager (Pyth + Chainlink)** | `0x91b488cde0f2ef28141fe4ffd8531c4179b48ea7` | Verified |
| **CostBasisManagerV2** | `0x27b5c6dea90678b78856b0b10dba37a789fde97e` | Verified |
| **SwapAdapter** | `0xaae7104a120e7c6e518a936fcbc102bcd0454b67` | Verified |
| **UVBEStakingVault** | `0xd6d6b6297aa98126e9a2b7eaf64f6db19c86f571` | Verified |
| **UVBEReferralRegistry** | `0x95618e4347a923a80565dcc7ab23b89ce9ec0b1e` | Verified |
| **UVBERewardDistributor** | `0xb911a7655d1edef73b45e29f9a0d4dfdd9ba60aa` | Verified |
| **P2PEscrowV2** | `0xa938aacea64be8f41c90960aff232da4df7fc329` | Verified |
| **P2PReputation** | `0xdab9e0b8caac7ba5dba9fd49ae782d049b5964c8` | Verified |
| **Marketplace** | `0xabfe3034db275e32de396c7bdd1649a62ac9e5a6` | Verified |
| **Paymaster** | `0xdf96b619934d17ae85142dcef1655a8d3b19040a` | Verified |
| **TimelockController** | `0x610c5f66d99993d444561d270fba172db1f7cff1` | Verified (48h) |

---

### 🧪 Base Sepolia Testnet (Chain ID `84532`)

| Contract Module | Address | Verification Status |
| :--- | :--- | :--- |
| **ProtocolDirectory** | `0xe293143a52dc2555bf4f92ac9cbf11668bbfc01f` | Verified |
| **UVBE Index Coin (`UVBEToken`)** | `0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde` | Verified |
| **UnifyVaultController (UUPS Proxy)** | `0x07f3d3432b64dbf67c5b061af2bc8aef70221cea` | Verified |
| **CustodyVault** | `0x63856ae48d9b3e74b538a0d720b8d8a5e5f7eb64` | Verified |
| **Treasury** | `0xe0764477914f8eb0fe90c7f27bca0ade1ee95316` | Verified |
| **PortfolioManager** | `0x1c65b1667c8cc03138b8e57cdd40b0bf28a4cdc4` | Verified |
| **StrategyManager** | `0x14058459198a2cffc8ce89c364334a80da82d6a3` | Verified |
| **OracleManager** | `0xabfe3034db275e32de396c7bdd1649a62ac9e5a6` | Verified |
| **CostBasisManagerV2** | `0xcc405c38ed50efc715afcebadc37c01da6838ddd` | Verified |
| **SwapAdapter** | `0x8deca9efb0bdc300aae96111bdf0dcd32651db90` | Verified |
| **UVBEStakingVault** | `0xaa5deaF54BCfb5ddf4C7196eDEd2A4B981a327e4` | Verified |
| **UVBEReferralRegistry** | `0xc1F00539B6869b2445d85056EDc036114b939Ddd` | Verified |
| **UVBERewardDistributor** | `0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9` | Verified |
| **UVBERewardReserve** | `0xf1E40C0e7aA253CE259A224f1CFEDEDEd6D77Fda` | Verified |
| **P2PEscrowV2** | `0xcba65af8a993061cf1acc47d9b02d7ebacbcf655` | Verified |
| **P2PReputation** | `0x49460e2fF8c20ba96121C18e7D36Fd4aE293C70c` | Verified |
| **Marketplace** | `0xe908377f96F313a6b7771570ff6Fb414D38F451A` | Verified |
| **Paymaster** | `0x42c6342516714CFd64474bd41Ce360605b9fEA88` | Verified |
| **TimelockController** | `0x9094145Cd2AEA2f309eDf14237444a07edF98d02` | Verified (48h) |

---

## 🔒 Security & Timelocks

1. **48-Hour Timelock**: All parameter adjustments, module updates, and fee changes require a 48-hour timelock execution queue.
2. **Reentrancy Protection**: OpenZeppelin `ReentrancyGuard` on all state-changing financial entrypoints.
3. **Dead Share Protection**: Initial deposit burns `1000` wei dead shares to prevent ERC-4626 inflation attacks.
4. **P2P Escrow Isolation**: P2P transfers are isolated from cost-basis and share valuation mutations.
5. **Emergency Circuit Breakers**: Guardians can immediately pause deposits/redemptions in response to oracle or market anomalies.

---

## 📚 Documentation Portal

Comprehensive human-readable guides and technical specifications are available at:
👉 **[https://docs.unifyvault.xyz](https://docs.unifyvault.xyz)**

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
