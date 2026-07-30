---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# CustodyVault Contract Specification

- **File Path**: [`packages/protocol/src/vault/CustodyVault.sol`](../../packages/protocol/src/vault/CustodyVault.sol)
- **Inherits**: `AccessControl`, `ReentrancyGuard`, `Pausable`
- **Compiler Version**: `0.8.24`

---

## 🎯 1. Purpose

`CustodyVault` is a passive collateral custody vault for the UnifyVault Protocol. It safeguards strategy assets (USDC, cbBTC, WETH) without containing business logic, fee parameters, or token minting/burning capabilities.

---

## ⚙️ 2. Responsibilities

- Hold physical custody of underlying ERC20 strategy assets.
- Restrict asset deposits and withdrawals exclusively to authorized callers (`CONTROLLER_ROLE`).
- Maintain internal accounting of asset balances (`_accountedAssets`) to protect against donation attacks.
- Support asset registration, enablement, disablement, and emergency pause controls.

---

## 🏗️ 3. Constructor

```solidity
constructor()
```

- Grants `DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, `GUARDIAN_ROLE`, and `CONTROLLER_ROLE` to `msg.sender`.

---

## 💾 4. State Variables & Storage

| Name               | Type                              | Visibility | Description                                                  |
| :----------------- | :-------------------------------- | :--------- | :----------------------------------------------------------- |
| `_assets`          | `mapping(address => AssetConfig)` | `private`  | Configuration mapping (decimals, enabled) per asset.         |
| `_accountedAssets` | `mapping(address => uint256)`     | `private`  | Internal accounting ledger tracking expected asset balances. |

---

## 🛡️ 5. Access Roles

- `DEFAULT_ADMIN_ROLE`: Role management.
- `GOVERNANCE_ROLE`: Asset registration, enablement, disablement, removal.
- `GUARDIAN_ROLE`: Emergency pause capability (`pause`).
- `CONTROLLER_ROLE`: Access to `deposit` and `withdraw` functions.

---

## 📑 6. Function Reference

### Controller Execution Functions

#### `deposit(address asset, address from, uint256 amount)`

Custodies deposit from Controller.

- **Access**: `onlyRole(CONTROLLER_ROLE)`, `nonReentrant`, `whenNotPaused`
- Transfers `amount` of `asset` from `from` to `CustodyVault`.
- Updates `_accountedAssets[asset] += amount`.
- Emits `DepositExecuted(asset, from, amount, msg.sender)`.

#### `withdraw(address asset, address to, uint256 amount)`

Releases custody assets to Controller/recipient.

- **Access**: `onlyRole(CONTROLLER_ROLE)`, `nonReentrant`, `whenNotPaused`
- Validates `_accountedAssets[asset] >= amount`.
- Updates `_accountedAssets[asset] -= amount`.
- Transfers `amount` of `asset` to `to`.
- Emits `WithdrawalExecuted(asset, to, amount, msg.sender)`.

### Administrative & View Functions

- `registerAsset(address asset, uint8 decimals)`: `onlyRole(GOVERNANCE_ROLE)`
- `enableAsset(address asset)`: `onlyRole(GOVERNANCE_ROLE)`
- `disableAsset(address asset)`: `onlyRole(GOVERNANCE_ROLE)`
- `removeAsset(address asset)`: `onlyRole(GOVERNANCE_ROLE)`
- `totalAssets(address asset) → uint256`: Returns internal accounting balance (`_accountedAssets[asset]`).
- `assetConfig(address asset) → AssetConfig`: Returns asset decimal and enabled status.
- `isSupported(address asset) → bool`: Returns whether asset is enabled.

---

## 🔒 7. Security Model

- **Donation Attack Resilience**: The vault tracks balances via `_accountedAssets` rather than relying on `IERC20.balanceOf(address(this))`. Direct un-accounted token transfers do not inflate share valuations or NAV.
- **Strict Role Isolation**: Only contracts holding `CONTROLLER_ROLE` can invoke `deposit` or `withdraw`.

---

## 🧪 8. Testing References

- `packages/protocol/test/unit/CustodyVault.t.sol`
- `packages/protocol/test/CustodyVaultInvariant.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
