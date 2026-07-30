---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# FeeManager Contract Specification

- **File Path**: [`packages/protocol/src/treasury/FeeManager.sol`](../../packages/protocol/src/treasury/FeeManager.sol)
- **Inherits**: `AccessControl`, `IFeeManager`
- **Compiler Version**: `0.8.24`

---

## 🎯 1. Purpose

`FeeManager` is the centralized registry for protocol deposit, redemption, and performance fee parameters and safety caps.

---

## ⚙️ 2. Fee Parameters & Hardcoded Safety Caps

| Fee Type           |  Default Value  | Max Safety Cap  | Setter Function             |
| :----------------- | :-------------: | :-------------: | :-------------------------- |
| **Deposit Fee**    | 25 BPS (0.25%)  | 500 BPS (5.00%) | `setDepositFeeBps(uint256)` |
| **Redemption Fee** | 200 BPS (2.00%) | 500 BPS (5.00%) | `setRedeemFeeBps(uint256)`  |

---

## 📑 3. Function Reference

- `setDepositFeeBps(uint256 newFeeBps)`: `onlyRole(GOVERNANCE_ROLE)`
- `setRedeemFeeBps(uint256 newFeeBps)`: `onlyRole(GOVERNANCE_ROLE)`
- `setTreasury(address newTreasury)`: `onlyRole(GOVERNANCE_ROLE)`

---

## 🧪 4. Testing References

- `packages/protocol/test/FeeManager.t.sol`
- `packages/protocol/test/FeeManagerIntegration.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
