---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Off-Chain Keeper Bots & Indexer Daemons

This document details the operational setup and execution procedures for off-chain keeper scripts and indexer daemons ([`scripts/`](../../scripts)).

---

## 🤖 1. Off-Chain Scripts Catalog

### 1. Oracle Keeper Bot ([`scripts/oracleKeeper.js`](../../scripts/oracleKeeper.js))

Node.js service using ethers.js that monitors Chainlink price feed timestamps against configured heartbeat bounds (3,600s). If a price feed approaches staleness, the keeper triggers feed updates.

### 2. Indexer Daemon ([`scripts/indexerDaemon.js`](../../scripts/indexerDaemon.js))

Event listener process monitoring `DepositExecuted`, `RedeemExecuted`, `FeeCollected`, and `ProtocolPaused` events on-chain. Writes transaction history and NAV logs to database storage.

### 3. Container Management Script ([`scripts/manage-containers.sh`](../../scripts/manage-containers.sh))

Control shell script to launch, stop, status-check, or purge local development containers:

```bash
./scripts/manage-containers.sh start
./scripts/manage-containers.sh status
```

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
