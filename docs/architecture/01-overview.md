---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# System Architecture & Design Patterns

This document describes the high-level architecture, module decomposition, monorepo organization, and core design principles of **UnifyVault V2**.

---

## 🏗️ 1. High-Level Architecture Overview

UnifyVault V2 is engineered around a **decoupled, modular architecture**. Unlike traditional monolithic vault systems where collateral storage, fee accounting, share minting, pricing, and rebalancing logic reside in a single contract, UnifyVault splits these concerns into specialized smart contracts coordinated by a central registry and execution controller.

```
                               ┌───────────────────────────────┐
                               │       ProtocolDirectory       │
                               └───────────────┬───────────────┘
                                               │ (Module Lookup)
     ┌───────────────────────┬─────────────────┼─────────────────┬───────────────────────┐
     ▼                       ▼                 ▼                 ▼                       ▼
┌──────────────┐     ┌──────────────┐ ┌────────────────┐ ┌──────────────┐     ┌─────────────────┐
│ CustodyVault │     │ Treasury     │ │ UVBTCETHToken  │ │ FeeManager   │     │ OracleManager   │
└──────────────┘     └──────────────┘ └────────────────┘ └──────────────┘     └────────┬────────┘
     ▲                      ▲                                                          │
     │ (Custody)            │ (Fees)                                                   │ (Prices)
┌────┴──────────────────────┴──────────────────────────────────────────────────────────┴────────┐
│                              UnifyVaultController                                             │
│                    (Live Execution Engine & Orchestrated Swaps)                               │
└──────┬──────────────────────┬─────────────────────────────────┬───────────────────────────────┘
       │                      │                                 │
       ▼                      ▼                                 ▼
┌──────────────┐     ┌──────────────────┐             ┌───────────────────┐
│ SwapAdapter  │     │ PortfolioManager │             │ StrategyManager   │
│ (Uniswap V3) │     │ (NAV Engine)     │             │ (Target Weights)  │
└──────────────┘     └──────────────────┘             └───────────────────┘
```

---

## 🧱 2. Core Architectural Principles

### 1. Separation of Custody, Revenue & Orchestration

- **[`CustodyVault`](../contracts/CustodyVault.md)**: Safeguards user collateral strategy assets (USDC, cbBTC, WETH) without containing fee parameters or share minting functions.
- **[`Treasury`](../contracts/Treasury.md)**: Collects and holds protocol fee revenue (deposit fees, redeem fees, performance fees) independently from user collateral.
- **[`UnifyVaultController`](../contracts/UnifyVaultController.md)**: Orchestrates deposit/redeem execution, token swaps, and fee routing. Holds zero long-term balance.

### 2. Zero-Retained-Balance Invariant

`UnifyVaultController` operates strictly as a transient execution engine. Every deposit or redemption transaction explicitly asserts at conclusion that the controller's token balance is zero:

```solidity
uint256 controllerBal = IERC20(asset).balanceOf(address(this));
if (controllerBal != 0) {
    revert ProtocolErrors.InsufficientReserves(asset, 0, controllerBal);
}
```

### 3. Dynamic Module Resolution

Instead of hardcoding contract addresses into state variables, modules resolve dependencies dynamically via **[`ProtocolDirectory`](../contracts/ProtocolDirectory.md)** using `bytes32` module identifiers (e.g. `ModuleIds.ORACLE`, `ModuleIds.VAULT`).

### 4. Single-Token Multi-Asset Portfolio Index

Users receive single-token index shares (**[`UVBTCETHToken`](../contracts/UVBTCETHToken.md)**) representing proportional ownership of an underlying basket of strategy assets (60% cbBTC / 40% WETH), with NAV valued dynamically in USD.

---

## 📦 3. Monorepo Package Topology

```
UnifyVault-UV/
├── packages/
│   ├── protocol/         # Core Solidity 0.8.24 contracts & Foundry test suite
│   ├── sdk/              # Client-side TypeScript SDK (@unifyvault/sdk)
│   ├── design-system/    # Shared UI component library (@unifyvault/design-system)
│   └── shared/           # Shared TypeScript types & helpers (@unifyvault/shared)
├── apps/
│   ├── web/              # Next.js 14 App Router frontend application
│   └── admin/            # Administrative portal (@unifyvault/admin)
├── services/
│   └── api/              # NestJS REST/WebSocket API Gateway (@unifyvault/api)
├── scripts/              # Off-chain keepers (oracleKeeper.js, indexerDaemon.js)
└── infra/                # Docker deployment configs & docker-compose setups
```

---

## 🔗 Related Documents

- [`02-module-system.md`](02-module-system.md) — ProtocolDirectory & Dynamic Module Resolution
- [`03-data-flow.md`](03-data-flow.md) — End-to-End Data & Execution Flows
- [`../contracts/UnifyVaultController.md`](../contracts/UnifyVaultController.md) — Controller Contract Specification

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
