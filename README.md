# UnifyVault Protocol Monorepo

Welcome to the official repository for the **UnifyVault Protocol**, a decentralized, non-custodial crypto index protocol deployed on the **Base** Layer-2 blockchain.

UnifyVault is designed to make investing in digital asset indices (starting with the flagship 50% BTC + 50% ETH weighted index: **UVBTCETH**) as simple and transparent as standard payment systems.

---

## 1. Monorepo Structure

This project is organized as a production-grade Turborepo monorepo managed with `pnpm` workspaces:

```
unifyvault-monorepo/
├── apps/                  # User interfaces and dashboards (e.g. Angular Web Client)
├── services/              # NestJS APIs, Queue Workers, Sync Engines, Database models
├── packages/              # Shared monorepo configurations (tsconfig, eslint, prettier)
├── docs/                  # Core protocol vision, specifications, and blueprints
├── infra/                 # Deployment infrastructure (docker-compose, configs, pipelines)
├── scripts/               # Administrative helper and deployment scripts
└── tests/                 # End-to-end and integration test suites
```

---

## 2. Prerequisites

To build and run this workspace locally, ensure you have installed:

- **Node.js** (v18.0.0 or higher)
- **pnpm** (v8.0.0 or higher)
- **Docker & Docker Compose** (for running local PostgreSQL and Redis DB instances)

---

## 3. Getting Started

### 3.1. Install dependencies

Run pnpm install from the root workspace directory:

```bash
pnpm install
```

### 3.2. Launch local database and caching instances

Use Docker Compose to launch local instances of PostgreSQL (development state store) and Redis (BullMQ queue broker):

```bash
docker compose up -d
```

### 3.3. Build all workspace configurations

Run Turborepo pipeline compilation:

```bash
pnpm run build
```

---

## 4. Development Operations

The monorepo provides commands configured at the workspace level:

| Command           | Action                                                   | Pipeline Tool |
| :---------------- | :------------------------------------------------------- | :------------ |
| `pnpm run build`  | Compiles and builds all apps, services, and packages.    | Turborepo     |
| `pnpm run dev`    | Runs the workspace in hot-reload local development mode. | Turborepo     |
| `pnpm run lint`   | Runs ESLint syntax and code styling checks.              | Turborepo     |
| `pnpm run test`   | Executes the complete test suite.                        | Turborepo     |
| `pnpm run format` | Formats codebase syntax (TS, JS, JSON, Markdown).        | Prettier      |

---

## 5. Documentation References

The complete core architecture and roadmap specifications are located inside the `/docs` directory:

1.  **Vision Paper:** [01-vision.md](file:///Users/apple/Documents/UnifyVault-UV/docs/01-vision.md)
2.  **Protocol Whitepaper:** [02-whitepaper.md](file:///Users/apple/Documents/UnifyVault-UV/docs/02-whitepaper.md)
3.  **Tokenomics Model:** [03-tokenomics.md](file:///Users/apple/Documents/UnifyVault-UV/docs/03-tokenomics.md)
4.  **System Architecture Spec:** [04-architecture.md](file:///Users/apple/Documents/UnifyVault-UV/docs/04-architecture.md)
5.  **Smart Contract Specifications:** [05-smart-contracts.md](file:///Users/apple/Documents/UnifyVault-UV/docs/05-smart-contracts.md)
6.  **Security Framework & Runbook:** [06-security.md](file:///Users/apple/Documents/UnifyVault-UV/docs/06-security.md)
7.  **REST & WS API Blueprints:** [07-api.md](file:///Users/apple/Documents/UnifyVault-UV/docs/07-api.md)
8.  **Frontend Angular Architecture:** [08-frontend.md](file:///Users/apple/Documents/UnifyVault-UV/docs/08-frontend.md)
9.  **Backend Services Blueprint:** [09-backend.md](file:///Users/apple/Documents/UnifyVault-UV/docs/09-backend.md)
10. **Execution Roadmap:** [10-roadmap.md](file:///Users/apple/Documents/UnifyVault-UV/docs/10-roadmap.md)
11. **Brand Identity Guidelines:** [11-brand.md](file:///Users/apple/Documents/UnifyVault-UV/docs/11-brand.md)
12. **Founder Pitch Deck:** [12-founder-deck.md](file:///Users/apple/Documents/UnifyVault-UV/docs/12-founder-deck.md)
13. **Financial Operations Model:** [13-financial-model.md](file:///Users/apple/Documents/UnifyVault-UV/docs/13-financial-model.md)
14. **Legal & Compliance Framework:** [14-legal-compliance.md](file:///Users/apple/Documents/UnifyVault-UV/docs/14-legal-compliance.md)
15. **Liquidity Engineering Strategy:** [15-liquidity-strategy.md](file:///Users/apple/Documents/UnifyVault-UV/docs/15-liquidity-strategy.md)
