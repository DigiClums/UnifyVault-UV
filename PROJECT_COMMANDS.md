# UnifyVault Protocol: Complete Project Commands Reference (`PROJECT_COMMANDS.md`)

This document is an exhaustive operational reference guide for all verified commands, scripts, workflows, and tools across the **UnifyVault Protocol** monorepo.

---

## 🏗️ Workspace Directory & Architecture Overview

UnifyVault is structured as a **pnpm + Turborepo monorepo** with smart contracts managed via **Foundry**.

```
UnifyVault-UV/
├── apps/
│   ├── web/                    # [@unifyvault/web] Next.js 15 Web Application
│   └── admin/                  # [@unifyvault/admin] Admin Portal Interface
├── packages/
│   ├── protocol/               # [@unifyvault/protocol] Solidity Smart Contracts & Foundry Suite
│   ├── sdk/                    # [@unifyvault/sdk] Client-side TypeScript SDK
│   ├── design-system/          # [@unifyvault/design-system] Shared UI Component Library
│   ├── shared/                 # [@unifyvault/shared] Shared Utilities & Constants
│   ├── eslint-config/          # [@unifyvault/eslint-config] Shared ESLint Rules
│   ├── tsconfig/               # [@unifyvault/tsconfig] Shared TypeScript Configs
│   └── prettier-config/        # [@unifyvault/prettier-config] Shared Prettier Configs
├── services/
│   └── api/                    # [@unifyvault/api] API Gateway (NestJS)
├── scripts/                    # Utility shell & Node scripts
└── infra/                      # Infrastructure & Docker setups
```

---

## 1. Project Setup

### 1.1 Clone Repository

- **Command:** `git clone <repository-url> && cd UnifyVault-UV`
- **What it does:** Clones the remote UnifyVault repository to your local machine and navigates into the project root.
- **When to use it:** Initial environment setup when starting fresh work on a machine.
- **Directory:** Workspace parent directory.
- **Prerequisites:** `git` CLI installed.

### 1.2 Initialize Git Submodules

- **Command:** `git submodule update --init --recursive`
- **What it does:** Initializes and fetches all nested Git submodules (such as Foundry dependencies in `packages/protocol/lib`).
- **When to use it:** Right after cloning the repository or after pulling commits containing submodule updates.
- **Directory:** Root (`/`)
- **Prerequisites:** `git` CLI installed.

### 1.3 Initialize Git Hooks (Husky)

- **Command:** `pnpm run prepare`
- **What it does:** Executes `husky install` to set up automated Git hooks (`.husky/pre-commit` and `.husky/commit-msg`).
- **When to use it:** Automatically executed during `pnpm install`, or manually if hooks need re-registration.
- **Directory:** Root (`/`)
- **Prerequisites:** Node.js (>=18.0.0), pnpm (>=8.0.0, recommended 9.4.0).

---

## 2. Install Dependencies

### 2.1 Install All Monorepo Dependencies

- **Command:** `pnpm install`
- **What it does:** Installs all npm dependencies across the entire monorepo (root, `apps/*`, `packages/*`, `services/*`) based on `pnpm-lock.yaml` and runs `husky install`.
- **When to use it:** Initial repository setup or after adding new package dependencies.
- **Directory:** Root (`/`)
- **Prerequisites:** Node.js >=18.0.0, pnpm >=8.0.0.

### 2.2 Strict CI/CD Dependency Installation

- **Command:** `pnpm install --frozen-lockfile`
- **What it does:** Installs workspace dependencies strictly matching `pnpm-lock.yaml`. Errors out if the lockfile requires updates.
- **When to use it:** In CI/CD build environments (GitHub Actions) or production deployment servers.
- **Directory:** Root (`/`)
- **Prerequisites:** Node.js >=18.0.0, pnpm >=8.0.0.

---

## 3. Development

### 3.1 Start Web Frontend Dev Server (Turborepo Shorthand)

- **Command:** `pnpm run dev`
- **What it does:** Executes `turbo run dev --filter=@unifyvault/web`, launching the Next.js development server on `http://localhost:3002`.
- **When to use it:** Day-to-day development on the primary web application.
- **Directory:** Root (`/`)
- **Prerequisites:** Dependencies installed (`pnpm install`).

