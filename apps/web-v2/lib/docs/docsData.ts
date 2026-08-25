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
        description: 'A simple, friendly introduction to how UnifyVault helps you invest in Bitcoin & Ethereum together.',
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
    title: '🎮 Games & Products',
    slug: 'products',
    items: [
      {
        slug: 'flash-30s-predictions',
        title: 'Flash 30s Game: Rules & Multipliers',
        category: 'Games & Products',
        badge: 'POPULAR',
        description: 'How to play 30-second rapid rounds, choose 2x-20x multipliers, and understand payout economics.',
        content: `
# Flash 30s Rapid Prediction Game ⚡

**Flash 30s** is a fast-paced, 30-second game where you test your market intuition on Bitcoin and Ethereum.

---

### 🕹️ How to Play:

1. **Pick an Asset**: Choose **BTC/USD** or **ETH/USD**.
2. **Choose Your Multiplier**:
   - **Auto Mode**: Default fair-odds multiplier (~1.95x - 2.00x).
   - **Custom Multipliers**: Choose **2x**, **3x**, **5x**, **10x**, or **20x** reward targets.
3. **Predict the Trend**:
   - Click **ROLL UP 🟢** if you think the price will be higher after 30 seconds.
   - Click **ROLL DOWN 🔴** if you think the price will be lower after 30 seconds.
4. **Win Instantly**:
   - As soon as the 30-second countdown hits zero, the oracle locks the final price.
   - If your direction was right, your winnings (Bet Amount × Multiplier) are paid out instantly!

---

### 💰 Where does the money go when someone loses?

Transparency is key. When a player loses a round, the funds do not disappear into a black box:

- **🏦 80% goes to the Payout Bankroll Vault**: This builds deep liquidity so winners (especially 10x and 20x hits) are guaranteed instant payouts.
- **🔥 15% goes to Protocol Buyback & Burn**: Used to buy UVBE coins from the open market and burn them, creating deflationary value for long-term holders.
- **⛽ 5% Keeper Gas Subsidy**: Reimburses automated bot keepers that trigger round settlements on-chain.
        `,
      },
      {
        slug: 'index-strategy-and-rebalancing',
        title: 'The 60/40 Strategy Explained',
        category: 'Games & Products',
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
        category: 'Games & Products',
        description: 'How your real buy price and profit/loss are automatically calculated for you.',
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
        category: 'Games & Products',
        badge: 'ACTIVE APY',
        description: 'Complete guide to perpetual dynamic APY, 10-generation referral overrides, leadership ranks, and DAO leadership pool.',
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

2. **100.00% Max Annual APY Ceiling**:
   - The contract enforces a hard safety cap of **10,000 BPS (100.00% Annual APY)** to protect the protocol against extreme volatility spikes.

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
        description: 'How to buy and sell crypto with real fiat money safely without middleman risk.',
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

### 🌐 Base Mainnet (Chain ID: 8453)

| Contract Name | Address | Explorer Link |
| :--- | :--- | :--- |
| **ProtocolDirectory** | \`0xe74b400f4aea3a0b593be5acbc54f56631c0d60e\` | [View on BaseScan](https://basescan.org/address/0xe74b400f4aea3a0b593be5acbc54f56631c0d60e) |
| **UVBE Index Coin (\`UVBEToken\`)** | \`0xd2715141a0f5998b707baa963990bfc2e94cf145\` | [View on BaseScan](https://basescan.org/address/0xd2715141a0f5998b707baa963990bfc2e94cf145) |
| **UnifyVaultController (UUPS Proxy)** | \`0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366\` | [View on BaseScan](https://basescan.org/address/0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366) |
| **CustodyVault** | \`0xbb35a3434c689942e0b7d58909eae0d2cc0769ca\` | [View on BaseScan](https://basescan.org/address/0xbb35a3434c689942e0b7d58909eae0d2cc0769ca) |
| **PortfolioManager** | \`0x66182f56bd5e523c655f6890290ab519f528e83f\` | [View on BaseScan](https://basescan.org/address/0x66182f56bd5e523c655f6890290ab519f528e83f) |
| **OracleManager (Pyth + Chainlink)** | \`0x91b488cde0f2ef28141fe4ffd8531c4179b48ea7\` | [View on BaseScan](https://basescan.org/address/0x91b488cde0f2ef28141fe4ffd8531c4179b48ea7) |
| **CostBasisManagerV2** | \`0x27b5c6dea90678b78856b0b10dba37a789fde97e\` | [View on BaseScan](https://basescan.org/address/0x27b5c6dea90678b78856b0b10dba37a789fde97e) |
| **UVBEStakingVault** | \`0xd6d6b6297aa98126e9a2b7eaf64f6db19c86f571\` | [View on BaseScan](https://basescan.org/address/0xd6d6b6297aa98126e9a2b7eaf64f6db19c86f571) |
| **UVBEReferralRegistry** | \`0x95618e4347a923a80565dcc7ab23b89ce9ec0b1e\` | [View on BaseScan](https://basescan.org/address/0x95618e4347a923a80565dcc7ab23b89ce9ec0b1e) |
| **UVBERewardDistributor** | \`0xb911a7655d1edef73b45e29f9a0d4dfdd9ba60aa\` | [View on BaseScan](https://basescan.org/address/0xb911a7655d1edef73b45e29f9a0d4dfdd9ba60aa) |
| **P2PEscrowV2** | \`0xa938aacea64be8f41c90960aff232da4df7fc329\` | [View on BaseScan](https://basescan.org/address/0xa938aacea64be8f41c90960aff232da4df7fc329) |
| **TimelockController** | \`0x610c5f66d99993d444561d270fba172db1f7cff1\` | [View on BaseScan](https://basescan.org/address/0x610c5f66d99993d444561d270fba172db1f7cff1) |

---

### 🧪 Base Sepolia Testnet (Chain ID: 84532)

| Contract Name | Address | Explorer Link |
| :--- | :--- | :--- |
| **ProtocolDirectory** | \`0xe293143a52dc2555bf4f92ac9cbf11668bbfc01f\` | [View on Sepolia BaseScan](https://sepolia.basescan.org) |
| **UVBE Index Coin** | \`0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde\` | [View on Sepolia BaseScan](https://sepolia.basescan.org) |
| **UnifyVaultController** | \`0x07f3d3432b64dbf67c5b061af2bc8aef70221cea\` | [View on Sepolia BaseScan](https://sepolia.basescan.org) |
| **UVBEStakingVault** | \`0xaa5deaF54BCfb5ddf4C7196eDEd2A4B981a327e4\` | [View on Sepolia BaseScan](https://sepolia.basescan.org) |
| **UVBEReferralRegistry** | \`0xc1F00539B6869b2445d85056EDc036114b939Ddd\` | [View on Sepolia BaseScan](https://sepolia.basescan.org) |
| **UVBERewardDistributor** | \`0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9\` | [View on Sepolia BaseScan](https://sepolia.basescan.org) |
| **P2PEscrowV2** | \`0xcba65af8a993061cf1acc47d9b02d7ebacbcf655\` | [View on Sepolia BaseScan](https://sepolia.basescan.org) |
| **TimelockController** | \`0x9094145Cd2AEA2f309eDf14237444a07edF98d02\` | [View on Sepolia BaseScan](https://sepolia.basescan.org) |

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
