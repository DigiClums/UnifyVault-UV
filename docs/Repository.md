# Repository Structure & Package Guide

This document describes the organization of directories, workspaces, and packages within the UnifyVault V2 monorepo workspace.

---

## Workspace Overview

UnifyVault is organized as a **pnpm monorepo** managed with **Turborepo**.

```
UnifyVault-UV/
├── apps/
│   ├── web-v2/             # Primary Next.js 15 production web application
│   └── web-v2-testnet/     # Staging/testnet environment deployment build
├── packages/
│   ├── protocol/           # Smart contracts, deployment scripts, & Foundry tests
│   ├── design-system/      # Shared React UI primitives & component library
│   ├── sdk/                # TypeScript client SDK for interacting with protocol contracts
│   ├── shared/             # Shared TypeScript interfaces, types, & constants
│   ├── eslint-config/      # Workspace-wide ESLint configuration package
│   ├── prettier-config/    # Workspace-wide Prettier formatting standards
│   └── tsconfig/           # Base TypeScript configuration templates
├── scripts/                # QA audit and operational automation scripts
├── docs/                   # Complete protocol documentation suite
├── infra/                  # Infrastructure configuration templates
├── pnpm-workspace.yaml     # pnpm workspace definition
└── turbo.json              # Turborepo task pipeline configuration
```

---

## Directory Descriptions

### 1. `/apps`
Contains deployable applications:
- **`apps/web-v2`**: The main user-facing decentralized web application (`app.unifyvault.xyz`). Built using Next.js 15 App Router, React 19, TailwindCSS, Wagmi v2, Viem v2, and RainbowKit v2. Features complete deposit/redeem flows, portfolio analytics, and admin management dashboards.
- **`apps/web-v2-testnet`**: Isolated staging environment build configured specifically for Base Sepolia testnet testing.

### 2. `/packages`
Contains shared monorepo packages and smart contract suites:
- **`packages/protocol`**: Core EVM smart contract implementation written in Solidity 0.8.24. Includes Foundry scripts (`script/`), unit/invariant/fork tests (`test/`), ABI artifacts (`out/`), and contract source code (`src/`).
- **`packages/design-system`**: UI component library containing reusable atomic components (buttons, badges, modal dialogs, cards) standardizing visual presentation across apps.
- **`packages/sdk`**: TypeScript SDK providing strongly-typed contract wrappers, NAV calculation helpers, and transaction builders for external integrations.
- **`packages/shared`**: Shared type declarations, constants (e.g. BPS denominator, role hashes), and utility functions utilized by both frontend and SDK.
- **`packages/eslint-config`**, **`packages/prettier-config`**, **`packages/tsconfig`**: Shared developer tooling configurations enforcing consistent code style across the monorepo.

### 3. `/scripts`
Contains automation scripts:
- **`scripts/run_qa_audit.js`**: Operational script performing end-to-end static quality checks, ABI validations, and deployment state checks.

### 4. `/docs`
Contains the complete, single-source-of-truth documentation set for the UnifyVault V2 protocol.

---

## Workspace Scripts Summary

| Command | Workspace Target | Description |
| :--- | :--- | :--- |
| `pnpm build` | All Workspaces | Builds all smart contracts, packages, and Next.js applications via Turbo. |
| `pnpm dev` | `apps/web-v2` | Starts Next.js development server on port 3005. |
| `pnpm test` | `packages/protocol` | Runs Foundry smart contract test suite. |
| `pnpm format` | All Workspaces | Applies Prettier code formatting across all files. |
| `pnpm lint` | All Workspaces | Runs ESLint and Solhint across frontend and contract codebases. |