### 3.2 Start Web Frontend Dev Server Directly

- **Command:** `pnpm --filter=@unifyvault/web dev` _(or `pnpm dev` inside `apps/web`)_
- **What it does:** Directly runs `next dev -p 3002` for the web app workspace.
- **When to use it:** When focusing specifically on web app code.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** Dependencies installed.

---

## 4. Build

### 4.1 Build Entire Monorepo

- **Command:** `pnpm run build`
- **What it does:** Executes Turborepo build task (`turbo run build`) to compile all workspaces (`apps/*`, `packages/*`, `services/*`) in topological dependency order.
- **When to use it:** Before releasing, testing production builds, or running complete integration validations.
- **Directory:** Root (`/`)
- **Prerequisites:** Dependencies installed.

### 4.2 Build Next.js Web App

- **Command:** `pnpm --filter=@unifyvault/web build` _(or `pnpm build` inside `apps/web`)_
- **What it does:** Runs `next build` to create an optimized production bundle in `apps/web/.next`.
- **When to use it:** Staging or production frontend deployments.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** Dependencies installed.

### 4.3 Build Smart Contracts (Forge)

- **Command:** `pnpm --filter=@unifyvault/protocol build` _(or `forge build` inside `packages/protocol`)_
- **What it does:** Compiles Solidity smart contracts using Foundry (`solc 0.8.24`) into `packages/protocol/out`.
- **When to use it:** After modifying smart contract code.
- **Directory:** Root (`/`) or `packages/protocol`.
- **Prerequisites:** Foundry toolchain (`forge`).

### 4.4 Build TypeScript SDK

- **Command:** `pnpm --filter=@unifyvault/sdk build` _(or `pnpm build` inside `packages/sdk`)_
- **What it does:** Runs `tsc` to compile TypeScript source code to `dist/index.js` and `dist/index.d.ts`.
- **When to use it:** When updating `@unifyvault/sdk`.
- **Directory:** Root (`/`) or `packages/sdk`.
- **Prerequisites:** TypeScript installed.

### 4.5 Build Design System Library

- **Command:** `pnpm --filter=@unifyvault/design-system build` _(or `pnpm build` inside `packages/design-system`)_
- **What it does:** Runs `tsc` to compile shared design system components into `dist/`.
- **When to use it:** When adding or editing shared UI components.
- **Directory:** Root (`/`) or `packages/design-system`.
- **Prerequisites:** TypeScript installed.

### 4.6 Build Shared Utilities

- **Command:** `pnpm --filter=@unifyvault/shared build` _(or `pnpm build` inside `packages/shared`)_
- **What it does:** Runs `tsc` to compile helper utilities to `dist/`.
- **When to use it:** When updating shared constants or helper functions.
- **Directory:** Root (`/`) or `packages/shared`.
- **Prerequisites:** TypeScript installed.

### 4.7 Build API Gateway Service

- **Command:** `pnpm --filter=@unifyvault/api build` _(or `pnpm build` inside `services/api`)_
- **What it does:** Runs `tsc` to compile NestJS API service to `dist/main.js`.
- **When to use it:** Preparing backend service for deployment.
- **Directory:** Root (`/`) or `services/api`.
- **Prerequisites:** TypeScript installed.

### 4.8 Build Admin Portal

- **Command:** `pnpm --filter=@unifyvault/admin build` _(or `pnpm build` inside `apps/admin`)_
- **What it does:** Executes admin portal build script (`echo 'admin: build'`).
- **When to use it:** During full monorepo build pipeline.
- **Directory:** Root (`/`) or `apps/admin`.
- **Prerequisites:** Dependencies installed.

---

## 5. Smart Contract Commands

### 5.1 Compile Contracts

- **Command:** `forge build`
- **What it does:** Compiles all Solidity source files in `src/` using solc `0.8.24` with optimizer runs set to 200 and `via_ir = true`.
- **When to use it:** After modifying contracts or interface specifications.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.2 Execute Foundry Test Suite

- **Command:** `forge test`
- **What it does:** Runs all 44 test suites (335 passing tests) including unit, invariant, economic adversarial, and Base Mainnet fork tests.
- **When to use it:** Regular development verification of smart contract changes.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.3 Execute Tests with Verbose Traces

