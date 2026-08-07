# Frontend Application Specification

This document describes the web application architecture, page routes, wallet integration layer, and build setup for UnifyVault V2 (`apps/web-v2`).

---

## 1. Overview

The UnifyVault frontend is a server-side rendered (SSR) and client-side interactive Web3 application built using **Next.js 15 (App Router)**, **TypeScript**, **TailwindCSS**, **Wagmi v2**, and **RainbowKit v2**.

---

## 2. Directory Structure

```
apps/web-v2/
├── app/
│   ├── page.tsx               # Main Protocol Dashboard & Vault Metrics
│   ├── deposit/page.tsx       # Deposit Collateral Page
│   ├── redeem/page.tsx        # Redeem Shares Page
│   ├── portfolio/page.tsx     # User Holdings & Allocation Breakdown
│   ├── analytics/page.tsx     # Historical NAV & Performance Charts
│   ├── treasury/page.tsx      # Protocol Treasury & Fee Metrics
│   ├── transactions/page.tsx # User Transaction History
│   └── admin/                 # Admin & Keeper Management Console
│       ├── page.tsx           # Admin Overview
│       ├── custody/page.tsx   # Vault Custody Management
│       ├── oracle/page.tsx    # Oracle Price Feeds & Heartbeat Monitoring
│       ├── rebalance/page.tsx # Portfolio Rebalancing Triggers
│       ├── treasury/page.tsx  # Protocol Fee Sweeps
│       └── settings/page.tsx  # Rate Limits & Slippage Settings
├── components/                # React UI Components
├── constants/                 # Contract ABIs, Addresses, & Chain Configs
├── hooks/                     # Custom React Web3 Hooks (e.g. useVault, useOracle)
├── lib/                       # Formatting, Math, & Client Utilities
└── providers/                 # Web3 & Query Providers (Wagmi, RainbowKit)
```

---

## 3. Application Routes & Pages

| Route | Page Title | Key Capabilities |
| :--- | :--- | :--- |
| `/` | Dashboard | Displays total protocol NAV, TVL, active share price, and PriceSyncBadge countdown tag. |
| `/deposit` | Deposit | Allows users to select collateral asset (USDC, cbBTC, WETH), view share quotes, and execute deposits. |
| `/redeem` | Redeem | Enables users to burn `UVBTCETHToken` shares and withdraw net collateral. |
| `/portfolio` | Portfolio | Shows personal share balances, asset breakdown, and net earnings. |
| `/analytics` | Analytics | Interactive Recharts visualizations of historical NAV and asset price performance. |
| `/treasury` | Treasury | Protocol fee accumulation and treasury asset balances. |
| `/transactions` | Transactions | Filterable log of recent deposit, redeem, and rebalance events. |
| `/admin/*` | Admin Console | Role-restricted console for emergency pausing, oracle monitoring, rate limit adjustments, and rebalances. |

---

## 4. Web3 & Wallet Integration

- **Wallet Connection**: Integrated via `@rainbow-me/rainbowkit` and `wagmi`. Supports MetaMask, Coinbase Wallet, WalletConnect v2, and browser extension wallets.
- **Chain Support**: Configured for **Base Mainnet** (`chainId: 8453`) and **Base Sepolia** (`chainId: 84532`).
- **RPC Communication**: Direct EVM JSON-RPC calls via `viem` public clients. Contract addresses are resolved dynamically from `ProtocolDirectory`.

---

## 5. API Usage

**Not implemented in the current version.**

The frontend operates entirely client-side without proprietary backend REST or GraphQL APIs. All state queries (`readContract`) and transaction broadcasts (`writeContract`) communicate directly with EVM RPC nodes.

---

## 6. Build Process

To build the frontend for production:

```bash
# From workspace root
pnpm --filter @unifyvault/web-v2 build

# Run locally in production mode
cd apps/web-v2 && pnpm start -p 3001
```
