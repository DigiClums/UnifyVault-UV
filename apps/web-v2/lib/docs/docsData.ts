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
    title: '👋 Getting Started',
    slug: 'getting-started',
    items: [
      {
        slug: 'introduction',
        title: 'What is UnifyVault?',
        category: 'Getting Started',
        badge: 'START HERE',
        description:
          'A simple, friendly introduction to how UnifyVault helps you invest in Bitcoin & Ethereum together.',
        content: `
# Welcome to UnifyVault 🚀

Think of **UnifyVault** as your automated, all-in-one crypto portfolio manager on the fast and low-cost **Base network**.

Instead of buying Bitcoin on one exchange, Ethereum on another, and worrying about balancing them every week, UnifyVault bundles them into a single, smart index coin called **UVBE Index Coin**.

---

### 💡 Why does UnifyVault exist?

1. **One Coin, Top 2 Crypto Assets**:
   When you hold 1 **UVBE Coin**, your money is automatically split into **60% Bitcoin (cbBTC)** and **40% Ethereum (WETH)**.

2. **Automated Rebalancing (No Hassle)**:
   If Bitcoin shoots up and becomes 70% of the vault, the smart contract automatically rebalances it back to the healthy 60/40 ratio. You never have to manually trade or calculate percentages.

3. **100% Non-Custodial (Your Money, Your Control)**:
   We never hold your private keys. Your funds sit inside open-source, verified smart contracts on Base. You can deposit or withdraw your money anytime you want, 24/7.

4. **Zero Impermanent Loss**:
   Unlike standard liquidity pools where price divergence makes you lose money, here your assets are directly backed 1:1.

---

### 🎯 What else can you do on UnifyVault?
- **⚡ Flash 30s Game**: Predict 30-second BTC/ETH price directions and win up to 20x multipliers.
- **💎 Staking Vaults**: Stake your UVBE coins to earn passive rewards from real protocol trading fees.
- **🤝 P2P Escrow**: Buy and sell crypto directly with other users with safe escrow protection.
- **📊 Automatic Tax/Cost Tracking**: See your real profits, losses, and buy prices calculated on-chain automatically.
        `,
      },
      {
        slug: 'architecture-overview',
        title: 'How It Works (In Plain English)',
        category: 'Getting Started',
        description: 'Understand what happens behind the scenes when you use the app.',
        content: `
# How UnifyVault Works Under the Hood 🛠️

You don't need to be a blockchain developer to understand how UnifyVault works. Here is the step-by-step journey:

---

### 1. You Deposit USDC 💵
When you deposit USDC into the app, you don't have to buy Bitcoin or Ethereum yourself. The smart contract takes your USDC and automatically buys **60% cbBTC** and **40% WETH** at the best DEX prices on Base.

### 2. You Receive UVBE Coins 🪙
In return, the vault mints **UVBE Index Coins** straight into your wallet. The exact number of coins you get is based on the live **Net Asset Value (NAV)** calculated in real-time.

### 3. Oracles Keep Prices Honest 📡
We use **Pyth Network** and **Chainlink** (ultra-fast price feeds). They tell the smart contract the exact real-time prices of Bitcoin and Ethereum down to the millisecond. No middleman can manipulate the price.

### 4. You Redeem Back to USDC Anytime 🔄
Whenever you want to exit or take profits, simply click **Redeem**. The vault sells your underlying BTC & ETH back into USDC and sends the USDC directly to your wallet.
        `,
      },
      {
        slug: 'quickstart',
        title: 'Quickstart: Your First Deposit',
        category: 'Getting Started',
        description: 'A friendly 3-step tutorial to start using UnifyVault in under 2 minutes.',
        content: `
# Quickstart Guide: Getting Started in 3 Steps ⚡

Ready to start? Here is how to make your first deposit in under 2 minutes:

---

### Step 1: Connect Your Wallet 🦊
1. Open [app.unifyvault.xyz](https://app.unifyvault.xyz) in your browser.
2. Click **Connect Wallet** at the top right.
3. Choose **MetaMask**, **Rainbow**, **Coinbase Wallet**, or any Web3 wallet.
4. Make sure your network is set to **Base Mainnet**.

---

### Step 2: Enter Deposit Amount 💰
1. Go to the **Deposit** page.
2. Type the amount of **USDC** you want to invest (e.g., $50, $100, $500).
3. The screen will instantly show you:
   - How much will go into **cbBTC** (60%)
   - How much will go into **WETH** (40%)
   - How many **UVBE Coins** you will receive.

---

### Step 3: Approve & Confirm ✅
1. Click **Approve USDC** (gives permission to the smart contract).
2. Click **Confirm Deposit**.
3. Done! Your UVBE coins will appear in your wallet and on your **Portfolio Dashboard** immediately.
        `,
      },
    ],
  },
  {
    title: '📦 Core Products',
    slug: 'products',
    items: [
      {
        slug: 'index-strategy-and-rebalancing',
        title: 'The 60/40 Strategy Explained',
        category: 'Core Products',
        description: 'Why 60% Bitcoin + 40% Ethereum is the benchmark crypto strategy.',
        content: `
# The 60/40 Strategy: Why It Works 📈

In traditional finance, the classic "60/40 stock and bond" portfolio has been the gold standard for decades. UnifyVault brings this proven concept to crypto:

---

### 🪙 The Assets:
- **60% cbBTC (Coinbase Wrapped Bitcoin)**: The "Digital Gold". Provides long-term store of value, high security, and macroeconomic stability.
- **40% WETH (Wrapped Ether)**: The "Digital Oil". Powers the world computer, staking yields, DeFi applications, and Layer 2 ecosystems.

---

### ⚖️ What is Auto-Rebalancing?

Imagine Bitcoin doubles in price overnight while Ethereum stays flat. Now your portfolio might be 75% Bitcoin and 25% Ethereum.

Normally, you would have to:
1. Log in to an exchange.
2. Sell some Bitcoin (creating a taxable event).
3. Buy Ethereum.
4. Pay exchange fees and slippage twice.

**UnifyVault does this automatically**:
The smart contract monitors the weights 24/7. When the drift crosses ±2.5%, the vault executes a small rebalance swap on-chain. You keep maximum upside with minimum risk!
        `,
      },
      {
        slug: 'dynamic-cost-basis',
        title: 'Dynamic Cost Basis & Profit Tracking',
        category: 'Core Products',
        description:
          'How your real buy price and profit/loss are automatically calculated for you.',
        content: `
# Simple Profit & Loss (PnL) Tracking 📊

Have you ever bought crypto at 5 different prices over 6 months and had no idea what your actual average buy price or profit was?

UnifyVault solves this with **On-Chain Cost Basis Accounting**:

---

### 🔍 How it works for you:

1. **Average Buy Price (Weighted Average)**:
   Every time you deposit or receive UVBE coins, the app remembers your exact entry price and updates your true average cost per coin.

2. **FIFO (First-In, First-Out)**:
   When you withdraw part of your balance, the protocol calculates realized profit based on your oldest deposits first.

3. **Live Profit / Loss Card**:
   On your Portfolio dashboard, you will always see:
   - **Your Total Investment ($ USD)**
   - **Current Market Value ($ USD)**
   - **Unrealized Profit/Loss (+% and +$)**

No spreadsheets or third-party tax software needed!
        `,
      },
      {
        slug: 'staking-vaults',
        title: 'UVBE Staking & 10-Tier Affiliate Engine',
        category: 'Core Products',
        badge: 'ACTIVE APY',
        description:
          'Complete guide to perpetual dynamic APY, 10-generation referral overrides, leadership ranks, and DAO leadership pool.',
        content: `
# UVBE Staking & Affiliate Ecosystem 💎

The UnifyVault Staking subsystem is a **Perpetual Dynamic Yield & 10-Tier Affiliate Engine** built directly on Base.

---

### 🌟 How UVBE Staking Works:

1. **Perpetual Staked Position (Protocol-Owned Capital)**:
   - When you stake UVBE coins, your principal enters the **\`UVBEStakingVault\`** as protocol-owned backing capital.
   - **Minimum Stake**: **50 UVBE** (Net active stake after 5% treasury allocation = **47.5 UVBE**).
   - **Maximum Stake**: **100,000 UVBE** per account.
   - **Continuous Yield**: Your staked position earns dynamic recurring staking rewards every single second based on the funded reward reserve.

2. **5.00% Treasury Allocation**:
   - 95% of your deposit goes directly into your active earning principal.
   - 5% goes to protocol reserve maintenance and insurance backing.

---

### 📈 Dynamic APY: How It Is Calculated

Unlike static staking pools with fake inflationary emissions, UnifyVault uses a **100% Solvency-Backed Dynamic APY Engine** calculated directly inside the **\`UVBERewardDistributor.sol\`** smart contract:

\`\`\`
Surplus Capacity = Available Protocol Capital - Total Outstanding Liabilities
Dynamic APY (BPS) = (Surplus Capacity * 10,000) / Total Permanent Staked
\`\`\`

1. **Real Surplus-Driven Yield**:
   - As more fees from swaps, mints, and Flash 30s settlement flow into the **\`UVBERewardReserve\`**, the **Surplus Capacity** increases, pushing the **Dynamic APY up**.
   - If the total amount of staked UVBE expands, the APY dynamically calibrates to ensure the protocol is always mathematically 100% solvent.

2. **600.00% Max Annual APY Ceiling**:
   - The contract enforces a hard safety cap of **60,000 BPS (600.00% Annual APY)** to protect the protocol against extreme volatility spikes.

3. **Continuous Per-Second Accrual**:
   - Rewards accrue every second via global index checkpoints (\`deltaIndex = timeDelta * currentAnnualBps / (SECONDS_PER_YEAR * 10,000)\`).
   - You can see your live pending yield grow in real-time on the **UVBE Staking Dashboard**.

---

### 🌳 10-Generation Affiliate Overrides

Earn continuous commissions across your entire downline based on your active direct members:

| Generation | Commission Rate | Requirement |
| :--- | :--- | :--- |
| **Gen 1 (Direct)** | **5.00%** | Personal Net Stake ≥ 47.5 UVBE (Active) |
| **Gen 2** | **2.00%** | ≥ 2 Active Direct Members |
| **Gen 3** | **1.50%** | ≥ 3 Active Direct Members |
| **Gen 4** | **1.00%** | ≥ 4 Active Direct Members |
| **Gen 5** | **0.75%** | ≥ 5 Active Direct Members |
| **Gen 6** | **0.50%** | ≥ 6 Active Direct Members |
| **Gen 7** | **0.50%** | ≥ 7 Active Direct Members |
| **Gen 8** | **0.25%** | ≥ 8 Active Direct Members |
| **Gen 9** | **0.25%** | ≥ 9 Active Direct Members |
| **Gen 10** | **0.25%** | ≥ 10 Active Direct Members |

---

### 🏆 Leadership Ranks & Milestone Bonuses

As your team volume and active direct network grow, you unlock on-chain rank promotions with one-time milestone payouts and DAO leadership pool shares:

| Rank | Directs | Team Volume | Milestone Bonus | DAO Shares |
| :--- | :--- | :--- | :--- | :--- |
| **Bronze** | 2 Directs | 1,000 UVBE | **+25 UVBE** | 0 |
| **Silver** | 3 Directs | 5,000 UVBE | **+100 UVBE** | 0 |
| **Gold** | 4 Directs | 20,000 UVBE | **+500 UVBE** | 0 |
| **Platinum** | 5 Directs | 50,000 UVBE | **+1,500 UVBE** | 1 Share |
| **Diamond** | 7 Directs | 150,000 UVBE | **+5,000 UVBE** | 3 Shares |
| **Crown Ambassador** | 10 Directs | 500,000 UVBE | **+20,000 UVBE** | 10 Shares |

---

### 👑 DAO Leadership Pool (1.00%)

- **1% of all protocol staking flows** are routed into the global **\`DAOPool\`**.
- Platinum, Diamond, and Crown Ambassador leaders receive weekly distributions proportional to their unlocked DAO shares!

---

### 🔄 Claiming vs Restaking

- **Claim Rewards**: Withdraw your earned rewards straight to your wallet anytime with 1 click.
- **Compound / Restake**: Re-invest your pending rewards directly back into your permanent stake position to amplify your daily yield without touching wallet balances!
        `,
      },
      {
        slug: 'p2p-escrow',
        title: 'P2P Escrow: Safe Peer-to-Peer Trading',
        category: 'Games & Products',
        description:
          'How to buy and sell crypto with real fiat money safely without middleman risk.',
        content: `
# P2P Escrow Marketplace 🤝

Need to convert local currency (INR, USD, EUR, etc.) to crypto without an exchange locking your account?

UnifyVault P2P is a **100% smart-contract escrow system**:

---

### 🛡️ How Escrow Protects You:

1. **Seller Locks Crypto in Smart Contract**:
   When a seller opens a sell order, their crypto is locked securely in the \`P2PEscrow.sol\` smart contract. The seller cannot run away with the funds.

2. **Buyer Sends Local Payment**:
   The buyer transfers money directly to the seller's bank account or payment app (UPI, Bank Transfer, PayPal, etc.).

3. **Crypto Released Automatically**:
   Once the seller confirms payment receipt, the smart contract unlocks and transfers the crypto directly into the buyer's wallet.

4. **Dispute Arbitration**:
   If a buyer pays but the seller does not release, the buyer can submit payment proof for instant arbitrator resolution.
        `,
      },
    ],
  },
  {
    title: '🔒 Security & Safety',
    slug: 'security-contracts',
    items: [
      {
        slug: 'verified-contracts',
        title: 'Official Contract Addresses',
        category: 'Security & Safety',
        badge: 'BASE 8453',
        description: 'Direct links to verified contracts on BaseScan.',
        content: `
# Official Smart Contract Directory 📋

All UnifyVault contracts are publicly open-source, deployed on **Base**, and verified on BaseScan.

---

### 🌐 Base Mainnet (Chain ID: 8453) - 100% Verified Contracts

| Contract Name | Address | Explorer Link |
| :--- | :--- | :--- |
| **ProtocolDirectory** | \`0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5\` | [View on BaseScan](https://basescan.org/address/0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5#code) |
| **UnifyVaultController** | \`0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c\` | [View on BaseScan](https://basescan.org/address/0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c#code) |
| **UVBE Index Coin (\`UVBEV2\`)** | \`0x051979deb1eb4823672e6274a55c44d7818ff523\` | [View on BaseScan](https://basescan.org/address/0x051979deb1eb4823672e6274a55c44d7818ff523#code) |
| **CustodyVault** | \`0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c\` | [View on BaseScan](https://basescan.org/address/0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c#code) |
| **Treasury** | \`0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9\` | [View on BaseScan](https://basescan.org/address/0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9#code) |
| **FeeManager** | \`0x76c8a1ab608403cd974ec7598b01ec88b44320d3\` | [View on BaseScan](https://basescan.org/address/0x76c8a1ab608403cd974ec7598b01ec88b44320d3#code) |
| **PortfolioManager** | \`0xce97c16a1c544f1df87e46695f86c7cc61ea486a\` | [View on BaseScan](https://basescan.org/address/0xce97c16a1c544f1df87e46695f86c7cc61ea486a#code) |
| **StrategyManager** | \`0x8c196a631531ac3a9754016db1d7b873ebbdb6e9\` | [View on BaseScan](https://basescan.org/address/0x8c196a631531ac3a9754016db1d7b873ebbdb6e9#code) |
| **SwapAdapter** | \`0x9560361d964ebfeea402e75ad3b74fad4d8057be\` | [View on BaseScan](https://basescan.org/address/0x9560361d964ebfeea402e75ad3b74fad4d8057be#code) |
| **OracleManager** | \`0xdbab63fe1d8accff6620214a5c616d4151a8fec7\` | [View on BaseScan](https://basescan.org/address/0xdbab63fe1d8accff6620214a5c616d4151a8fec7#code) |
| **ChainlinkOracleProvider** | \`0x39af66781d16ec8a72d2b1a4a1b7697a577626a2\` | [View on BaseScan](https://basescan.org/address/0x39af66781d16ec8a72d2b1a4a1b7697a577626a2#code) |
| **CostBasisManagerV2** | \`0x3fcf09b4e1545926c1031d22a302a39e552b3469\` | [View on BaseScan](https://basescan.org/address/0x3fcf09b4e1545926c1031d22a302a39e552b3469#code) |
| **UVBEStakingVault** | \`0x625a7697e9fdde7c6a783593ca371ed6c73e61e0\` | [View on BaseScan](https://basescan.org/address/0x625a7697e9fdde7c6a783593ca371ed6c73e61e0#code) |
| **UVBEReferralRegistry** | \`0x5d486ba39418bb63d03a27dbc77ccc88bb2bf4cc\` | [View on BaseScan](https://basescan.org/address/0x5d486ba39418bb63d03a27dbc77ccc88bb2bf4cc#code) |
| **UVBERewardDistributor** | \`0xb8c565e7da406261baa4af922771bcca5bfc166a\` | [View on BaseScan](https://basescan.org/address/0xb8c565e7da406261baa4af922771bcca5bfc166a#code) |
| **P2PEscrowV2** | \`0x400916339033b88cda38b1d8a5fb0f82e4889f38\` | [View on BaseScan](https://basescan.org/address/0x400916339033b88cda38b1d8a5fb0f82e4889f38#code) |
| **P2PReputation** | \`0x7a4093316955baa5bcb8189c4522d9db31f42d41\` | [View on BaseScan](https://basescan.org/address/0x7a4093316955baa5bcb8189c4522d9db31f42d41#code) |
| **PerformanceManager** | \`0x3e13aae6c9befaaec11b2247e2af678ce871f338\` | [View on BaseScan](https://basescan.org/address/0x3e13aae6c9befaaec11b2247e2af678ce871f338#code) |
| **Marketplace** | \`0x6e3be632747e161a0b017cb35243d39eb90d0d8a\` | [View on BaseScan](https://basescan.org/address/0x6e3be632747e161a0b017cb35243d39eb90d0d8a#code) |
| **StabilizerVault** | \`0xc268709ebb4d3f0f473c6c5767f60e540d330c11\` | [View on BaseScan](https://basescan.org/address/0xc268709ebb4d3f0f473c6c5767f60e540d330c11#code) |
| **LiquidityManager** | \`0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919\` | [View on BaseScan](https://basescan.org/address/0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919#code) |
| **Paymaster (AA Gasless)** | \`0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9\` | [View on BaseScan](https://basescan.org/address/0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9#code) |
| **GasTreasury** | \`0x166477b1eb662dd553287d32af958436cad20c17\` | [View on BaseScan](https://basescan.org/address/0x166477b1eb662dd553287d32af958436cad20c17#code) |
| **TimelockController** | \`0x610c5f66d99993d444561d270fba172db1f7cff1\` | [View on BaseScan](https://basescan.org/address/0x610c5f66d99993d444561d270fba172db1f7cff1#code) |

---

> [!TIP]
> Always verify that you are interacting with the official domain **https://unifyvault.xyz** or **https://app.unifyvault.xyz**.
        `,
      },
      {
        slug: 'security-and-audits',
        title: 'How Your Funds Stay Safe',
        category: 'Security & Safety',
        description: 'Timelocks, non-custodial design, and circuit breakers.',
        content: `
# Fund Safety & Security Protections 🛡️

Your funds should always be safe, transparent, and under your control. Here is how UnifyVault protects you:

---

### 1. 48-Hour Timelock ⏳
No admin can suddenly change contract rules or fees overnight. Any protocol change must wait in an on-chain 48-hour timelock queue, giving all users ample time to withdraw if they disagree.

### 2. Proof of Reserve 🏦
100% of the collateral backing UVBE coins sits on-chain in transparent vault contracts. You can inspect the exact reserves on BaseScan anytime.

### 3. Flash-Loan & Donation Immunity 🚫
The contracts use internal accounting checks so malicious actors cannot manipulate share prices using flash loans or fake token donations.

### 4. Circuit Breakers 🛑
Automated volume rate limits prevent sudden anomalous outflows in the rare event of extreme market volatility.
        `,
      },
    ],
  },
  {
    title: '💻 Developers & APIs',
    slug: 'developer-api',
    items: [
      {
        slug: 'api-reference',
        title: 'API & Price Feed Integration',
        category: 'Developers & APIs',
        description: 'How to fetch live NAV, prices, and stats in your own app.',
        content: `
# API & Developer Integration 💻

Want to display UnifyVault live NAV prices or historical charts on your website, bot, or dashboard?

---

### 1. Get Live NAV Price
\`\`\`http
GET https://app.unifyvault.xyz/api/nav
\`\`\`

**Example Response**:
\`\`\`json
{
  "status": "success",
  "coin": "UVBE",
  "navUSD": 1.0220,
  "backing": {
    "cbBTC": "60.00%",
    "WETH": "40.00%"
  },
  "timestamp": "2026-08-25T13:55:00.000Z"
}
\`\`\`

### 2. Historical Chart Data
\`\`\`http
GET https://app.unifyvault.xyz/api/nav/history?period=30D
\`\`\`
Supports periods: \`1D\`, \`7D\`, \`30D\`, \`90D\`, \`ALL\`.
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
