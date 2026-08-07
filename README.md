# UnifyVault Protocol V2

UnifyVault is an institutional-grade, multi-asset yield and vault management protocol deployed on Ethereum Layer-2 networks (Base Mainnet and Base Sepolia). It provides automated portfolio rebalancing, real-time Net Asset Value (NAV) pricing via oracle aggregators, strict slippage protection, and donation-immune collateral accounting.

---

## Table of Contents

- [Overview](#overview)
- [Vision](#vision)
- [Key Features](#key-features)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Build Instructions](#build-instructions)
- [Testing](#testing)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Security Notes](#security-notes)
- [Documentation Index](#documentation-index)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

UnifyVault V2 combines high-performance multi-asset vault accounting with decentralized governance controls. Users deposit supported collateral assets (such as USDC, cbBTC, and WETH) to mint `UVBTCETHToken` share tokens representing proportional ownership of the vault's underlying net asset value.

The protocol features dynamic module discovery through `ProtocolDirectory`, multi-provider oracle pricing with fallback support via `OracleManager`, automated portfolio rebalancing through `PortfolioManager` and `SwapAdapter`, and governance execution enforced by `UnifyVaultTimelock`.

---

## Vision

UnifyVault aims to set the benchmark for transparent, non-custodial, and security-first asset management on EVM-compatible Layer-2 networks. By eliminating single points of failure, enforcing on-chain rate limits, and implementing strict role segregation, UnifyVault delivers institutional liquidity routing with zero compromise on decentralization.

---

## Key Features

- **Dynamic Module Directory**: `ProtocolDirectory` serves as the single source of truth for contract addresses, allowing seamless module updates without hardcoding contract dependencies.
- **Oracle Resilience**: `OracleManager` aggregates price feeds from Chainlink (`ChainlinkOracleProvider`) and fallback sources (`MockOracleProvider`), enforcing heartbeat limits and price freshness checks.
- **Donation-Immune Custody**: `CustodyVault` separates tracked user deposits from untracked asset transfers, immunizing share pricing against balance inflation attacks.
- **Automated Portfolio Management**: `PortfolioManager` and `StrategyManager` manage target asset allocations (BPS) and execute trades via `SwapAdapter` with strict slippage limits.
- **Timelock Governance**: `UnifyVaultTimelock` enforces a 48-hour delay on administrative and governance actions, requiring multi-sig (Gnosis Safe) proposal approval.
- **Role-Based Access Control (RBAC)**: Fine-grained OpenZeppelin `AccessControl` permissions (`GOVERNANCE_ROLE`, `GUARDIAN_ROLE`, `CONTROLLER_ROLE`, `BOT_ROLE`, `ORACLE_OPERATOR_ROLE`).
- **Emergency Circuit Breakers**: Granular pause/resume controls (`Pausable`) on controller and vault modules managed by designated Guardians.

---

## Repository Structure

```
UnifyVault-UV/
├── apps/
│   ├── web-v2/             # Next.js 15 production web interface (app.unifyvault.xyz)
│   └── web-v2-testnet/     # Staging/testnet web interface build
├── packages/
│   ├── protocol/           # Foundry smart contracts, scripts, & test suites
│   ├── design-system/      # Shared UI component primitives
│   ├── sdk/                # TypeScript client SDK for protocol interaction
│   ├── shared/             # Shared TypeScript utilities and type definitions
│   ├── eslint-config/      # Shared ESLint configuration
│   ├── prettier-config/    # Shared Prettier code formatting rules
│   └── tsconfig/           # Base TypeScript configuration files
├── scripts/                # QA audit and automation scripts
├── docs/                   # Full protocol documentation suite
├── pnpm-workspace.yaml     # pnpm monorepo workspace definition
├── turbo.json              # Turborepo build orchestration configuration
└── package.json            # Root workspace scripts & dev dependencies
```

---

## Tech Stack

### Smart Contracts (`packages/protocol`)
- **Solidity**: `0.8.24` (EVM version: London/Paris)
- **Framework**: Foundry (`forge`)
- **Standards**: OpenZeppelin Contracts v5.0.2 (`AccessControl`, `Pausable`, `ReentrancyGuard`, `SafeERC20`, `TimelockController`, `ERC20`)

### Frontend (`apps/web-v2`)
- **Framework**: Next.js 15.0.3 (React 19, App Router)
- **Styling**: TailwindCSS 3.4, Framer Motion, Lucide Icons
- **Web3 Integration**: Wagmi v2, Viem v2, RainbowKit v2, TanStack Query v5

---

## Quick Start

### Prerequisites
- Node.js `>= 18.0.0`
- pnpm `>= 9.4.0`
- Foundry (`forge` `>= 0.2.0`)

### Installation

```bash
# Clone repository
git clone git@github.com:DigiClums/UnifyVault-UV.git
cd UnifyVault-UV

# Install pnpm workspace dependencies
pnpm install
```

---

## Local Development

To run the Next.js frontend locally:

```bash
# Run web-v2 application in dev mode (default port: 3005)
pnpm dev

# Or run directly via Turbo
pnpm turbo run dev --filter=@unifyvault/web-v2
```

---

## Build Instructions

```bash
# Build smart contracts via Foundry
pnpm --filter @unifyvault/protocol build

# Build Next.js web application
pnpm --filter @unifyvault/web-v2 build

# Build all monorepo packages
pnpm build
```

---

## Testing

```bash
# Run all smart contract tests via Foundry
pnpm --filter @unifyvault/protocol test

# Run specific test file
cd packages/protocol && forge test --match-path test/UnifyVaultController.t.sol
```

---

## Deployment

Contracts are deployed using Foundry forge scripts.

```bash
# Simulate V2 deployment locally
cd packages/protocol
forge script script/DeployV2.s.sol:DeployV2Script

# Deploy to Base Sepolia testnet
forge script script/DeployV2.s.sol:DeployV2Script \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

For complete deployment procedures, see [`docs/Deployment.md`](docs/Deployment.md).

---

## Environment Variables

Root `.env` template:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_ADMIN_ADDRESS=0xd905920c91853039060246Ed5724AA72B91a96DA
BASESCAN_API_KEY=your_basescan_api_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
PORT=3001
```

Frontend `apps/web-v2/.env.local`:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=146781145b65a1c63ffcd7d6eaf03bd1
NEXT_PUBLIC_APP_DOMAIN=https://app.unifyvault.xyz
NEXT_PUBLIC_ACTIVE_CHAIN=base-sepolia
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA=0x61572e7207057A0394Ec087995cA337556b95D5c
NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET=0x7EF5D93f83995228efFc63dbe513367a719f0633
```

---

## Security Notes

- **Access Control**: All administrative functions require `GOVERNANCE_ROLE` or `DEFAULT_ADMIN_ROLE`.
- **Reentrancy Protection**: `ReentrancyGuard` applied on all state-changing financial interactions (`deposit`, `redeem`, `rebalance`).
- **Inflation Protection**: First deposit burns `DEAD_SHARES` (`1000`) to prevent share ratio manipulation.
- **Circuit Breakers**: Emergency pause capability allows Guardians to halt deposits and redemptions instantly during security incidents.

---

## Documentation Index

Detailed architectural and technical guides are available in the [`docs/`](docs/) directory:

- [`Architecture.md`](docs/Architecture.md) — System design, data flow, & component interaction.
- [`Contracts.md`](docs/Contracts.md) — Comprehensive contract specification & reference.
- [`Deployment.md`](docs/Deployment.md) — Deployment scripts, sequence, & verification.
- [`Governance.md`](docs/Governance.md) — Timelock, roles, & governance controls.
- [`Security.md`](docs/Security.md) — Threat model, security invariants, & emergency controls.
- [`Frontend.md`](docs/Frontend.md) — Web application structure, pages, & Web3 integration.
- [`DeveloperGuide.md`](docs/DeveloperGuide.md) — Development setup, workflows, & coding standards.
- [`API.md`](docs/API.md) — External data access & EVM RPC interaction layer.
- [`Testing.md`](docs/Testing.md) — Testing strategy, test suites, & mock architecture.
- [`Repository.md`](docs/Repository.md) — Workspace layout & package descriptions.

---

## Contributing

Please review [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines on code standards, pull request processes, and branch naming conventions.

---

## License

This project is licensed under the [MIT License](LICENSE).
