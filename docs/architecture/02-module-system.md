---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# ProtocolDirectory & Dynamic Module System

This document specifies the design, operation, and registry freeze mechanism of **[`ProtocolDirectory`](../../packages/protocol/src/ProtocolDirectory.sol)**, the canonical registry of UnifyVault V2.

---

## 📌 1. Overview & Purpose

`ProtocolDirectory` is the central address registry that maps standardized `bytes32` key identifiers to active deployed smart contract addresses.

By centralizing address resolution:

1. Protocol modules can dynamically resolve peer contract addresses at runtime without requiring hardcoded storage variables.
2. Individual protocol modules (e.g. `FeeManager`, `PortfolioManager`) can be upgraded by updating the directory entry, subject to governance RBAC.
3. The registry can be permanently locked using a one-way `freeze()` call once mainnet immutability is required.

---

## 🔑 2. Standardized Module Identifiers ([`ModuleIds.sol`](../../packages/protocol/src/constants/ModuleIds.sol))

All registry keys are deterministic `keccak256` hashes defined in `ModuleIds`:

| Constant Name       | Key String           | `bytes32` Keccak-256 Hash | Target Component                                       |
| :------------------ | :------------------- | :------------------------ | :----------------------------------------------------- |
| `ORACLE`            | `"OracleManager"`    | `0xb1b...`                | [`OracleManager`](../contracts/OracleManager.md)       |
| `VAULT`             | `"CustodyVault"`     | `0x3a4...`                | [`CustodyVault`](../contracts/CustodyVault.md)         |
| `TREASURY`          | `"Treasury"`         | `0x6d1...`                | [`Treasury`](../contracts/Treasury.md)                 |
| `TOKEN`             | `"IndexToken"`       | `0x9e8...`                | [`UVBTCETHToken`](../contracts/UVBTCETHToken.md)       |
| `GOVERNANCE`        | `"Governance"`       | `0x5f2...`                | Governance Multisig                                    |
| `RISK_ENGINE`       | `"RiskEngine"`       | `0x1c8...`                | Risk Module (Reserved)                                 |
| `STRATEGY_MANAGER`  | `"StrategyManager"`  | `0x7a2...`                | [`StrategyManager`](../contracts/StrategyManager.md)   |
| `PORTFOLIO_MANAGER` | `"PortfolioManager"` | `0x4e6...`                | [`PortfolioManager`](../contracts/PortfolioManager.md) |
| `SWAP_ADAPTER`      | `"SwapAdapter"`      | `0x8d3...`                | [`SwapAdapter`](../contracts/SwapAdapter.md)           |
| `LIQUIDITY_MANAGER` | `"LiquidityManager"` | `0x2b9...`                | [`LiquidityManager`](../contracts/LiquidityManager.md) |
| `FEE_MANAGER`       | `"FeeManager"`       | `0x0f4...`                | [`FeeManager`](../contracts/FeeManager.md)             |

---

## 🔒 3. Governance Control & Immutability Freeze

### Role-Based Access Control

- **`registerAddress(bytes32 id, address target)`**: Callable only by `GOVERNANCE_ROLE`. Reverts if `target == address(0)` or if `id` already exists.
- **`updateAddress(bytes32 id, address target)`**: Callable only by `GOVERNANCE_ROLE`. Reverts if `id` does not exist or target is identical.
- **`removeAddress(bytes32 id)`**: Callable only by `GOVERNANCE_ROLE`. Removes an existing mapping entry.

### Permanent Freeze Mechanism

```solidity
function freeze() external override onlyRole(AccessRoles.GOVERNANCE_ROLE) whenNotFrozen {
  _frozen = true;
  emit Events.RegistryFrozen(msg.sender);
}
```

When `_frozen == true`, all registration, update, and removal functions permanently revert with `Errors.RegistryIsFrozen()`.

---

## 🔗 Related Documents

- [`../contracts/ProtocolDirectory.md`](../contracts/ProtocolDirectory.md) — Contract Reference
- [`01-overview.md`](01-overview.md) — System Overview

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
