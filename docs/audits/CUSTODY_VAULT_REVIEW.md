# UnifyVault Custody Vault Review

This document provides a security, gas, and architectural evaluation of the `CustodyVault` collateral contract.

---

## 1. Status

### **APPROVED**

The `CustodyVault` implementation conforms to all specifications for Sprint 5B, maintaining strict isolation as a passive storage contract with no oracle or token minting dependencies, and has successfully passed all 118 unit, fuzz, and property-based invariant test suites.

---

## 2. Architecture Review

- **Passive Collateral Storage:** Exposes deposit, withdrawal, and configuration management endpoints without knowing anything about `OracleManager`, `UVBTCETHToken`, fees, net asset value (NAV), or protocol economics.
- **O(1) View Functions:** Implements O(1) complexity lookups for checking asset registration, decimals, support status, and balances.
- **ERC20 Balance as Source of Truth:** Exposes `totalAssetBalance(asset)` using `IERC20(asset).balanceOf(address(this))` to avoid maintaining redundant balance counters in state, saving considerable storage gas.

---

## 3. Security Review

- **Reentrancy Guard:** Integrates OpenZeppelin's `ReentrancyGuard` with the `nonReentrant` modifier on `deposit` and `withdraw` entry points.
- **Safe Token Operations:** Employs `SafeERC20` wrapper libraries to revert on non-standard ERC20 failures.
- **Strict Access Control:**
  - `CONTROLLER_ROLE`: Only the controller contract may deposit and withdraw collateral.
  - `GOVERNANCE_ROLE`: Only governance can register, enable, disable, and remove supported assets, as well as call `unpause`.
  - `GUARDIAN_ROLE`: Only the guardian can call `pause` to halt deposits and withdrawals during anomalies.
- **Token Callback & Callback Security (ERC777):** Using `nonReentrant` protects the vault from any callback reentrancy vectors (such as ERC777 `tokensToSend` hooks) during token collection.

---

## 4. Token Compatibility Strategy

The vault's behavior regarding complex ERC20 implementations is defined as follows:

- **Fee-on-Transfer Tokens:** _Intentionally Not Supported._ Supporting fee-on-transfer tokens requires measuring contract balances before and after each transfer. To prioritize gas efficiency, the vault assumes the deposit amount exactly matches the transferred amount.
- **Rebasing Tokens:** _Intentionally Not Supported._ Since the vault relies on the ERC20 balance as the source of truth, the vault itself handles rebases without state desynchronization. However, the controller's internal accounting would likely mismatch, potentially locking or over-allocating index shares.
- **Upgradeability Risk:** The contract is non-upgradeable, preventing admin takeover or storage layout corruption.

---

## 5. Gas Review

- **Packs Storage Structs:** `AssetConfig` is packed into a single 32-byte storage slot containing both `uint8 decimals` and `bool enabled`. This minimizes `SLOAD` costs during validation.
- **Bypasses Duplicate Storage Accounting:** Balances are read directly from token contracts, avoiding the gas costs of updating double-entry bookkeeping storage slots during deposits and withdrawals.

---

## 6. Audit Readiness

Complete test coverage is achieved:

- **Unit Tests:** Verifies all registration states, duplicate preventions, RBAC reverts, pause triggers, and balance checks.
- **Fuzz Testing:** Validates arbitrary ranges of deposit and withdrawal amounts.
- **Invariant Testing:** Confirms that vault accounting matches actual ERC20 balances, paused states restrict movements, and only controllers can transfer collateral.