- **Command:** `forge test -vvv`
- **What it does:** Runs the test suite with execution call traces enabled for failing assertions.
- **When to use it:** Debugging contract reverts or unexpected test failures.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.4 Benchmark Gas Usage

- **Command:** `forge test --gas-report`
- **What it does:** Executes tests and prints a detailed gas report per contract function call.
- **When to use it:** Analyzing gas optimization before production deployment.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.5 Check Solidity Code Formatting

- **Command:** `forge fmt --check`
- **What it does:** Validates that Solidity contracts comply with Foundry formatting guidelines without making changes.
- **When to use it:** In CI pipelines or pre-commit checks.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.6 Auto-Format Solidity Code

- **Command:** `forge fmt`
- **What it does:** Automatically formats all Solidity files in `src/`, `test/`, and `script/`.
- **When to use it:** Before committing smart contract code changes.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.7 Generate Gas Snapshots

- **Command:** `forge snapshot`
- **What it does:** Creates or updates `.gas-snapshot` recording gas usages for all test cases.
- **When to use it:** To track gas diffs and prevent gas regressions over time.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.8 Generate Code Coverage Report

- **Command:** `forge coverage`
- **What it does:** Computes line and branch coverage metrics for smart contracts and writes `lcov.info`.
- **When to use it:** Evaluating test coverage completeness for audit readiness.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.9 Clean Foundry Build Cache

- **Command:** `forge clean`
- **What it does:** Deletes the `out/` build artifacts directory and `cache/` compiler files.
- **When to use it:** When experiencing stale compiler cache artifacts or build errors.
- **Directory:** `packages/protocol`
- **Prerequisites:** Foundry (`forge`).

### 5.10 Solhint Security & Style Linter

- **Command:** `solhint 'src/**/*.sol'` _(or `pnpm --filter=@unifyvault/protocol lint`)_
- **What it does:** Lints smart contract code against style and security guidelines in `.solhint.json`.
- **When to use it:** Prior to code reviews and PR submissions.
- **Directory:** `packages/protocol`
- **Prerequisites:** Solhint installed (`pnpm install`).

### 5.11 Slither Static Analysis Security Scan

- **Command:** `slither packages/protocol` _(or `slither .` inside `packages/protocol`)_
- **What it does:** Runs Slither static analysis on protocol contracts using settings in `packages/protocol/slither.config.json`.
- **When to use it:** Security reviews, audit prep, and continuous security CI scans.
- **Directory:** Root (`/`) or `packages/protocol`.
- **Prerequisites:** Python 3 & Slither analyzer (`pip install slither-analyzer`).

---

## 6. Frontend Commands

### 6.1 Start Frontend Development Server

- **Command:** `pnpm --filter=@unifyvault/web dev`
- **What it does:** Starts the Next.js development server on port 3002.
- **When to use it:** Developing UI components, pages, and web3 integrations.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** Dependencies installed, environment variables configured in `apps/web/.env.local`.

### 6.2 Build Frontend Production Artifacts

- **Command:** `pnpm --filter=@unifyvault/web build`
- **What it does:** Builds the Next.js production web app.
- **When to use it:** Staging or production frontend deployment.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** Dependencies installed.

### 6.3 Serve Frontend Production Build

- **Command:** `pnpm --filter=@unifyvault/web start`
- **What it does:** Serves the pre-built Next.js production bundle from `.next` on port 3002.
- **When to use it:** Verifying production performance and SSR behavior locally.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** `pnpm --filter=@unifyvault/web build` executed.

### 6.4 Run Automated Visual & UX QA Audit

- **Command:** `node scripts/run_qa_audit.js [outputDirectory]`
- **What it does:** Launches headless Chromium via Playwright across 6 viewports (320px - 768px), visiting 8 core pages (`/`, `/dashboard`, `/deposit`, `/redeem`, `/portfolio`, `/governance`, `/health`, `/settings`) to audit horizontal scroll overflows, tap target sizes (<44px), clipped text, mobile navigation drawer, and wallet modal positioning. Saves screenshots and `report.json`.
- **When to use it:** Before production releases or UI refactors to prevent responsive layout regressions.
- **Directory:** Root (`/`)
- **Prerequisites:** Web app server running on `http://localhost:3005` (or configured URL) and Playwright installed.

