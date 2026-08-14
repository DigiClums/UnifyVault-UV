# Frontend Application Specification

This document describes the web application architecture, page routes, wallet integration layer, state management, and build setup for UnifyVault V2 (`apps/web-v2`).

---

## 1. Overview

The UnifyVault frontend is a server-side rendered (SSR) and client-side interactive Web3 application built using **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **TailwindCSS**, **Wagmi v2**, **Viem v2**, **RainbowKit v2**, and **TanStack Query v5**.

---

## 2. Directory Structure

```
apps/web-v2/
├── app/
│   ├── page.tsx               # Main Protocol Dashboard & Vault Metrics
│   ├── deposit/page.tsx       # Deposit Collateral Page
│   ├── redeem/page.tsx        # Redeem Shares Page
│   ├── portfolio/page.tsx     # User Holdings, Cost Basis, Realized/Unrealized P&L
│   ├── analytics/page.tsx     # Historical NAV & Performance Charts
│   ├── treasury/page.tsx      # Protocol Treasury & Fee Metrics
│   ├── transactions/page.tsx # User Transaction History
│   ├── p2p/page.tsx           # P2P Marketplace, Limit Orderbook, & Escrow
│   ├── api/p2p/               # P2P Payment Engine Next.js API Routes
│   │   ├── payment-intent/    # UPI / Fiat Payment Intent Creation & Storage
│   │   ├── payment-claim/     # Buyer UTR Claim Submission
│   │   ├── payment-confirm/   # Seller Payment Confirmation
│   │   ├── payment-dispute/   # Dispute Creation & Evidence Logging
│   │   └── payment-verify/    # Sole Verification Authority Entrypoint
│   └── admin/                 # Admin & Keeper Management Console
│       ├── page.tsx           # Admin Overview
│       ├── custody/page.tsx   # Vault Custody Management
│       ├── oracle/page.tsx    # Oracle Price Feeds & Multi-State Staleness Monitor
│       ├── rebalance/page.tsx # Portfolio Rebalancing Triggers
│       ├── treasury/page.tsx  # Protocol Fee Sweeps
│       └── settings/page.tsx  # Rate Limits & Slippage Settings
├── components/                # React UI Components (Vault, P2P, Common Modals)
├── constants/                 # Contract ABIs, Addresses, & Chain Configs
├── hooks/                     # Custom React Web3 Hooks (useVault, useOracle, useP2PEscrow, useMarketplace)
├── lib/                       # Formatting, Math, Payment Store, & Portfolio Transforms
└── providers/                 # Web3 & Query Providers (Wagmi, RainbowKit, TanStack)
```

---

## 3. Application Routes & Pages

| Route           | Page Title      | Key Capabilities                                                                                                                                            |
| :-------------- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | Dashboard       | Displays total protocol NAV, TVL, active share price, live token holdings, and PriceSyncBadge countdown tag.                                                |
| `/deposit`      | Deposit         | Allows users to select collateral asset (USDC, cbBTC, WETH), view share quotes, and execute deposits.                                                       |
| `/redeem`       | Redeem          | Enables users to burn `UVBE` shares and withdraw net collateral.                                                                                            |
| `/portfolio`    | Portfolio       | Shows personal share balances, on-chain cost basis (`CostBasisManagerV2`), entry price, realized P&L, and unrealized returns.                               |
| `/analytics`    | Analytics       | Interactive Recharts visualizations of historical NAV, volume, and asset price performance.                                                                 |
| `/p2p`          | P2P Marketplace | Non-custodial limit orderbook, counter-order matching (`Marketplace`), direct trade escrow creation (`P2PEscrowV2`), UTR submission, and dispute workspace. |
| `/treasury`     | Treasury        | Protocol fee accumulation and treasury asset balances.                                                                                                      |
| `/transactions` | Transactions    | Filterable log of recent deposit, redeem, and rebalance events.                                                                                             |
| `/admin/*`      | Admin Console   | Role-restricted console for emergency pausing, oracle monitoring, rate limit adjustments, and rebalances.                                                   |
| `/admin/oracle` | Oracle Manager  | Live feed monitoring with explicit multi-state staleness badges (`LIVE`, `STALE`, `REVERTED`, `UNAVAILABLE`) and atomic refresh.                            |

---

## 4. Oracle Feed Freshness & Multi-State Error Handling

The application implements a robust, transparent oracle pricing pipeline:

1. **Multi-State Feed Classification**:
   - `LIVE`: Price is valid, non-zero, and timestamp is within heartbeat limits (`isPriceFresh == true`).
   - `STALE`: Heartbeat has expired or feed is delayed.
   - `REVERTED`: Underlying provider reverted (e.g. circuit breaker tripped or feed paused).
   - `UNAVAILABLE`: Unconfigured or uninitialized feed.
2. **Graceful UI Fallbacks**:
   - Non-live feeds render explicit `'Price unavailable'` and `'Value unavailable'` status labels rather than falsely coercing errors to `$0.00`.
3. **Atomic Multi-Query Refresh**:
   - The `/admin/oracle` "Refresh Feeds" handler atomically invalidates and refetches all oracle queries, `PortfolioManager.calculateUVPrice()`, vault TVL, and portfolio metrics concurrently via `Promise.allSettled`.

---

## 5. Web3 & Wallet Integration

- **Wallet Connection**: Integrated via `@rainbow-me/rainbowkit` and `wagmi`. Supports MetaMask, Coinbase Wallet, WalletConnect v2, and browser extension wallets.
- **Chain Support**: Configured for **Base Mainnet** (`chainId: 8453`) and **Base Sepolia** (`chainId: 84532`).
- **RPC Communication**: Direct EVM JSON-RPC calls via `viem` public clients. Contract addresses are resolved dynamically from `ProtocolDirectory`.

---

## 6. Build Process

To build the frontend for production:

```bash
# From workspace root
pnpm --filter @unifyvault/web-v2 build

# Run locally in production mode
cd apps/web-v2 && pnpm start -p 3001
```
