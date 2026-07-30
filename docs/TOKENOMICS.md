---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# UnifyVault-UV Protocol Tokenomics & Fee Specification

This document details the economic model, token architecture, fee structures, and protocol fee mechanics implemented in **UnifyVault V2**.

---

## 🪙 1. Index Share Token Architecture

UnifyVault V2 utilizes a single-token index model represented by **[`UVBTCETHToken`](../packages/protocol/src/token/UVBTCETHToken.sol)** (`UVBTCETH`).

| Token Attribute                | Value                                                              |
| :----------------------------- | :----------------------------------------------------------------- |
| **Token Name**                 | UnifyVault BTC ETH Index                                           |
| **Token Symbol**               | `UVBTCETH`                                                         |
| **Decimals**                   | 18                                                                 |
| **Standards**                  | ERC20, ERC20Permit (EIP-2612), AccessControl, Pausable             |
| **Target Strategy Allocation** | 60% cbBTC / 40% WETH                                               |
| **Initial Share NAV**          | $1.00 USD (`1e18` wei)                                             |
| **Mint & Burn Controller**     | `UnifyVaultController` (strictly restricted via `CONTROLLER_ROLE`) |

> [!NOTE]
> `UVBTCETHToken` contains zero internal fee calculations or asset transfer logic. All economic logic, minting triggers, and burning conditions are managed exclusively by `UnifyVaultController`.

---

## 💰 2. Protocol Fee Structure

Fees are collected during deposit and redemption transactions to sustain protocol operations and fund the treasury. All collected fees are routed directly to the **[`Treasury`](../packages/protocol/src/vault/Treasury.sol)** contract.

Fee parameters are governed by **[`FeeManager`](../packages/protocol/src/treasury/FeeManager.sol)** subject to hardcoded safety caps.

```
                               ┌────────────────────────────────┐
                               │       Gross USDC Deposit       │
                               └───────────────┬────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
             ┌───────────────────┐                           ┌───────────────────┐
             │    Protocol Fee   │                           │    Net Deposit    │
             │   0.25% (25 BPS)  │                           │   99.75% (9975 BPS)│
             └─────────┬─────────┘                           └─────────┬─────────┘
                       │                                               │
                       ▼                                               ▼
             ┌───────────────────┐                           ┌───────────────────┐
             │     Treasury      │                           │  Swapped & Minted │
             └───────────────────┘                           └───────────────────┘
```

### Fee Parameter Matrix

| Fee Type           | Default Rate | Basis Points (BPS) | Maximum Safety Cap |  Governance Control  | Collection Destination                                    |
| :----------------- | :----------: | :----------------: | :----------------: | :------------------: | :-------------------------------------------------------- |
| **Deposit Fee**    |    0.25%     |       25 BPS       |  5.00% (500 BPS)   | `setDepositFeeBps()` | [`Treasury`](../packages/protocol/src/vault/Treasury.sol) |
| **Redemption Fee** |    2.00%     |      200 BPS       |  5.00% (500 BPS)   | `setRedeemFeeBps()`  | [`Treasury`](../packages/protocol/src/vault/Treasury.sol) |

---

## 📈 3. Protocol Fee Architecture

UnifyVault V2 implements a clean, deterministic 2-tier fee structure:

1. **Deposit Protocol Fee**: **0.25%** (25 BPS) applied to gross collateral deposits, collected into Treasury.
2. **Redemption Protocol Fee**: **2.00%** (200 BPS) applied to gross payout collateral upon redemption, collected into Treasury.

There are **no performance fees**, **no High Water Mark tracking**, and **no cost basis accounting** on-chain. All user redemptions receive full proportional NAV value net of the standard 2.00% redemption fee.

---

## 🔒 4. Treasury Fee Isolation

All fee revenue is strictly isolated from collateral assets:

- **Collateral Assets** (USDC, cbBTC, WETH) are held in **[`CustodyVault`](../packages/protocol/src/vault/CustodyVault.sol)** and Backing NAV.
- **Protocol Fees** are held in **[`Treasury`](../packages/protocol/src/vault/Treasury.sol)** and are excluded from user NAV calculations.
- Treasury assets can only be withdrawn by accounts possessing `GOVERNANCE_ROLE`.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