---

## 7. Backend Commands

### 7.1 Compile API Service

- **Command:** `pnpm --filter=@unifyvault/api build`
- **What it does:** Compiles NestJS backend code to `dist/main.js`.
- **When to use it:** Preparing backend service for containerization or deployment.
- **Directory:** Root (`/`) or `services/api`.
- **Prerequisites:** Dependencies installed.

### 7.2 Run API Service Tests

- **Command:** `pnpm --filter=@unifyvault/api test`
- **What it does:** Executes unit tests for the backend API workspace.
- **When to use it:** Verifying API service contracts.
- **Directory:** Root (`/`) or `services/api`.
- **Prerequisites:** Dependencies installed.

---

## 8. Testing

### 8.1 Run All Tests Across Monorepo

- **Command:** `pnpm run test`
- **What it does:** Executes Turborepo test task (`turbo run test`) across all workspaces (`apps/*`, `packages/*`, `services/*`).
- **When to use it:** CI test pipelines or before merging feature branches.
- **Directory:** Root (`/`)
- **Prerequisites:** Dependencies installed, Foundry installed.

### 8.2 Frontend Unit Tests (Vitest Single Run)

- **Command:** `pnpm --filter=@unifyvault/web test` _(or `vitest run` inside `apps/web`)_
- **What it does:** Runs Vitest unit tests once for the web app workspace.
- **When to use it:** Checking frontend unit test results.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** Dependencies installed.

### 8.3 Frontend Interactive Watch Mode

- **Command:** `pnpm --filter=@unifyvault/web test:watch` _(or `vitest` inside `apps/web`)_
- **What it does:** Launches Vitest interactive test runner that re-runs tests on file changes.
- **When to use it:** Test-driven development (TDD) for frontend components and hooks.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** Dependencies installed.

### 8.4 Frontend Code Coverage

- **Command:** `pnpm --filter=@unifyvault/web test:coverage` _(or `vitest run --coverage` inside `apps/web`)_
- **What it does:** Runs Vitest with V8 coverage collection and exports HTML/JSON reports to `apps/web/coverage/`.
- **When to use it:** Measuring unit test code coverage in CI or locally.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** Dependencies installed (`@vitest/coverage-v8`).

---

## 9. Linting & Formatting

### 9.1 Monorepo Full Lint Check

- **Command:** `pnpm run lint`
- **What it does:** Runs Turborepo lint task (`turbo run lint`), executing ESLint or Solhint across all workspaces.
- **When to use it:** Pre-commit checks and CI pull request validations.
- **Directory:** Root (`/`)
- **Prerequisites:** Dependencies installed.

### 9.2 Workspace-Specific Linting

- **Command:** `pnpm --filter=@unifyvault/web lint`
- **Command:** `pnpm --filter=@unifyvault/protocol lint`
- **Command:** `pnpm --filter=@unifyvault/sdk lint`
- **Command:** `pnpm --filter=@unifyvault/admin lint`
- **Command:** `pnpm --filter=@unifyvault/design-system lint`
- **Command:** `pnpm --filter=@unifyvault/shared lint`
- **Command:** `pnpm --filter=@unifyvault/api lint`
- **What it does:** Runs linter for the designated workspace.
- **When to use it:** Inspecting lint errors in a specific package.
- **Directory:** Root (`/`) or workspace directory.
- **Prerequisites:** Dependencies installed.

### 9.3 Code Formatting (Prettier)

- **Command:** `pnpm run format`
- **What it does:** Formats all supported files (`ts, tsx, js, json, md, sol, yml, yaml`) across the repository using Prettier and `prettier-plugin-solidity`.
- **When to use it:** Formatting entire repository before commit.
- **Directory:** Root (`/`)
- **Prerequisites:** Prettier installed.

### 9.4 Git Staged Formatting (Pre-Commit Hook)

