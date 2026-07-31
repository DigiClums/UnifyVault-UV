# UnifyVault V2 — Deployment & Configuration Architecture

This document specifies the deployment order, contract registry configuration, and governance administrator addresses for **UnifyVault V2**.

---

## 🏛️ 1. Production Governance Addresses

- **Permanent Governance Wallet (SafePal Hardware Wallet)**: `0xd905920c91853039060246Ed5724AA72B91a96DA`
- **Previous Deployer Wallet**: `0xB145AC2a59575Fbe306a58Ac924718f4DD4659Da`

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

## 🚀 4. Deployment & Migration Scripts

1. **[`DeployV2.s.sol`](../packages/protocol/script/DeployV2.s.sol)**: Deploys protocol core contract suite.
2. **[`RegisterAndConfigureV2.s.sol`](../packages/protocol/script/RegisterAndConfigureV2.s.sol)**: Registers contract addresses in `ProtocolDirectory`.
3. **[`MigrateGovernance.s.sol`](../packages/protocol/script/MigrateGovernance.s.sol)**: Idempotent governance role grant and verification script for SafePal Hardware Wallet (`0xd905920c91853039060246Ed5724AA72B91a96DA`).
