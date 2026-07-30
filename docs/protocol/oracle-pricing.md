---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Oracle Pricing Pipeline & Heartbeat Verification

This document details the pricing pipeline, price scaling, heartbeat staleness checks, and fallback mechanisms in **[`OracleManager`](../contracts/OracleManager.md)** and **[`ChainlinkOracleProvider`](../../packages/protocol/src/oracle/ChainlinkOracleProvider.sol)**.

---

## 🛰️ 1. Price Pipeline Architecture

```mermaid
graph TD
    Controller -->|getAssetPrice| OM[OracleManager]
    OM -->|isPriceFresh| OM
    OM -->|getLatestRound| Primary[Chainlink Primary Provider]
    Primary -->|AggregatorV3.latestRoundData| ChainlinkFeed[Chainlink Oracle Feed]
    OM -.->|Fallback if primary stale/fails| Fallback[Fallback Oracle Provider]
```

---

## ⏱️ 2. Heartbeat & Staleness Rules

1. **Staleness Bound Check**:
   $$\text{PriceAge} = \text{block.timestamp} - \text{updatedAt}$$
   If $\text{PriceAge} > \text{heartbeat}$ (default 3,600 seconds), `OracleManager.isPriceFresh()` returns `false`, and price fetches revert with `Errors.OraclePriceStale`.
2. **Negative/Zero Price Protection**:
   If $\text{price} \le 0$, execution reverts with `Errors.OraclePriceNegative`.
3. **Decimal Normalization**:
   Chainlink prices (typically 8 decimals for USD feeds) are scaled up to 18 decimals ($10^{18}$).

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
