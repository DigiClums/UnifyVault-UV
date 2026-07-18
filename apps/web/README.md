# UnifyVault Frontend Foundation (Module 1)

This package contains the production-ready React & Next.js frontend foundation for the UnifyVault Protocol. It establishes the workspace tooling, layout routing, environment validations, and Web3 connection clients.

It contains **zero business logic** and **zero mock protocol metrics** (like TVL, APY, or balances), ensuring clean module boundaries for future feature modules.

---

## Directory Architecture

```bash
apps/web/
├── app/                  # Next.js App Router (Layout & Page Router Pages)
│   ├── dashboard/        # Dashboard layout container placeholder
│   ├── deposit/          # Deposit module layout container placeholder
│   ├── redeem/           # Redemption module layout container placeholder
│   ├── portfolio/        # User portfolio layout container placeholder
│   └── settings/         # App configuration settings placeholder
├── components/           # Reusable UI & Layout Components
│   ├── layout/           # Shared wrappers (Navbar, Footer, Container, PageWrapper, ThemeToggle)
│   └── web3/             # Web3 connectors (WalletButton placeholder using RainbowKit)
├── docs/                 # Foundation reports & documentation
├── lib/                  # Application Logic and Utilities
│   ├── config/           # Configs (wagmiConfig, chains, constants, environment validations)
│   └── utils/            # Generic utilities (class merger, BigInt formatters, generic error parser)
├── providers/            # Shared Context Providers (AppProvider, ThemeProvider, Web3Provider)
├── styles/               # Global CSS stylesheet (Tailwind & design system tokens)
└── public/               # Public assets
```

---

## Technical Configuration & Environments

### Required Variables

Create a `.env.local` inside this directory using `.env.example` as a template:

- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: A project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/).
- `NEXT_PUBLIC_RPC_URL_BASE_MAINNET`: RPC connection URL for Base Mainnet.
- `NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA`: RPC connection URL for Base Sepolia.
- `NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET`: Registry contract directory address on Base Mainnet.
- `NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA`: Registry contract directory address on Base Sepolia.

---

## Installation & Commands

Run all commands from the monorepo root:

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
pnpm --filter @unifyvault/web dev
```

### 3. Check Linter Rules

```bash
pnpm --filter @unifyvault/web lint
```

### 4. Build Production Bundle

```bash
pnpm --filter @unifyvault/web build
```

---

## Coding Standards

1. **Module Separation:** Never place protocol-specific transaction logic, ABIs, or contract calls inside layout components. Always place transactional operations inside custom hooks or separate services.
2. **Type Safety:** Strict TypeScript is enforced. Do not use the `any` keyword. Use `unknown` for raw inputs and typecast safely.
3. **Pure Utilities:** Utilities located under `lib/utils` must be completely generic and free of protocol-specific contract errors or state mappings.
4. **Environment Integrity:** Environment variables must always be parsed and validated using Zod at load time.

---

## Future Module Roadmap

1. **Module 1 (Current):** Setup of next-themes, Wagmi v2 connection clients, folder structures, responsive navigation layouts, and production build pipelines.
2. **Module 2 (Oracle & TVL):** Integration of read contract calls to load directory mappings, TVL summaries, supported collateral assets, and price feed parameters from the Oracle Manager.
3. **Module 3 (Deposit & Mint):** Implementation of transaction helpers, slippage calculation inputs, SafeERC20 token approvals, and deposit execution forms.
4. **Module 4 (Redeem & Burn):** Implementation of share redemption preview states, burn transaction inputs, and fee summaries.
5. **Module 5 (Portfolio & History):** Integration of user balance listings, indexers to pull historical transaction logs, and portfolio performance calculations.
