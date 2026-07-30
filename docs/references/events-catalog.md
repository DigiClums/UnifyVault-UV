---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Protocol Events Catalog

This document catalogues all event declarations emitted by UnifyVault V2 contracts ([`packages/protocol/src/events/Events.sol`](../../packages/protocol/src/events/Events.sol)).

---

## 🔔 Custom Events Catalog

| Event Signature                                                                                                                                                     | Emitting Contract   | Description                                            |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------ | :----------------------------------------------------- |
| `MintExecuted(address indexed investor, uint256 collateralDeposited, uint256 indexTokensMinted, uint256 mintFeeCollected)`                                          | Shared              | Emitted when index shares are minted.                  |
| `BurnExecuted(address indexed investor, uint256 indexTokensBurned, uint256 collateralReturned, uint256 burnFeeCollected)`                                           | Shared              | Emitted when index shares are burned.                  |
| `DepositExecuted(address indexed user, uint256 depositAmount, uint256 fee, address[] targetAssets, uint256[] assetsBought, uint256 sharesMinted, uint256 navAfter)` | `Controller`        | Emitted when live deposit flow completes.              |
| `RedeemExecuted(address indexed user, uint256 sharesBurned, address[] targetAssets, uint256[] assetsSold, uint256 fee, uint256 usdcReturned, uint256 navAfter)`     | `Controller`        | Emitted when live redemption flow completes.           |
| `AddressRegistered(bytes32 indexed id, address indexed target, address indexed caller)`                                                                             | `ProtocolDirectory` | Emitted when a module address is registered.           |
| `AddressUpdated(bytes32 indexed id, address indexed oldTarget, address newTarget, address indexed caller)`                                                          | `ProtocolDirectory` | Emitted when a module address is updated.              |
| `AddressRemoved(bytes32 indexed id, address indexed oldTarget, address indexed caller)`                                                                             | `ProtocolDirectory` | Emitted when a module address is removed.              |
| `RegistryFrozen(address indexed caller)`                                                                                                                            | `ProtocolDirectory` | Emitted when the directory is permanently frozen.      |
| `ProtocolPaused(address indexed actor, string reason)`                                                                                                              | Core Contracts      | Emitted when emergency pause circuit breaker triggers. |
| `ProtocolUnpaused(address indexed actor)`                                                                                                                           | Core Contracts      | Emitted when protocol is resumed.                      |

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
