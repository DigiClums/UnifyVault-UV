---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# LiquidityManager Contract Specification

- **File Path**: [`packages/protocol/src/vault/LiquidityManager.sol`](../../packages/protocol/src/vault/LiquidityManager.sol)
- **Inherits**: `AccessControl`, `ILiquidityManager`
- **Compiler Version**: `0.8.24`

---

## 🎯 1. Purpose

`LiquidityManager` manages operational and reserve liquidity accounting thresholds within `CustodyVault`.

---

## ⚙️ 2. Responsibilities

- Track operational liquidity targets (default 10% = 1,000 BPS) and refill thresholds (default 5% = 500 BPS).
- Track reserve excess sweep thresholds (default 15% = 1,500 BPS).
- Provide liquidity health indicators (`isOperationalLiquidityLow`, `isReserveLiquidityExcess`).

---

## 📑 3. Function Reference

- `setThresholds(address asset, uint256 targetBps, uint256 refillBps, uint256 excessBps)`: `onlyRole(GOVERNANCE_ROLE)`
- `syncModules()`: `onlyRole(GOVERNANCE_ROLE)` — syncs `custodyVault` pointer from `ProtocolDirectory`.
- `checkLiquidityHealth(address asset) → LiquidityHealth`: View returning operational and reserve status.

---

## 🧪 4. Testing References

- `packages/protocol/test/LiquidityManager.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
