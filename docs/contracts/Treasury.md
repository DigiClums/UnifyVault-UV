---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Treasury Contract Specification

- **File Path**: [`packages/protocol/src/vault/Treasury.sol`](../../packages/protocol/src/vault/Treasury.sol)
- **Inherits**: `AccessControl`, `ReentrancyGuard`, `Pausable`
- **Compiler Version**: `0.8.24`

---

## 🎯 1. Purpose

`Treasury` is a dedicated vault for safeguarding protocol fee revenue (deposit fees, redemption fees, performance fees) and native ETH. It is completely isolated from user collateral held in `CustodyVault`.

---

## ⚙️ 2. Responsibilities

- Receive and custody ERC20 protocol fees collected during deposit and redemption operations.
- Receive and custody native ETH via `receive()`.
- Restrict fee collection permissions to `CONTROLLER_ROLE`.
- Restrict treasury withdrawals exclusively to `GOVERNANCE_ROLE`.

---

## 🏗️ 3. Constructor

```solidity
constructor()
```

- Grants `DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, `GUARDIAN_ROLE`, and `CONTROLLER_ROLE` to `msg.sender`.

---

## 💾 4. State Variables & Storage

| Name      | Type                              | Visibility | Description                                       |
| :-------- | :-------------------------------- | :--------- | :------------------------------------------------ |
| `_assets` | `mapping(address => AssetConfig)` | `private`  | Config mapping for supported treasury fee assets. |

---

## 📑 5. Function Reference

#### `collectFee(address asset, uint256 amount)`

Receives fee tokens from Controller or payer.

- **Access**: `onlyRole(CONTROLLER_ROLE)`, `nonReentrant`, `whenNotPaused`
- Transfers `amount` of `asset` to `Treasury`.
- Emits `FeeCollected(asset, msg.sender, amount)`.

#### `withdraw(address asset, address recipient, uint256 amount)`

Withdraws collected fee tokens to a designated recipient.

- **Access**: `onlyRole(GOVERNANCE_ROLE)`, `nonReentrant`
- Validates `recipient != address(0)` and sufficient balance.
- Transfers `amount` of `asset` to `recipient`.
- Emits `TreasuryWithdrawal(asset, recipient, amount, msg.sender)`.

#### `withdrawNative(address recipient, uint256 amount)`

Withdraws native ETH balance to recipient.

- **Access**: `onlyRole(GOVERNANCE_ROLE)`, `nonReentrant`
- Emits `NativeWithdrawn(recipient, amount, msg.sender)`.

---

## 🧪 6. Testing References

- `packages/protocol/test/unit/Treasury.t.sol`
- `packages/protocol/test/TreasuryInvariant.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
