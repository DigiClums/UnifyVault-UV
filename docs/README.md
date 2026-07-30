---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers, DevOps
Prerequisites: EVM, Solidity 0.8.24, Next.js 14, Foundry
Related Documents: [TOKENOMICS.md](TOKENOMICS.md), [ROADMAP.md](ROADMAP.md), [CHANGELOG.md](CHANGELOG.md)
---

# UnifyVault-UV Protocol Documentation Homepage

Welcome to the official, production-grade documentation for **UnifyVault V2** — a non-custodial, multi-asset crypto index vault protocol deployed on EVM networks (Base Mainnet / Sepolia).

This documentation suite serves as the single source of truth for protocol developers, smart contract auditors, security researchers, frontend engineers, SDK integrators, and DevOps operators.

---

## 📌 1. Project Overview

UnifyVault V2 enables users to deposit collateral (USDC) to mint single-token index shares ([`UVBTCETHToken`](contracts/UVBTCETHToken.md) / `UVBTCETH`), representing proportional, asset-backed ownership of an underlying portfolio of strategy tokens (cbBTC and WETH).

```
┌─────────────────────────────────────────────────────────────────┐
│                       ProtocolDirectory                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
    ┌───────────────────┬────────┴──────────┬───────────────────┐
    │                   │                   │                   │
    ▼                   ▼                   ▼                   ▼
┌──────────────┐ ┌──────────────┐   ┌──────────────┐    ┌──────────────┐
│  Controller  │ │ CustodyVault │   │ LiquidityMgr │    │   Treasury   │
└──────┬───────┘ └──────────────┘   └──────────────┘    └──────────────┘
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
┌──────────────┐ ┌──────────────┐   ┌──────────────┐
│ SwapAdapter  │ │ PortfolioMgr │   │ StrategyMgr  │
└──────────────┘ └──────────────┘   └──────────────┘
```

---

## 🏛️ 2. Architecture Overview

UnifyVault V2 is built on a **decoupled, modular architecture**:

- **[`CustodyVault`](contracts/CustodyVault.md)**: Passive collateral vault holding strategy assets (USDC, cbBTC, WETH).
- **[`Treasury`](contracts/Treasury.md)**: Dedicated revenue storage collecting protocol and performance fees.
- **[`UnifyVaultController`](contracts/UnifyVaultController.md)**: Transient execution engine enforcing the **Zero-Retained-Balance Invariant**.
- **[`ProtocolDirectory`](contracts/ProtocolDirectory.md)**: Central address locator resolving `bytes32` module IDs.

---

## 📚 3. Complete Documentation Index

