---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# StrategyManager Contract Specification

- **File Path**: [`packages/protocol/src/strategy/StrategyManager.sol`](../../packages/protocol/src/strategy/StrategyManager.sol)
- **Inherits**: `AccessControl`, `IStrategyManager`
- **Compiler Version**: `0.8.24`

---

## 🎯 1. Purpose

`StrategyManager` governs the asset composition and target allocation weights for UnifyVault V2 portfolios.

---

## ⚙️ 2. Responsibilities

- Maintain the array of supported strategy tokens (cbBTC, WETH).
- Maintain target weights in Basis Points (BPS).
- Enforce the invariant that total target weights must sum exactly to 10,000 BPS (100.00%).

---

## 📑 3. Function Reference

#### `setStrategy(address[] assets, uint256[] weightsBps)`

Atomically configures the active strategy portfolio.

- **Access**: `onlyRole(GOVERNANCE_ROLE)`
- Validates array lengths match and total weights sum to 10,000 BPS.

#### `getTargetWeights() → (address[] assets, uint256[] weightsBps)`

Returns the list of active strategy tokens and target weights.

---

## 🧪 4. Testing References

- `packages/protocol/test/StrategyManager.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
