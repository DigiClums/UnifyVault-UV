---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Protocol Custom Errors Catalog

This document lists all custom Solidity error declarations across the UnifyVault V2 codebase ([`packages/protocol/src/errors/Errors.sol`](../../packages/protocol/src/errors/Errors.sol)).

---

## 📋 Custom Errors Catalog

| Error Name                     | Parameters                                           | Contract Origin                | Cause / Trigger Condition                                                                          |
| :----------------------------- | :--------------------------------------------------- | :----------------------------- | :------------------------------------------------------------------------------------------------- |
| `ProtocolPaused()`             | None                                                 | `Errors.sol`                   | Reverted when attempting an operation while the circuit breaker is paused.                         |
| `SlippageLimitExceeded`        | `(uint256 expected, uint256 actual)`                 | `Errors.sol` / `Controller`    | Reverted when shares minted or assets returned are less than user `minSharesOut` / `minAssetsOut`. |
| `InvalidCollateralToken`       | `(address token)`                                    | `Errors.sol`                   | Reverted when an unsupported collateral asset is submitted.                                        |
| `MathCalculationOverflow`      | None                                                 | `Errors.sol`                   | Reverted when zero amount or overflow condition is detected.                                       |
| `UnauthorizedControllerCaller` | `(address caller)`                                   | `Errors.sol`                   | Reverted when a non-controller address calls a controller-restricted function.                     |
| `InsufficientReserves`         | `(address asset, uint256 requested, uint256 actual)` | `Errors.sol` / `Controller`    | Reverted when zero-controller-balance invariant fails or custody vault has insufficient funds.     |
| `TransferExecutionFailed`      | `(address asset, address recipient, uint256 amount)` | `Errors.sol`                   | Reverted when low-level ERC20 transfer fails.                                                      |
| `OraclePriceStale`             | `(address asset, uint256 priceAge, uint256 limit)`   | `Errors.sol` / `OracleManager` | Reverted when oracle feed price age exceeds heartbeat limit.                                       |
| `OraclePriceNegative`          | `(address asset, int256 price)`                      | `Errors.sol` / `OracleManager` | Reverted when oracle feed returns non-positive price.                                              |
| `HeartbeatIntervalOutofBounds` | None                                                 | `Errors.sol`                   | Reverted when invalid heartbeat interval is set.                                                   |
| `IndexTokenNotSupported`       | `(address index)`                                    | `Errors.sol`                   | Reverted when index token is not supported.                                                        |
| `ZeroAddressDetected()`        | None                                                 | `Errors.sol`                   | Reverted when zero address `address(0)` is passed to a constructor or function.                    |
| `EntryAlreadyExists`           | `(bytes32 id)`                                       | `Errors.sol` / `Directory`     | Reverted when attempting to register an already registered module ID.                              |
| `EntryDoesNotExist`            | `(bytes32 id)`                                       | `Errors.sol` / `Directory`     | Reverted when resolving an unregistered module ID.                                                 |
| `RegistryIsFrozen()`           | None                                                 | `Errors.sol` / `Directory`     | Reverted when attempting directory updates after `freeze()`.                                       |
| `IdenticalAddressSubmitted()`  | None                                                 | `Errors.sol` / `Directory`     | Reverted when updating a directory address to its existing value.                                  |
| `DeadlineExpired`              | `(uint256 deadline, uint256 timestamp)`              | `Errors.sol` / `Controller`    | Reverted when transaction execution timestamp exceeds user-submitted deadline.                     |
| `AssetNotSupported`            | `(bytes32 assetId)`                                  | `Errors.sol`                   | Reverted when oracle or vault does not support specified asset ID.                                 |
| `FeeExceedsMaxCap`             | `(uint256 feeBps, uint256 maxCap)`                   | `FeeManager.sol`               | Reverted when fee parameter exceeds maximum safety cap.                                            |
| `NotAContract`                 | `(address target)`                                   | `Controller`                   | Reverted when constructor target has zero code length.                                             |

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
