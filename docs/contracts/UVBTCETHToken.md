---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# UVBTCETHToken Contract Specification

- **File Path**: [`packages/protocol/src/token/UVBTCETHToken.sol`](../../packages/protocol/src/token/UVBTCETHToken.sol)
- **Inherits**: `ERC20`, `ERC20Permit`, `AccessControl`, `Pausable`, `IToken`
- **Compiler Version**: `0.8.24`

---

## 🎯 1. Purpose

`UVBTCETHToken` (`UVBTCETH`) is the ERC20 index share token representing proportional ownership of UnifyVault's BTC-ETH strategy portfolio (60% cbBTC / 40% WETH).

---

## ⚙️ 2. Responsibilities

- Standard ERC20 token transfer, allowance, and approval functionality.
- Gasless approvals via EIP-2612 `permit`.
- Restricted `mint` and `burn` methods executable solely by `CONTROLLER_ROLE`.
- Emergency pause controls for transfers.

---

## 🏗️ 3. Constructor

```solidity
constructor() ERC20("UnifyVault BTC ETH Index", "UVBTCETH") ERC20Permit("UnifyVault BTC ETH Index")
```

- Grants `DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, `GUARDIAN_ROLE`, and `CONTROLLER_ROLE` to `msg.sender`.

---

## 📑 4. Function Reference

#### `mint(address to, uint256 amount)`

Mints new `UVBTCETH` index shares to a recipient.

- **Access**: `onlyRole(CONTROLLER_ROLE)`
- Validates `to != address(0)` and `amount > 0`.

#### `burn(address from, uint256 amount)`

Burns existing `UVBTCETH` index shares from an account.

- **Access**: `onlyRole(CONTROLLER_ROLE)`
- Validates `from != address(0)` and `amount > 0`.

---

## 🧪 5. Testing References

- `packages/protocol/test/unit/UVBTCETHToken.t.sol`
- `packages/protocol/test/UVBTCETHTokenInvariant.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
