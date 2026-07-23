# UnifyVault V2 Security Model

## Overview

UnifyVault V2 enforces defense-in-depth security principles across role-based access controls, reentrancy guards, emergency pause switches, oracle freshness validation, slippage enforcement, and state invariants.

---

## 1. Access Control Matrix

Role management is powered by OpenZeppelin `AccessControl`.

| Role                 | Identifier                     | Granted To               | Permissions                                                                     |
| :------------------- | :----------------------------- | :----------------------- | :------------------------------------------------------------------------------ |
| `DEFAULT_ADMIN_ROLE` | `0x00`                         | Deployer / Multisig      | Role administration                                                             |
| `GOVERNANCE_ROLE`    | `keccak256("GOVERNANCE_ROLE")` | Protocol Multisig        | System configuration, strategy updates, parameter changes, treasury withdrawals |
| `GUARDIAN_ROLE`      | `keccak256("GUARDIAN_ROLE")`   | Emergency Multisig / Bot | `emergencyPause()`, `pause()`                                                   |
| `CONTROLLER_ROLE`    | `keccak256("CONTROLLER_ROLE")` | `UnifyVaultController`   | Custody deposits/withdrawals, token minting/burning, fee collection             |

---

## 2. Emergency Pause Controls

- **Contracts Inheriting `Pausable`**: `UnifyVaultController`, `CustodyVault`, `Treasury`, `UVBTCETHToken`.
- **Trigger**: `GUARDIAN_ROLE` or `GOVERNANCE_ROLE` calling `emergencyPause()` or `pause()`.
- **Blocked Functions**: `deposit()`, `redeem()`, `collectFee()`, `withdraw()`, token transfers (when paused).
- **Unpause**: Strictly restricted to `GOVERNANCE_ROLE`.

---

## 3. Reentrancy Protection

- All state-changing functions in `UnifyVaultController`, `CustodyVault`, `Treasury`, and `SwapAdapter` inherit OpenZeppelin `ReentrancyGuard`.
- State updates follow the Check-Effects-Interactions (CEI) pattern.

---

## 4. Oracle Security & Assumptions

- **Primary Feed**: Chainlink Aggregator V3 feeds / Mock Oracle Providers.
- **Price Heartbeat**: Configured per asset (default: 3600s / 1 hour).
- **Freshness Check**:
  ```solidity
  if (block.timestamp - roundData.updatedAt > heartbeat) revert OraclePriceStale();
  ```
- **Validation**: Reverts on negative prices (`OraclePriceNegative`) or zero prices (`AssetNotSupportedByOracle`).

---

## 5. Swap & Slippage Protections

- **Slippage Enforcement**:
  - `deposit()` enforces `minSharesOut`.
  - `redeem()` enforces `minAssetsOut`.
- **Deadline Verification**: `redeem()` enforces `block.timestamp <= deadline`.
- **Zero Balance Invariant**: `UnifyVaultController` reverts if any residual asset balance remains on the Controller after swap execution.

---

## 6. Failure Handling & Incident Response

- **Swap Execution Reverts**: Entire deposit or redemption transaction reverts atomically.
- **Oracle Downtime**: System halts deposits/redemptions involving the affected asset until feed health recovers.
- **Emergency Halt**: Guardian activates pause state; governance assesses and resolves issues.
