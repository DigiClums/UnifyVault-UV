# UnifyVault V2 Frontend Architecture

## 1. System Overview & Technology Stack

The UnifyVault V2 frontend is designed as a high-performance, non-custodial Web3 application built on Next.js 15 (App Router) and React 19. It provides seamless interaction with the UnifyVault V2 smart contract protocol on Base Mainnet.

### Core Stack

| Layer                  | Technology                      | Purpose                                                            |
| :--------------------- | :------------------------------ | :----------------------------------------------------------------- |
| **Framework**          | Next.js 15 (App Router)         | React 19 SSR/SSG framework with server components and edge routing |
| **UI Core**            | Tailwind CSS + shadcn/ui        | Modern design system, accessible UI primitives, dark mode          |
| **Web3 Connectivity**  | Wagmi v2 + Viem v2 + RainbowKit | Wallet connection management, RPC interaction, EIP-1193 provider   |
| **Async State**        | TanStack Query v5               | Server state, blockchain data caching, background polling          |
| **Client State**       | Zustand v4                      | Local UI state, wallet store, theme, transaction modal lifecycle   |
| **Charts & Data**      | Recharts                        | Dynamic financial charts (TVL, NAV history, asset allocation)      |
| **Forms & Validation** | React Hook Form + Zod           | Type-safe form controls, input validation, slippage controls       |

---

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
│        Next.js App Router Pages & React UI Components           │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────────┐
│                        Domain Hook Layer                        │
│   useDeposit, useRedeem, usePortfolio, useProtocolHealth, etc.   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
    ┌────────────────────────────┴────────────────────────────┐
    │                                                         │
    ▼                                                         ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│     Client State Layer       │          │   Server/Async State Layer   │
│   Zustand Stores (UI/Tx)     │          │    TanStack Query Caches     │
└──────────────────────────────┘          └──────────────┬───────────────┘
                                                         │
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │   Contract Abstraction Layer │
                                          │ Controller.ts, Portfolio.ts  │
                                          └──────────────┬───────────────┘
                                                         │
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │      Viem / RPC / Network    │
                                          └──────────────────────────────┘
```

---

## 3. Contract Abstraction Layer

To ensure strict separation of concerns, **no UI component or React hook may invoke raw `useWriteContract` or low-level `viem` contract calls directly**.

All blockchain interactions are encapsulated inside type-safe contract helper abstractions in `contracts/`:

- **`contracts/Controller.ts`**: Encapsulates `deposit()`, `redeem()`, `getDepositQuote()`, `previewRedeem()`.
- **`contracts/Portfolio.ts`**: Encapsulates `calculateNAV()`, `calculatePortfolioValue()`, `calculateAllocation()`.
- **`contracts/Treasury.ts`**: Encapsulates `balance()`, `isSupported()`, fee data.
- **`contracts/Liquidity.ts`**: Encapsulates `checkLiquidity()`, `getLiquidityBalances()`, refill/sweep execution.
- **`contracts/Token.ts`**: Encapsulates `balanceOf()`, `totalSupply()`, `allowance()`, `approve()`.

---

## 4. Application Routing Architecture

| Route         | Purpose                                    | Key Components                                       |
| :------------ | :----------------------------------------- | :--------------------------------------------------- |
| `/`           | Landing page & Protocol Overview           | Hero, Feature Grid, Live TVL Banner                  |
| `/dashboard`  | User Portfolio & Vault Overview            | StatCards, TVLChart, AllocationChart, Quick Actions  |
| `/deposit`    | Collateral Deposit & Index Share Minting   | DepositForm, SlippageSettings, DepositQuotePreview   |
| `/redeem`     | Index Share Redemption & Collateral Return | RedeemForm, PercentagePresets, RedeemQuotePreview    |
| `/portfolio`  | Deep Portfolio Breakdown & Performance     | TokenCard Grid, Rebalance History Table              |
| `/health`     | Liquidity & Protocol Health Dashboard      | HealthBadge, OperationalVsReserveChart, RefillNotice |
| `/governance` | Strategy Allocation Governance             | AllocationSlider, WeightUpdateProposalForm           |
| `/docs`       | Interactive Protocol Documentation         | Markdown Viewer, Contract Addresses, API Reference   |
