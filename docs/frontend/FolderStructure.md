# UnifyVault V2 Frontend Folder Structure

```
apps/web/
├── app/                        # Next.js 15 App Router Routes
│   ├── layout.tsx              # Root layout with Web3 & Query Providers
│   ├── page.tsx                # Landing Page (/)
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard Route (/dashboard)
│   ├── deposit/
│   │   └── page.tsx            # Deposit Route (/deposit)
│   ├── redeem/
│   │   └── page.tsx            # Redeem Route (/redeem)
│   ├── portfolio/
│   │   └── page.tsx            # Portfolio Breakdown (/portfolio)
│   ├── health/
│   │   └── page.tsx            # Protocol & Liquidity Health (/health)
│   ├── governance/
│   │   └── page.tsx            # Strategy Governance (/governance)
│   └── docs/
│       └── page.tsx            # Documentation (/docs)
│
├── components/                 # Reusable React Components
│   ├── ui/                     # Primitives (shadcn/ui button, dialog, input, card, badge)
│   ├── layout/                 # Navbar, Sidebar, Footer, PageHeader
│   ├── dashboard/              # StatCard, BalanceCard, RecentActivityTable
│   ├── forms/                  # DepositForm, RedeemForm, SlippageSettings
│   ├── charts/                 # TVLChart, AllocationChart, PerformanceGraph
│   └── modals/                 # TransactionModal, WalletModal
│
├── contracts/                  # Type-Safe Smart Contract Layer
│   ├── ABIs.ts                 # Compiled Contract ABIs
│   ├── Controller.ts           # Controller deposit/redeem contract wrapper
│   ├── Portfolio.ts            # PortfolioManager NAV/Valuation wrapper
│   ├── Treasury.ts             # Treasury fee/balance wrapper
│   ├── Liquidity.ts            # LiquidityManager refill/sweep wrapper
│   └── Token.ts                # UVBTCETHToken ERC20 wrapper
│
├── hooks/                      # Custom Domain Hooks
│   ├── useWallet.ts            # Wallet connection & network management
│   ├── useDeposit.ts           # Deposit quote calculation & execution
│   ├── useRedeem.ts            # Redeem preview & execution
│   ├── usePortfolio.ts         # Portfolio valuation, NAV & asset breakdown
│   ├── useProtocolHealth.ts    # Liquidity check & health metrics
│   └── useTransaction.ts       # Multistep transaction modal status
│
├── store/                      # Client Local State Management (Zustand)
│   ├── useWalletStore.ts       # Connected wallet state
│   ├── useUIStore.ts           # Modal & sidebar toggle states
│   ├── useThemeStore.ts        # Dark/Light theme state
│   └── useTransactionStore.ts  # Transaction lifecycle modal state
│
├── services/                   # External API & Indexer Services
│   ├── oracleService.ts        # Pyth/Chainlink price feed indexer
│   └── analyticsService.ts     # Historical TVL & NAV API queries
│
├── types/                      # TypeScript Interface & Type Definitions
│   ├── vault.ts                # DepositQuote, DepositPreview, AssetConfig
│   ├── transaction.ts          # TransactionState, TxStatus, TxReceipt
│   └── api.ts                  # PriceFeedData, HistoricalTVLPoint
│
├── constants/                  # Configuration & Constant Registry
│   ├── addresses.ts            # Base Mainnet deployed contract addresses
│   ├── assets.ts               # Supported asset metadata (USDC, cbBTC, WETH)
│   └── chains.ts               # Chain configurations (Base Mainnet / Localhost)
│
├── styles/                     # Global Stylesheets
│   └── globals.css             # Tailwind directives & CSS custom variables
│
└── public/                     # Static Assets & Icons
    ├── favicon.ico
    ├── logo.svg
    └── tokens/                 # Token icons (usdc.svg, cbbtc.svg, weth.svg)
```
