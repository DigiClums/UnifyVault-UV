# UnifyVault Solidity Coding Standards

This document establishes the official coding standards, formatting guidelines, gas optimization rules, and security checks for the UnifyVault Protocol smart contracts.

---

## 1. Naming Conventions

- **Contracts & Interfaces:** PascalCase (e.g. `UnifyVaultController`, `IVault`). Interfaces must be prefixed with `I`.
- **Functions & Variables:** camelCase (e.g. `getAssetPrice`, `mintFeeBps`).
- **Constants:** UPPER_CASE_WITH_UNDERSCORES (e.g. `BASIS_POINTS_DIVISOR`).
- **Internal & Private Variables:** prefixed with a single underscore (e.g. `_isPaused`, `_supportedCollateral`).
- **Events & Errors:** PascalCase (e.g. `MintExecuted`, `ProtocolPaused`).

---

## 2. File Organization

Order of declarations in each Solidity file:

1.  License identifier (`// SPDX-License-Identifier: MIT`)
2.  Pragma version directive (`pragma solidity 0.8.20;`)
3.  Import statements (grouped: external first, then local files)
4.  Interfaces / Libraries / Types
5.  Contract declaration:
    - State variables (constants, public, private)
    - Events & Errors
    - Modifiers
    - Constructor / Initializers
    - External functions
    - Public functions
    - Internal functions
    - Private functions

---

## 3. Storage Layout & Proxy Gaps

- **ERC-7201 Namespaced Storage:** All upgradeable state variables must reside inside namespaces to prevent storage slot overlaps during proxy upgrades.
- **Storage Gaps:** For any storage contract that may be inherited, declare a gap array at the end of the storage layout to reserve space:
  ```solidity
  uint256[50] __gap;
  ```

---

## 4. Gas Optimizations

- **Custom Errors:** Always use custom errors (`revert Errors.ProtocolPaused()`) instead of require strings (`require(!paused, "Paused")`).
- **Calldata Parameter Types:** Use `calldata` instead of `memory` for read-only array and struct input parameters in external functions.
- **Cache State Variables:** Cache state variables in local stack variables if read multiple times within a single function execution loop.
- **Avoid State Loops:** Never write state variables inside loops. Accumulate totals in memory variables and perform a single write at the end.

---

## 5. Security & Checks-Effects-Interactions (CEI)

- **Checks-Effects-Interactions:** Always validate inputs (`Checks`), update local states (`Effects`), and perform external calls/transfers (`Interactions`) in this exact order.
- **Reentrancy Guards:** Protect state-changing external functions (such as deposit/withdraw) using `nonReentrant` locks.
- **Safe Token Wrappers:** Always use OpenZeppelin's `SafeERC20` wrapper library for token transfers (`safeTransfer`, `safeTransferFrom`, `safeApprove`).