- **Command:** `npx lint-staged`
- **What it does:** Formats staged files with Prettier (`*.{ts,tsx,js,json,sol,md,yml,yaml}`) and auto-fixes JavaScript/TypeScript files with ESLint (`*.{ts,tsx,js}`).
- **When to use it:** Automatically executed by `.husky/pre-commit` on `git commit`.
- **Directory:** Root (`/`)
- **Prerequisites:** `lint-staged` installed.

### 9.5 Commit Message Formatting Check (Commitlint Hook)

- **Command:** `pnpm exec commitlint --edit "$1"`
- **What it does:** Verifies that commit messages comply with Conventional Commits rules defined in `commitlint.config.js`.
- **When to use it:** Automatically executed by `.husky/commit-msg` on `git commit`.
- **Directory:** Root (`/`)
- **Prerequisites:** `@commitlint/cli` installed.

### 9.6 Dependency Security Vulnerability Audit

- **Command:** `pnpm audit --prod`
- **What it does:** Checks installed production dependencies against known security vulnerability databases.
- **When to use it:** Continuous security scanning in CI or before releases.
- **Directory:** Root (`/`)
- **Prerequisites:** pnpm >=8.0.0.

---

## 10. Type Checking

### 10.1 Monorepo Static Typecheck

- **Command:** `pnpm run typecheck`
- **What it does:** Executes Turborepo typecheck task (`turbo run typecheck`), running `tsc --noEmit` across all TypeScript workspaces.
- **When to use it:** Ensuring type safety across all apps and packages before building.
- **Directory:** Root (`/`)
- **Prerequisites:** TypeScript installed.

### 10.2 Web App Typecheck

- **Command:** `pnpm --filter=@unifyvault/web typecheck` _(or `tsc --noEmit` inside `apps/web`)_
- **What it does:** Runs TypeScript compiler in no-emit mode for `@unifyvault/web`.
- **When to use it:** Verifying web app types.
- **Directory:** Root (`/`) or `apps/web`.
- **Prerequisites:** TypeScript installed.

---

## 11. Deployment

### 11.1 Smart Contract Deployment (DeployV2 Script)

- **Command:**
  ```bash
  forge script script/DeployV2.s.sol:DeployV2Script \
    --rpc-url $BASE_MAINNET_RPC \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvvv
  ```
- **What it does:** Deploys the complete UnifyVault V2 smart contract suite (`ProtocolDirectory`, `CustodyVault`, `LiquidityManager`, `Treasury`, `PortfolioManager`, `StrategyManager`, `SwapAdapter`, `OracleManager`, `UVBTCETHToken`, `UnifyVaultController`) to Base Mainnet or Sepolia, broadcasts on-chain transactions, registers addresses in directory, and verifies source code on Basescan.
- **When to use it:** Official production smart contract deployment.
- **Directory:** `packages/protocol`
- **Prerequisites:** Environment variables set (`BASE_MAINNET_RPC`, `PRIVATE_KEY`, `BASESCAN_API_KEY`).

### 11.2 Single Contract Manual Verification

- **Command:**
  ```bash
  forge verify-contract \
    --chain-id 8453 \
    --num-of-optimizations 200 \
    --compiler-version v0.8.24 \
    <DEPLOYED_CONTRACT_ADDRESS> \
    src/<CONTRACT_NAME>.sol:<CONTRACT_NAME> \
    --etherscan-api-key $BASESCAN_API_KEY
  ```
- **What it does:** Manually submits deployed contract bytecode and metadata to Basescan for verification.
- **When to use it:** If automated verification during deployment fails or requires retry.
- **Directory:** `packages/protocol`
- **Prerequisites:** Deployed address, compiler details matching `foundry.toml`, Basescan API key.

### 11.3 Emergency Sentinel Pause Execution

- **Command:**
  ```bash
  cast send <CONTROLLER_ADDRESS> "pause()" \
    --private-key $SENTINEL_PRIVATE_KEY \
    --rpc-url $BASE_MAINNET_RPC
  ```
- **What it does:** Invokes `UnifyVaultController.pause()` to immediately halt deposits, redemptions, and fee settlements.
- **When to use it:** Operational emergency response during invariant failure or oracle anomaly.
- **Directory:** Any terminal.
- **Prerequisites:** Foundry `cast` tool, funded Sentinel key.

---

## 12. Database & Container Commands

### 12.1 Start Local Database & Redis Services (Helper Script)

