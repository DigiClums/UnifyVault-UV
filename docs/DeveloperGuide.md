# Developer Guide

This guide provides instructions for setting up a local development environment, installing dependencies, building smart contracts, running unit/integration tests, and contributing to UnifyVault V2.

---

## 1. Prerequisites

Ensure your system has the following dependencies installed:

- **Node.js**: `>= 18.0.0`
- **pnpm**: `>= 9.4.0`
- **Foundry (`forge`, `cast`, `anvil`)**: `>= 0.2.0`
- **Git**

---

## 2. Environment Setup

### 2.1 Clone Repository & Install Dependencies

```bash
git clone git@github.com:DigiClums/UnifyVault-UV.git
cd UnifyVault-UV

# Install all workspace dependencies
pnpm install
```

### 2.2 Configure Environment Variables

Create `.env` in the root workspace directory:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_ADMIN_ADDRESS=0xd905920c91853039060246Ed5724AA72B91a96DA
BASESCAN_API_KEY=your_basescan_api_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
PORT=3001
```

Create `.env.local` in `apps/web-v2`:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=146781145b65a1c63ffcd7d6eaf03bd1
NEXT_PUBLIC_APP_DOMAIN=https://app.unifyvault.xyz
NEXT_PUBLIC_ACTIVE_CHAIN=base-sepolia
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA=0x8040006d6907a84911aaC0a9aC08278311B156e2
NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA=0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb
NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA=0xe908377f96F313a6b7771570ff6Fb414D38F451A
```

---

## 3. Working with Smart Contracts

Smart contracts are managed using Foundry in `packages/protocol`.

### 3.1 Compile Contracts

```bash
pnpm --filter @unifyvault/protocol build
```

### 3.2 Run Test Suite

```bash
# Run all Foundry tests
pnpm --filter @unifyvault/protocol test

# Run tests with verbosity
cd packages/protocol && forge test -vvv
```

### 3.3 Format & Lint Contracts

```bash
# Format Solidity code
pnpm format

# Run Solhint linter
pnpm --filter @unifyvault/protocol lint
```

---

## 4. Working with the Frontend

### 4.1 Development Mode

```bash
# Run Next.js web application on http://localhost:3005
pnpm dev
```

### 4.2 Run Frontend Unit & Integration Tests

```bash
# Run Vitest test suites
cd apps/web-v2 && npx vitest run
```

### 4.3 Production Build & Preview

```bash
# Build production bundle
pnpm --filter @unifyvault/web-v2 build

# Start production server on port 3001
cd apps/web-v2 && pnpm start -p 3001
```

---

## 5. Code Standards & Guidelines

- **Solidity**: Follow OpenZeppelin standards, strict NatSpec comments, explicit error definitions in `Errors.sol`, and event emissions in `Events.sol`.
- **TypeScript**: Strict mode enabled (`tsconfig.json`), no implicit `any`, and full ESLint + Prettier formatting.
- **Git Commits**: Use conventional commits format (e.g. `feat: ...`, `fix: ...`, `docs: ...`).