| Section          | File Path                                                                | Scope & Focus                                    |
| :--------------- | :----------------------------------------------------------------------- | :----------------------------------------------- |
| **Economics**    | [`TOKENOMICS.md`](TOKENOMICS.md)                                         | Fee structure and protocol economics             |
| **Roadmap**      | [`ROADMAP.md`](ROADMAP.md)                                               | Implementation status matrix & milestone roadmap |
| **Changelog**    | [`CHANGELOG.md`](CHANGELOG.md)                                           | Version history & release notes                  |
| **Architecture** | [`architecture/01-overview.md`](architecture/01-overview.md)             | Monorepo layout & core architectural design      |
|                  | [`architecture/02-module-system.md`](architecture/02-module-system.md)   | `ProtocolDirectory` & module resolution          |
|                  | [`architecture/03-data-flow.md`](architecture/03-data-flow.md)           | Deposit & redemption data flows                  |
| **Contracts**    | [`contracts/ProtocolDirectory.md`](contracts/ProtocolDirectory.md)       | Module directory specification                   |
|                  | [`contracts/UnifyVaultController.md`](contracts/UnifyVaultController.md) | Central orchestrator specification               |
|                  | [`contracts/CustodyVault.md`](contracts/CustodyVault.md)                 | Collateral custody vault specification           |
|                  | [`contracts/Treasury.md`](contracts/Treasury.md)                         | Fee revenue vault specification                  |
|                  | [`contracts/UVBTCETHToken.md`](contracts/UVBTCETHToken.md)               | Index share token specification                  |
|                  | [`contracts/PortfolioManager.md`](contracts/PortfolioManager.md)         | NAV calculation engine specification             |
|                  | [`contracts/StrategyManager.md`](contracts/StrategyManager.md)           | Target weight manager specification              |
|                  | [`contracts/LiquidityManager.md`](contracts/LiquidityManager.md)         | Liquidity threshold manager specification        |
|                  | [`contracts/FeeManager.md`](contracts/FeeManager.md)                     | Fee parameter registry specification             |
|                  | [`contracts/OracleManager.md`](contracts/OracleManager.md)               | Pricing coordinator specification                |
|                  | [`contracts/SwapAdapter.md`](contracts/SwapAdapter.md)                   | Uniswap V3 swap router specification             |
| **Protocol**     | [`protocol/deposit-lifecycle.md`](protocol/deposit-lifecycle.md)         | Live deposit sequence & safety checks            |
|                  | [`protocol/redeem-lifecycle.md`](protocol/redeem-lifecycle.md)           | Live redemption sequence & fee settlement        |
|                  | [`protocol/nav-calculation.md`](protocol/nav-calculation.md)             | NAV valuation mathematical formulas              |
|                  | [`protocol/oracle-pricing.md`](protocol/oracle-pricing.md)               | Price normalization & staleness rules            |
|                  | [`protocol/fee-engine.md`](protocol/fee-engine.md)                       | Deposit, redeem & performance fee math           |
|                  | [`protocol/liquidity-management.md`](protocol/liquidity-management.md)   | Operational & reserve threshold accounting       |
|                  | [`protocol/emergency-pause.md`](protocol/emergency-pause.md)             | Circuit breaker mechanics (`Pausable`)           |
| **Security**     | [`security/threat-model.md`](security/threat-model.md)                   | Attack surface & mitigations                     |
|                  | [`security/access-control-matrix.md`](security/access-control-matrix.md) | Role-Based Access Control (RBAC) matrix          |
|                  | [`security/security-invariants.md`](security/security-invariants.md)     | Protocol security invariants                     |
|                  | [`security/emergency-procedures.md`](security/emergency-procedures.md)   | Emergency pause & incident response              |
| **Governance**   | [`governance/governance-flow.md`](governance/governance-flow.md)         | Multisig administration & role migration         |
| **Deployment**   | [`deployment/deployment-guide.md`](deployment/deployment-guide.md)       | Sequential deployment order & scripts            |
|                  | [`deployment/verification.md`](deployment/verification.md)               | Post-deployment verification procedures          |
| **Frontend**     | [`frontend/web-app.md`](frontend/web-app.md)                             | Next.js 14 App Router application guide          |
| **SDK**          | [`sdk/sdk-guide.md`](sdk/sdk-guide.md)                                   | `@unifyvault/sdk` TypeScript integration         |
| **API**          | [`api/api-gateway.md`](api/api-gateway.md)                               | NestJS REST/WebSocket gateway & Prisma schema    |
| **Testing**      | [`testing/test-suite.md`](testing/test-suite.md)                         | Foundry test breakdown (420 tests passing)       |
| **Operations**   | [`operations/keeper-services.md`](operations/keeper-services.md)         | Oracle keepers & indexer daemons                 |
| **References**   | [`references/errors-catalog.md`](references/errors-catalog.md)           | Custom Solidity errors catalog                   |
|                  | [`references/events-catalog.md`](references/events-catalog.md)           | Custom Solidity events catalog                   |
|                  | [`references/constants-reference.md`](references/constants-reference.md) | Role hashes, module IDs, network configs         |

---

## 🗂️ 4. Repository Structure

```
UnifyVault-UV/
├── packages/
│   ├── protocol/              # Solidity Smart Contracts & Foundry Test Suite
│   ├── sdk/                   # TypeScript Client SDK (@unifyvault/sdk)
│   ├── design-system/         # Shared UI Components (@unifyvault/design-system)
│   └── shared/                # Shared Utilities & Constants (@unifyvault/shared)
├── apps/
│   ├── web/                   # Next.js 14 App Router Frontend Client
│   └── admin/                 # Admin Portal Workspace (@unifyvault/admin)
├── services/
│   └── api/                   # NestJS Microservice API Gateway (@unifyvault/api)
├── infra/                     # Infrastructure Docker Blueprints
└── scripts/                   # Keeper Bots & Indexer Daemons
```

---

## ⚡ 5. Quick Start & Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Foundry (`forge`, `cast`, `anvil`)

### Installation & Test Execution

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run Foundry test suite (52 test suites, 420 passed tests)
cd packages/protocol
forge test
```

---

## 🚀 6. Deployment Summary

Deployments are executed via Foundry scripts:

1. `DeployV2.s.sol`: Deploys core contracts.
2. `RegisterAndConfigureV2.s.sol`: Registers addresses in `ProtocolDirectory` and sets strategy weights.
3. `GrantAdminRoles.s.sol`: Grants roles to Governance Multisig.

---

## 🛡️ 7. Security & Contributing

- Security policy: See [`../SECURITY.md`](../SECURITY.md).
- Contribution guidelines: See [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
- License: [MIT](../LICENSE).

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source Code (`packages/protocol/src/`), Test Suite (`packages/protocol/test/`)
- **Related Contracts**: [`contracts/ProtocolDirectory.md`](contracts/ProtocolDirectory.md), [`contracts/UnifyVaultController.md`](contracts/UnifyVaultController.md)
- **Related Tests**: `packages/protocol/test/V2ProtocolInvariants.t.sol`
- **Last Reviewed**: 2026-07-30
