export interface DocItem {
  slug: string;
  title: string;
  category: string;
  badge?: string;
  description: string;
  content: string;
}

export interface DocCategory {
  title: string;
  slug: string;
  items: DocItem[];
}

export const DOCS_DATA: DocCategory[] = [
  {
    title: 'Getting Started',
    slug: 'getting-started',
    items: [
      {
        slug: 'introduction',
        title: 'Introduction to UnifyVault',
        category: 'Getting Started',
        badge: 'CORE',
        description: 'Learn about the decentralized multi-asset index protocol built on Base.',
        content: `
# Introduction to UnifyVault Protocol

UnifyVault is an institutional-grade decentralized multi-asset index protocol deployed on the **Base Network**. It provides automated, non-custodial exposure to premier crypto assets (**cbBTC** and **WETH**) through a single on-chain index token: **UVBE Index Coin**.

---

## 🌟 Key Highlights

1. **Balanced 60/40 Exposure**:
   - 60% Coinbase Wrapped Bitcoin (**cbBTC**)
   - 40% Wrapped Ether (**WETH**)
   - Dynamic on-chain rebalancing with a tight **±2.5% drift threshold**.

2. **Real-time Pyth & Chainlink Oracles**:
   - Millisecond price feeds for accurate Net Asset Value (**NAV**) minting and redemption.
   - Dual-oracle fallback mechanism to prevent stale pricing.

3. **Zero Impermanent Loss**:
   - Unlike standard AMM liquidity pools, vault assets are held directly in non-custodial custody, completely eliminating impermanent loss risk.

4. **Transparent On-Chain Accounting**:
   - Automated **FIFO (First-In, First-Out)** and weighted average cost-basis tracking embedded in token transfer hooks.

5. **Integrated Ecosystem Suite**:
   - **Flash 30s Rapid Binary Markets**: 30-second binary rounds with custom 2x to 20x reward multipliers.
   - **UVBE Staking Vaults**: Yield-bearing flexible and locked pools with referral commission tiers.
   - **P2P Escrow Marketplace**: Non-custodial OTC fiat-to-crypto escrow settlement.
        `,
      },
      {
        slug: 'architecture-overview',
        title: 'Core Protocol Architecture',
        category: 'Getting Started',
        description: 'Understand the multi-contract modular design and security layers.',
        content: `
# Core Protocol Architecture

UnifyVault utilizes an upgradeable, modular smart contract framework designed for high capital efficiency, verifiable custody, and strict access controls.

\`\`\`mermaid
flowchart TD
    User([User / Investor]) -->|Deposit USDC| Controller[UnifyVault Controller]
    Controller -->|Fetch Asset NAV| PortfolioManager[Portfolio Manager]
    PortfolioManager -->|Prices| OracleManager[Oracle Manager - Pyth / Chainlink]
    Controller -->|Swap Collateral| DexRouter[Base DEX Router]
    DexRouter -->|Hold cbBTC + WETH| Vault[Custody Vault]
    Controller -->|Mint UVBE Coin| User
\`\`\`

---

## 🏗️ Core Contract Modules

| Contract | Purpose | Status |
| :--- | :--- | :--- |
| **\`UnifyVaultController\`** | Primary gateway for deposits, redemptions, and rebalances | Verified on Base |
| **\`UVBEToken\`** | ERC-20 index coin representation with cost-basis tracking hooks | Verified on Base |
| **\`PortfolioManager\`** | Computes live NAV, backing weight ratios, and rebalance triggers | Verified on Base |
| **\`OracleManager\`** | Dual-feed oracle aggregator (Pyth Network + Chainlink) | Verified on Base |
| **\`FlashPulsePrediction\`** | 30s rapid binary prediction arena with dynamic multiplier bankroll | Verified on Base |
| **\`UnifyStakingVault\`** | Multi-tier staking engine with referral tree rewards | Verified on Base |
| **\`P2PEscrow\`** | Non-custodial buyer/seller escrow with timeout safety | Verified on Base |
        `,
      },
      {
        slug: 'quickstart',
        title: 'Quickstart Guide: Deposit & Mint',
        category: 'Getting Started',
        description: 'Step-by-step guide to depositing USDC and receiving UVBE shares.',
        content: `
# Quickstart Guide: Deposit & Mint

Depositing into UnifyVault is a seamless 1-click process that converts your collateral into diversified index exposure.

---

### Step 1: Connect Your Wallet
Navigate to [app.unifyvault.xyz](https://app.unifyvault.xyz) and connect using **MetaMask**, **Rainbow**, **Coinbase Wallet**, or any Web3 wallet. Ensure your network is set to **Base Mainnet (Chain ID 8453)**.

### Step 2: Choose Deposit Collateral
1. Enter the amount of **USDC** you wish to deposit.
2. Select your mint destination:
   - **Connected Wallet (EOA)**: Mint shares directly to your address.
   - **Smart Account**: Gas-sponsored ERC-4337 smart wallet.

### Step 3: Confirm & Mint
1. Approve USDC spending if prompted.
2. Confirm the deposit transaction.
3. The protocol atomically swaps USDC into **cbBTC** and **WETH** and mints **UVBE Index Coins** based on the real-time NAV.

> [!TIP]
> You can track your position value, accumulated yield, and cost basis directly on the **Portfolio** dashboard.
        `,
      },
    ],
  },
  {
    title: 'Products & Features',
    slug: 'products',
    items: [
      {
        slug: 'flash-30s-predictions',
        title: 'Flash 30s Rapid Markets',
        category: 'Products & Features',
        badge: 'NEW',
        description: 'Complete specification for 30-second binary rounds and custom multiplier bankroll economics.',
        content: `
# Flash 30s Prediction Game

**Flash 30s** is a decentralized rapid prediction arena allowing users to forecast **BTC/USD** and **ETH/USD** price movements over 30-second intervals.

---

## ⚡ Round Mechanics

1. **30-Second Rounds**:
   - **Betting Phase (10s)**: Players select direction (\`ROLL UP\` or \`ROLL DOWN\`) and choose their target reward multiplier.
   - **Active Phase (20s)**: Round locks the strike price using Pyth real-time price feeds.
   - **Settlement**: At $T+30s$, if final price is higher than strike price, \`ROLL UP\` wins; otherwise \`ROLL DOWN\` wins.

2. **Custom Reward Multipliers**:
   Players can choose their target risk/reward ratio:
   - **Auto Mode**: Default dynamic pool payout ratio (e.g. 1.95x - 2.00x).
   - **Fixed Multipliers**: **\`2x\`**, **\`3x\`**, **\`5x\`**, **\`10x\`**, **\`20x\`**.

---

## 🏦 Economic Flow & Losing Bet Settlement

Losing bet funds are systematically routed to ensure platform longevity:
- **80% Payout Bankroll Vault**: Provides instant liquidity buffer for high multiplier payouts.
- **15% Treasury & Buyback Reserve**: Autonomous buyback and burn of UVBE coins.
- **5% Keeper & Oracle Gas Subsidy**: Reimburses automated round settlement keepers.
        `,
      },
      {
        slug: 'index-strategy-and-rebalancing',
        title: '60/40 Multi-Asset Strategy',
        category: 'Products & Features',
        description: 'How target weights, drift monitoring, and rebalancing work.',
        content: `
# 60/40 Multi-Asset Strategy

The flagship **UVBE Index Coin** delivers a resilient balance between Bitcoin's digital gold narrative and Ethereum's smart contract utility.

---

## 📊 Target Asset Weights

- **60% cbBTC (Coinbase Wrapped Bitcoin)**: High-security wrapped Bitcoin native to Base.
- **40% WETH (Wrapped Ether)**: Liquid staked and wrapped Ether.

---

## 🔄 Automated Drift Rebalancing

As market prices fluctuate, asset weights will naturally diverge:
1. **Drift Monitoring**: The \`PortfolioManager\` checks the current weight every block.
2. **Threshold (\`±2.5%\`)**: If cbBTC exceeds 62.5% or falls below 57.5%, a rebalance trigger is emitted.
3. **Execution**: The Controller executes a slippage-protected DEX swap to restore the optimal 60/40 ratio.
        `,
      },
      {
        slug: 'dynamic-cost-basis',
        title: 'Dynamic Cost Basis (FIFO)',
        category: 'Products & Features',
        description: 'On-chain tax lot and cost tracking across token transfers.',
        content: `
# Dynamic Cost-Basis Accounting

UnifyVault pioneers automated, on-chain cost basis portfolio accounting directly within the token contract.

---

## 🧮 Accounting Modes

1. **FIFO (First-In, First-Out)**:
   - Tracks individual deposit lots with their respective mint prices and timestamps.
   - When coins are redeemed or transferred, the oldest lots are realized first.

2. **Weighted Average Cost Basis**:
   - Computes real-time average acquisition price across all active wallet positions.
   - Displays gross and net unrealized PnL on the user dashboard.

\`\`\`
Unrealized PnL = (Current NAV - Weighted Cost Basis) * Total Shares
\`\`\`
        `,
      },
      {
        slug: 'staking-vaults',
        title: 'UVBE Staking & Referrals',
        category: 'Products & Features',
        description: 'Multi-tier staking pools, yield generation, and commission structures.',
        content: `
# Staking & Reward Vaults

Stake your **UVBE Index Coins** to earn real protocol yield generated from trading fees, deposit spreads, and Flash 30s keeper revenues.

---

## 💎 Staking Pools

| Pool Type | Lock Period | Base APR | Multiplier |
| :--- | :--- | :--- | :--- |
| **Flexible Pool** | 0 Days | ~8.5% | 1.0x |
| **30-Day Lock** | 30 Days | ~14.2% | 1.5x |
| **90-Day Lock** | 90 Days | ~22.0% | 2.2x |
| **180-Day Lock** | 180 Days | ~34.5% | 3.5x |

---

## 👥 Referral Commission Tiers

- **Direct Referrals (Tier 1)**: 5.0% commission on referred deposit fees.
- **Secondary Network (Tier 2)**: 2.5% commission.
- **Tertiary Network (Tier 3)**: 1.0% commission.
        `,
      },
      {
        slug: 'p2p-escrow',
        title: 'P2P OTC Escrow Marketplace',
        category: 'Products & Features',
        description: 'Trustless fiat-to-crypto peer-to-peer exchange with automated timeout protection.',
        content: `
# P2P Escrow Marketplace

A non-custodial fiat-to-crypto OTC marketplace built directly on Base.

---

## 🔒 Security Guarantees

1. **Non-Custodial Escrow**: Seller's collateral is locked in the \`P2PEscrow.sol\` smart contract upon order creation.
2. **Buyer Protection**: Seller cannot withdraw funds once an order is taken.
3. **Automated Timeout**: If payment is not marked completed within the settlement window, escrow automatically resolves or opens for dispute arbitration.
        `,
      },
    ],
  },
  {
    title: 'Smart Contracts & Security',
    slug: 'security-contracts',
    items: [
      {
        slug: 'verified-contracts',
        title: 'Verified Contract Addresses',
        category: 'Smart Contracts & Security',
        badge: 'BASE',
        description: 'Official on-chain deployment addresses for Base Mainnet.',
        content: `
# Verified Smart Contract Addresses

All UnifyVault contracts are verified on **BaseScan** and governed by strict timelocks.

---

## 🌐 Base Mainnet (Chain ID: 8453)

| Contract Name | Address | Explorer Link |
| :--- | :--- | :--- |
| **UnifyVault Controller** | \`0x51E2b4159F9C6EB3d4342533F18204E62F16263B\` | [View on BaseScan](https://basescan.org) |
| **UVBE Index Coin** | \`0x7eBB72F3E769B738bC2B104F5E6c55986Fe4B237\` | [View on BaseScan](https://basescan.org) |
| **Portfolio Manager** | \`0x9a8B5C08985160A441bA79B37E4C470b15C42129\` | [View on BaseScan](https://basescan.org) |
| **Oracle Manager** | \`0x3C474D95b68DA93175402D4F04a3f4b4D77e9FaA\` | [View on BaseScan](https://basescan.org) |
| **FlashPulse Arena** | \`0xd9957d620B309b688fe1a221fF67b6C9D10360a0\` | [View on BaseScan](https://basescan.org) |
| **Staking Vault** | \`0x14C60E919c0C1e5A7c45c22880e6c6411516A654\` | [View on BaseScan](https://basescan.org) |
| **P2P Escrow** | \`0x8979e2c60F0606B56e54F26B880b9576E4B17B08\` | [View on BaseScan](https://basescan.org) |
        `,
      },
      {
        slug: 'security-and-audits',
        title: 'Security Model & Timelocks',
        category: 'Smart Contracts & Security',
        description: 'Audit report details, 48-hour timelock governance, and circuit breaker architecture.',
        content: `
# Security Model & Timelocks

Security is the cornerstone of UnifyVault. The protocol employs defense-in-depth mechanisms at every layer.

---

## 🛡️ Security Pillars

1. **48-Hour Timelock Governance**:
   - All critical parameter changes, fee adjustments, and contract upgrades require a 48-hour timelock queue before execution.

2. **Donation Attack Immunity**:
   - Internal accounting tracks actual balances rather than relying solely on \`balanceOf(address(this))\`, preventing ERC-4626 inflation and donation exploits.

3. **Circuit Breakers & Rate Limits**:
   - Deposit and redemption volume caps per block to prevent flash-loan arbitrage and oracle manipulation.

4. **Multi-Oracle Redundancy**:
   - Pyth Network low-latency feeds paired with Chainlink heartbeat checks.
        `,
      },
    ],
  },
  {
    title: 'Developer & API',
    slug: 'developer-api',
    items: [
      {
        slug: 'api-reference',
        title: 'REST & WebSocket API Reference',
        category: 'Developer & API',
        description: 'Endpoints for fetching live NAV, oracle feeds, and historical snapshots.',
        content: `
# API & Developer Reference

Integrate UnifyVault data feeds, NAV calculations, and orderbook metrics into your applications.

---

## 📡 Endpoints

### 1. Live NAV & Price Feed
\`\`\`http
GET /api/nav
\`\`\`

**Response**:
\`\`\`json
{
  "status": "success",
  "data": {
    "navUSD": 1.022,
    "totalSupply": "1050000000000000000000",
    "totalBackingUSD": 1073100.00,
    "weights": {
      "cbBTC": "60.00%",
      "WETH": "40.00%"
    },
    "timestamp": "2026-08-25T13:45:00.000Z"
  }
}
\`\`\`

### 2. Historical NAV Time Series
\`\`\`http
GET /api/nav/history?period=30D
\`\`\`

**Query Parameters**:
- \`period\`: \`1D\` | \`7D\` | \`30D\` | \`90D\` | \`ALL\`
        `,
      },
    ],
  },
];

export function getAllDocItems(): DocItem[] {
  return DOCS_DATA.flatMap((cat) => cat.items);
}

export function getDocItemBySlug(slug: string): DocItem | undefined {
  return getAllDocItems().find((item) => item.slug === slug);
}
