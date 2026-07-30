---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Role-Based Access Control (RBAC) Matrix

This document defines the Role-Based Access Control matrix across all UnifyVault V2 contracts, based on [`AccessRoles.sol`](../../packages/protocol/src/libraries/AccessRoles.sol).

---

## 🔑 1. Role Definitions & Hashes

| Role Identifier        | Keccak-256 Hash                                                      | Target Signer / Entity    | Purpose                                                                      |
| :--------------------- | :------------------------------------------------------------------- | :------------------------ | :--------------------------------------------------------------------------- |
| `DEFAULT_ADMIN_ROLE`   | `0x0000000000000000000000000000000000000000000000000000000000000000` | Security Admin / Timelock | AccessControl role administration.                                           |
| `GOVERNANCE_ROLE`      | `keccak256("GOVERNANCE_ROLE")`                                       | Governance Multisig       | Protocol parameter updates, fee settings, registry configuration, unpausing. |
| `GUARDIAN_ROLE`        | `keccak256("GUARDIAN_ROLE")`                                         | Emergency Multisig / Bot  | Rapid circuit breaker pause (`emergencyPause`).                              |
| `CONTROLLER_ROLE`      | `keccak256("CONTROLLER_ROLE")`                                       | `UnifyVaultController`    | Inter-contract deposit, withdrawal, fee collection, share minting/burning.   |
| `BOT_ROLE`             | `keccak256("BOT_ROLE")`                                              | Keeper Bot / Node         | Automated maintenance tasks and keeper scripts.                              |
| `ORACLE_OPERATOR_ROLE` | `keccak256("ORACLE_OPERATOR_ROLE")`                                  | Oracle Keeper Bot         | Price feed updates and oracle configuration maintenance.                     |

---

## 📊 2. Contract Permission Matrix

| Contract                   | `DEFAULT_ADMIN` |       `GOVERNANCE`       |   `GUARDIAN`    |    `CONTROLLER`    |  `BOT`   |
| :------------------------- | :-------------: | :----------------------: | :-------------: | :----------------: | :------: |
| **`ProtocolDirectory`**    |      Admin      | Register, Update, Freeze |        —        |         —          |    —     |
| **`UnifyVaultController`** |      Admin      |   Parameters, Unpause    | Emergency Pause |     Core Exec      | Bot Exec |
| **`CustodyVault`**         |      Admin      |       Asset Config       |      Pause      | Deposit / Withdraw |    —     |
| **`Treasury`**             |      Admin      |         Withdraw         |      Pause      |    Collect Fee     |    —     |
| **`UVBTCETHToken`**        |      Admin      |          Config          |      Pause      |    Mint / Burn     |    —     |

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
