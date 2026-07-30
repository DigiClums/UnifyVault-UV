---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Incident Response & Emergency Procedures

This document provides operational instructions for handling security incidents, oracle failures, or market anomalies.

---

## 🚨 1. Emergency Response Playbook

### Step 1: Immediate Panic Pause (`GUARDIAN_ROLE`)

Upon detecting an active exploit, oracle anomaly, or contract failure:

1. Execute `UnifyVaultController.emergencyPause()`.
2. Execute `CustodyVault.pause()`.
3. Execute `Treasury.pause()`.
4. Execute `UVBTCETHToken.pause()`.

> [!IMPORTANT]
> `GUARDIAN_ROLE` can pause the contracts immediately in a single transaction without timelock delays.

### Step 2: Investigation & Triage

1. Identify affected component via on-chain event logs and indexer daemon outputs.
2. Verify solvency of `CustodyVault` assets.

### Step 3: Governance Remediation & Resume (`GOVERNANCE_ROLE`)

1. Deploy required patch or update directory pointer via `ProtocolDirectory.updateAddress()`.
2. Execute `UnifyVaultController.resume()` via Governance Multisig once safety is verified.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