- **Command:** `./scripts/manage-containers.sh start`
- **What it does:** Launches local PostgreSQL (`unifyvault-db-dev` on port 5432) and Redis (`unifyvault-redis-dev` on port 6379) containers in detached mode using `docker compose up -d`.
- **When to use it:** Starting backend data infrastructure for local development.
- **Directory:** Root (`/`)
- **Prerequisites:** Docker & Docker Compose installed.

### 12.2 Stop Local Database & Redis Containers

- **Command:** `./scripts/manage-containers.sh stop`
- **What it does:** Stops and removes running containers using `docker compose down`.
- **When to use it:** Shutting down local database containers.
- **Directory:** Root (`/`)
- **Prerequisites:** Docker.

### 12.3 Stream Container Logs

- **Command:** `./scripts/manage-containers.sh logs`
- **What it does:** Displays and streams real-time container log output (`docker compose logs -f`).
- **When to use it:** Debugging database connections or Redis Pub/Sub events.
- **Directory:** Root (`/`)
- **Prerequisites:** Docker.

### 12.4 Clean Database Volumes & Reset State

- **Command:** `./scripts/manage-containers.sh clean`
- **What it does:** Stops containers and completely removes named volumes (`postgres_data`, `redis_data`) using `docker compose down -v`.
- **When to use it:** Wiping local test database data to start clean.
- **Directory:** Root (`/`)
- **Prerequisites:** Docker.

### 12.5 Check Container Status & Health

- **Command:** `./scripts/manage-containers.sh status`
- **What it does:** Lists running container statuses, healthcheck results, and port bindings (`docker compose ps`).
- **When to use it:** Checking if PostgreSQL and Redis are ready.
- **Directory:** Root (`/`)
- **Prerequisites:** Docker.

---

## 13. Environment Variables

### 13.1 Smart Contracts & Deployments (`packages/protocol/.env` / Root `.env`)

| Variable                               | Description                                          | Example / Default          |
| :------------------------------------- | :--------------------------------------------------- | :------------------------- |
| `BASE_MAINNET_RPC`                     | Base Mainnet RPC connection endpoint                 | `https://mainnet.base.org` |
| `BASE_SEPOLIA_RPC_URL`                 | Base Sepolia Testnet RPC connection endpoint         | `https://sepolia.base.org` |
| `PRIVATE_KEY` / `DEPLOYER_PRIVATE_KEY` | Private key for deploying contracts & initialization | `0x...`                    |
| `BASESCAN_API_KEY`                     | API key for Basescan contract verification           | `YI8JH...`                 |
| `SENTINEL_PRIVATE_KEY`                 | Emergency Sentinel key for `pause()` invocation      | `0x...`                    |

### 13.2 Web Application (`apps/web/.env` / `apps/web/.env.local`)

| Variable                                | Description                                     | Example / Default                |
| :-------------------------------------- | :---------------------------------------------- | :------------------------------- |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect Cloud Project ID                  | `146781145b...`                  |
| `NEXT_PUBLIC_ACTIVE_CHAIN`              | Active network selection                        | `base-mainnet` \| `base-sepolia` |
| `NEXT_PUBLIC_RPC_URL_BASE_MAINNET`      | Base Mainnet RPC URL                            | `https://mainnet.base.org`       |
| `NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET` | Deployed `ProtocolDirectory` address on Mainnet | `0x...`                          |
| `NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA`      | Base Sepolia RPC URL                            | `https://sepolia.base.org`       |
| `NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA` | Deployed `ProtocolDirectory` address on Sepolia | `0xDd29e54...`                   |
| `NEXT_PUBLIC_BASESCAN_API_KEY`          | Basescan API key                                | `YI8JH...`                       |
| `PORT`                                  | Local web server port                           | `3002`                           |

### 13.3 Local Infrastructure (`docker-compose.yml`)

| Variable            | Description                     | Default Value                     |
| :------------------ | :------------------------------ | :-------------------------------- |
| `POSTGRES_USER`     | Database administrator username | `unifyvault_admin`                |
| `POSTGRES_PASSWORD` | Database administrator password | `unifyvault_secure_password_2026` |
| `POSTGRES_DB`       | Default database name           | `unifyvault_dev`                  |

