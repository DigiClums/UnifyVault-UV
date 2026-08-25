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
        title: 'Staking & Referral Earnings',
        category: 'Games & Products',
        description: 'How to lock your coins for passive yield and earn by inviting friends.',
        content: `
# Staking & Referral Program 🎁

Make your crypto work for you by putting your UVBE coins into Staking Vaults.

---

### 💎 Flexible vs Locked Staking

| Option | Lock Time | Expected APR | Best For |
| :--- | :--- | :--- | :--- |
| **Flexible** | 0 Days (Anytime) | ~8.5% | Complete freedom to withdraw anytime |
| **30-Day Lock** | 30 Days | ~14.2% | Short-term yield boost |
| **90-Day Lock** | 90 Days | ~22.0% | Medium-term compounding |
| **180-Day Lock** | 180 Days | ~34.5% | Maximum yield for long-term believers |

*Note: Staking rewards come directly from real protocol trading fees and Flash 30s settlement revenues.*

---

### 👥 3-Tier Referral Rewards

Invite friends to UnifyVault and earn passive commissions:
- **Tier 1 (Direct Friends)**: You earn **5%** of the protocol fees generated by users you invite.
- **Tier 2 (Friends of Friends)**: You earn **2.5%**.
- **Tier 3 (Third Level)**: You earn **1%**.
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

All UnifyVault contracts are publicly open-source, deployed on **Base Mainnet**, and verified on BaseScan.

---

### 🔗 Official Base Mainnet Addresses:

- **UnifyVault Controller**: \`0x51E2b4159F9C6EB3d4342533F18204E62F16263B\`
- **UVBE Index Coin**: \`0x7eBB72F3E769B738bC2B104F5E6c55986Fe4B237\`
- **Portfolio Manager**: \`0x9a8B5C08985160A441bA79B37E4C470b15C42129\`
- **Oracle Manager (Pyth + Chainlink)**: \`0x3C474D95b68DA93175402D4F04a3f4b4D77e9FaA\`
- **FlashPulse Prediction Arena**: \`0xd9957d620B309b688fe1a221fF67b6C9D10360a0\`
- **Staking & Reward Vault**: \`0x14C60E919c0C1e5A7c45c22880e6c6411516A654\`
- **P2P Escrow Engine**: \`0x8979e2c60F0606B56e54F26B880b9576E4B17B08\`

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
