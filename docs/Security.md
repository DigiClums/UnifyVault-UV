# Security & Risk Specification

This document details the security model, risk assumptions, access control guarantees, emergency procedures, and architectural invariants of UnifyVault V2.

---

## 1. Access Control Model

Access control across all protocol contracts is implemented using OpenZeppelin `AccessControl`.

### Security Guarantees
- **Strict Role Isolation**: Functions restricted to `CONTROLLER_ROLE` (such as `UVBTCETHToken.mint` and `CustodyVault.withdrawAsset`) cannot be called by arbitrary users or administrative roles without explicit grant.
- **Zero Address Validation**: All constructor and setter arguments check against `address(0)` via `AddressValidationLib.validateNonZeroAddress`.
- **Contract Code Validation**: Module setters check `address.code.length > 0` to prevent non-contract account registration.

---

## 2. Emergency Controls & Pausable Logic

Contracts subject to operational risk (`UnifyVaultController`, `CustodyVault`, `Treasury`) inherit OpenZeppelin `Pausable`.

### 2.1 Emergency Circuit Breakers
- **Pause Trigger**: Accounts possessing the `GUARDIAN_ROLE` or `GOVERNANCE_ROLE` can invoke `pause()` to halt deposits, redemptions, and rebalances immediately upon detecting suspicious activity.
- **Resume Trigger**: `unpause()` can be invoked by `GUARDIAN_ROLE` or `GOVERNANCE_ROLE` to resume normal protocol operations.

### 2.2 Pausable Function Matrix

| Contract | Function | Paused Behavior |
| :--- | :--- | :--- |
| `UnifyVaultController` | `deposit` | Reverts with `EnforcedPause()` |
| `UnifyVaultController` | `redeem` | Reverts with `EnforcedPause()` |
| `UnifyVaultController` | `rebalancePortfolio` | Reverts with `EnforcedPause()` |
| `CustodyVault` | `depositAsset` | Reverts with `EnforcedPause()` |
| `CustodyVault` | `withdrawAsset` | Reverts with `EnforcedPause()` |

---

## 3. Threat Model & Risk Assumptions

### 3.1 External Dependency Risks
- **Chainlink Oracle Dependency**: `ChainlinkOracleProvider` queries external Chainlink price aggregators. To mitigate oracle manipulation and stale pricing, `OracleManager` enforces heartbeat window validation (`block.timestamp - updatedAt <= heartbeat`), non-zero price checks, and supports secondary fallback oracle providers.
- **DEX Router & Slippage Risks**: Asset swaps executed by `SwapAdapter` interact with external DEX liquidity pools. To prevent sandwich attacks and front-running, swaps calculate minimum acceptable output amounts using oracle valuation adjusted by `swapSlippageBps` (default: `100` BPS = `1%`).

### 3.2 Inflation Attack & Donation Immunity
- **Attack Vector**: In first-deposit ERC4626 vault implementations, an attacker can donate collateral directly to the vault to inflate share prices and cause division-by-zero rounding loss for subsequent depositors.
- **UnifyVault Mitigation**:
  1. `CustodyVault` maintains internal accounting (`_internalBalances[asset]`) that only increments on explicit `depositAsset` calls. Direct token transfers increment `surplusAssets` but do not affect vault net asset value calculations.
  2. First deposit explicitly mints and permanently locks `DEAD_SHARES` (`1000` wei) to prevent share pricing manipulation.

### 3.3 Reentrancy Safeguards
- All state-changing methods interacting with external ERC20 tokens use OpenZeppelin `ReentrancyGuard` (`nonReentrant` modifier) and OpenZeppelin `SafeERC20` transfer utilities.

---

## 4. Upgradeability Assumptions

- **Immutable Core Contracts**: Core contracts (`UnifyVaultController`, `CustodyVault`, `Treasury`) are **non-upgradeable proxy-free contracts**.
- **Dynamic Module Replacement**: Upgrades are achieved via proxy-less modular replacement: deploying a new module contract and updating its target address in `ProtocolDirectory`.
- **One-Way Registry Freeze**: `ProtocolDirectory` can be permanently frozen via `freeze()`, revoking the ability to update module addresses forever.
