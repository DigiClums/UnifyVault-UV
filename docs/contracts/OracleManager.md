---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# OracleManager Contract Specification

- **File Path**: [`packages/protocol/src/oracle/OracleManager.sol`](../../packages/protocol/src/oracle/OracleManager.sol)
- **Inherits**: `AccessControl`, `IOracle`
- **Compiler Version**: `>=0.8.20`

---

## 🎯 1. Purpose

`OracleManager` is the canonical pricing coordinator for UnifyVault V2. It normalizes prices to 18 decimals, validates price freshness against heartbeats, and routes calls between primary and fallback oracle providers.

---

## ⚙️ 2. Key Responsibilities

- Map asset addresses to primary and fallback `IOracleProvider` adapters.
- Validate price staleness: `block.timestamp - roundTimestamp <= heartbeat`.
- Normalize asset prices to 18 decimals (`1e18`).
- Fallback to secondary provider if primary feed fails or reports stale price.

---

## 📑 3. Function Reference

- `getAssetPrice(address asset) → uint256`: Returns normalized 18-decimal price. Reverts if price is negative/zero or stale.
- `isPriceFresh(address asset) → bool`: Returns true if feed price timestamp is within heartbeat limit.
- `setAssetConfig(bytes32 assetId, address primaryProvider, address fallbackProvider, uint32 heartbeat, bool enabled)`: `onlyRole(GOVERNANCE_ROLE)`.

---

## 🧪 4. Testing References

- `packages/protocol/test/OracleManager.t.sol`
- `packages/protocol/test/ChainlinkOracleProvider.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
