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

| Role Identifier        | Keccak-256 Hash                                                      | Target Signer / Entity                    | Purpose                                                                      |
| :--------------------- | :------------------------------------------------------------------- | :---------------------------------------- | :--------------------------------------------------------------------------- |
| `DEFAULT_ADMIN_ROLE`   | `0x0000000000000000000000000000000000000000000000000000000000000000` | SafePal Hardware Wallet (`0xd905...96DA`) | AccessControl role administration.                                           |
| `GOVERNANCE_ROLE`      | `keccak256("GOVERNANCE_ROLE")`                                       | SafePal Hardware Wallet (`0xd905...96DA`) | Protocol parameter updates, fee settings, registry configuration, unpausing. |
| `GUARDIAN_ROLE`        | `keccak256("GUARDIAN_ROLE")`                                         | SafePal Hardware Wallet (`0xd905...96DA`) | Rapid circuit breaker pause (`emergencyPause`).                              |
| `CONTROLLER_ROLE`      | `keccak256("CONTROLLER_ROLE")`                                       | `UnifyVaultController`                    | Inter-contract deposit, withdrawal, fee collection, share minting/burning.   |
| `BOT_ROLE`             | `keccak256("BOT_ROLE")`                                              | Keeper Bot / Node                         | Automated maintenance tasks and keeper scripts.                              |
| `ORACLE_OPERATOR_ROLE` | `keccak256("ORACLE_OPERATOR_ROLE")`                                  | Oracle Keeper Bot                         | Price feed updates and oracle configuration maintenance.                     |

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

## 🚀 3. Governance Migration

- **Migration Status**: `COMPLETED`
- **Migration Date**: `2026-07-31`
- **Previous Admin**: `0xB145AC2a59575Fbe306a58Ac924718f4DD4659Da`
- **Current Admin**: `0xd905920c91853039060246Ed5724AA72B91a96DA` (SafePal Hardware Wallet)
- **Migration Method**:
  - Granted `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE` to SafePal hardware wallet (`0xd905920c91853039060246Ed5724AA72B91a96DA`).
  - Verified admin role on all protocol contracts.
  - Old admin executed `renounceRole(DEFAULT_ADMIN_ROLE)`.
  - Governance successfully transferred.

---

## 🔒 4. Security Notes

- The SafePal hardware wallet (`0xd905920c91853039060246Ed5724AA72B91a96DA`) is now the sole governance administrator.
- The previous hot wallet (`0xB145AC2a59575Fbe306a58Ac924718f4DD4659Da`) no longer possesses `DEFAULT_ADMIN_ROLE`.
- All future governance, treasury, emergency pause, upgrades, and administrative actions must be executed exclusively from the SafePal hardware wallet.
- The previous admin wallet must never be reused for privileged protocol operations.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code, Foundry test suites (`GovernanceMigrationTest`)
- **Related Contracts**: [UnifyVaultController](../contracts/UnifyVaultController.md), [ProtocolDirectory](../contracts/ProtocolDirectory.md)
- **Last Reviewed**: 2026-07-31
