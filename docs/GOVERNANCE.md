# UnifyVault V2 — Governance Architecture & Operations Guide

This document details the governance architecture, role permissions, and administrative procedures for **UnifyVault V2**.

---

## 🏛️ 1. Governance Architecture

All administrative, parameter, and emergency control functions across UnifyVault V2 smart contracts are governed by the **SafePal Hardware Wallet**:

- **Permanent Protocol Administrator (SafePal Hardware Wallet)**: `0xd905920c91853039060246Ed5724AA72B91a96DA`
- **Previous Admin Wallet**: `0xB145AC2a59575Fbe306a58Ac924718f4DD4659Da`

---

## 🔄 2. Governance Migration

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

## 🔒 3. Security Notes

- The SafePal hardware wallet (`0xd905920c91853039060246Ed5724AA72B91a96DA`) is now the sole governance administrator.
- The previous hot wallet (`0xB145AC2a59575Fbe306a58Ac924718f4DD4659Da`) no longer possesses `DEFAULT_ADMIN_ROLE`.
- All future governance, treasury, emergency pause, upgrades, and administrative actions must be executed exclusively from the SafePal hardware wallet.
- The previous admin wallet must never be reused for privileged protocol operations.

---

## 🔑 4. Administrative Role Assignments

| Role Name            | Keccak-256 Hash                                                      | Authorized Holder                         | Purpose                          |
| :------------------- | :------------------------------------------------------------------- | :---------------------------------------- | :------------------------------- |
| `DEFAULT_ADMIN_ROLE` | `0x0000000000000000000000000000000000000000000000000000000000000000` | SafePal Hardware Wallet (`0xd905...96DA`) | Role administration              |
| `GOVERNANCE_ROLE`    | `keccak256("GOVERNANCE_ROLE")`                                       | SafePal Hardware Wallet (`0xd905...96DA`) | Parameter updates & fee settings |
| `GUARDIAN_ROLE`      | `keccak256("GUARDIAN_ROLE")`                                         | SafePal Hardware Wallet (`0xd905...96DA`) | Circuit breaker emergency pause  |