---

## 14. Troubleshooting

### 14.1 Workspace & `node_modules` Corruption

**Symptom:** `pnpm` workspace resolution errors or missing module type definitions.

```bash
# Clean all node_modules and reinstall lockfile
rm -rf node_modules apps/*/node_modules packages/*/node_modules services/*/node_modules pnpm-lock.yaml && pnpm install
```

### 14.2 Stale Foundry Compiler Cache

**Symptom:** Forge test failures complaining about outdated artifacts or broken remappings.

```bash
cd packages/protocol
forge clean
forge build
```

### 14.3 Port Conflict (3002 / 3005)

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3002`.

```bash
# Find and terminate process running on port 3002
lsof -i :3002 | awk 'NR>1 {print $2}' | xargs kill -9
```

### 14.4 Missing Submodules (`ds-test` / `forge-std`)

**Symptom:** `forge build` fails with `File not found: ds-test/test.sol`.

```bash
git submodule update --init --recursive
```

### 14.5 Local Database Connection Failures

**Symptom:** API backend cannot connect to `localhost:5432`.

```bash
./scripts/manage-containers.sh clean
./scripts/manage-containers.sh start
./scripts/manage-containers.sh status
```

---

## 15. Useful One-Liners & Obsolete / Unverified Command Analysis

### 15.1 Useful One-Liners

- **Complete Clean Rebuild & Verification:**

  ```bash
  pnpm install && pnpm run build && pnpm run test
  ```

- **Smart Contract Security & Invariant Audit Workflow:**

  ```bash
  cd packages/protocol && forge clean && forge build && forge test -vvv && forge snapshot && solhint 'src/**/*.sol'
  ```

- **Web App Full Health Check (Typecheck + Lint + Build + Test):**

  ```bash
  pnpm --filter=@unifyvault/web typecheck && pnpm --filter=@unifyvault/web lint && pnpm --filter=@unifyvault/web build && pnpm --filter=@unifyvault/web test
  ```

- **Spin Up Local Infrastructure & Dev Web Server:**
  ```bash
  ./scripts/manage-containers.sh start && pnpm run dev
  ```

---

### 15.2 Duplicate & Obsolete / Unverified Command Analysis

1. **Smart Contract Deployments (`Deploy.s.sol` vs `DeployV2.s.sol`)**:
   - ❌ **Obsolete:** `forge script script/Deploy.s.sol` (Original V1 deployment script missing directory registration and fee management).
   - ✅ **Preferred:** `forge script script/DeployV2.s.sol:DeployV2Script` (Production V2 deployment script with modular directory resolution and access control configuration).

2. **Container Controls (`docker compose` vs `./scripts/manage-containers.sh`)**:
   - ⚠️ **Duplicate:** Manual execution of `docker compose up -d` or `docker compose down`.
   - ✅ **Preferred:** Use `./scripts/manage-containers.sh {start|stop|clean|status|logs}` because it encapsulates health monitoring and volume reset logic.

3. **Unverified / Missing Package Scripts (Removed from Active Reference List)**:
   - 🚫 `pnpm --filter=@unifyvault/api dev` (Documented in `services/api/README.md:25`, but missing from `services/api/package.json`).
   - 🚫 `pnpm --filter=@unifyvault/sdk dev` (Documented in `packages/sdk/README.md:29`, but missing from `packages/sdk/package.json`).
   - 🚫 `pnpm --filter=@unifyvault/design-system dev` (Documented in `packages/design-system/README.md:29`, but missing from `packages/design-system/package.json`).
   - 🚫 `pnpm --filter=@unifyvault/shared dev` (Documented in `packages/shared/README.md:29`, but missing from `packages/shared/package.json`).
   - 🚫 `pnpm --filter=@unifyvault/admin start` (Documented in `apps/admin/README.md:25`, but missing from `apps/admin/package.json`).

4. **Formatting Commands (`prettier` vs `forge fmt`)**:
   - ⚠️ **Note:** Root `pnpm run format` formats both TypeScript/JS and Solidity (`.sol`) files using Prettier. However, for smart contracts, `forge fmt` is the native Foundry standard and is preferred for contract-only modifications.
