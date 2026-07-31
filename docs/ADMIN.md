# UnifyVault V2 — Protocol Administration & Governance Architecture

This document defines the production governance administration, administrative roles, and hardware wallet security specifications for **UnifyVault V2**.

---

## 🏛️ 1. Permanent Protocol Administrator

The sole permanent protocol administrator for all UnifyVault V2 deployed smart contracts is the **SafePal Hardware Wallet**:

- **Permanent Governance Wallet (SafePal Hardware Wallet)**: `0xd905920c91853039060246Ed5724AA72B91a96DA`
- **Previous Deployer Wallet**: `0xB145AC2a59575Fbe306a58Ac924718f4DD4659Da` (Privileges Renounced)

---

## 🔄 2. Governance Migration

- **Migration Status**: `COMPLETED`
- **Migration Date**: `2026-07-31`
- **Previous Admin**: `0xB145AC2a59575Fbe306a58Ac924718f4DD4659Da`
- **Current Admin**: `0xd905920c91853039060246Ed5724AA72B91a96DA` (SafePal Hardware Wallet)
- **Migration Method**:
  - Granted `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE` to SafePal hardware wallet (`0xd905920c91853039060246Ed5724AA72B91a96DA`).
  - Verified administrative roles across 100% of deployed protocol contracts.
  - Old deployer wallet executed `renounceRole(DEFAULT_ADMIN_ROLE)` across all contracts.
  - Governance authority successfully transferred.

---

## 🔒 3. Security Notes

- **Sole Administrator**: The SafePal hardware wallet (`0xd905920c91853039060246Ed5724AA72B91a96DA`) is now the sole governance administrator.
- **Privilege Revocation**: The previous hot wallet (`0xB145AC2a59575Fbe306a58Ac924718f4DD4659Da`) no longer possesses `DEFAULT_ADMIN_ROLE` or any privileged roles on protocol contracts.
- **Hardware Execution Enforcement**: All future governance parameter changes, treasury withdrawals, emergency pause operations, contract upgrades, and administrative actions must be executed exclusively from the SafePal hardware wallet.
- **No Hot Wallet Reuse**: The previous deployer wallet must **never** be reused for privileged protocol operations.

---

## 📊 4. Contract Governance Matrix

| Deployed Contract        | Address                                      | DEFAULT_ADMIN_ROLE | GOVERNANCE_ROLE |  GUARDIAN_ROLE  |
| :----------------------- | :------------------------------------------- | :----------------: | :-------------: | :-------------: |
| **ProtocolDirectory**    | `0xB5dd6d766867cB4c299AD2711068455C718EDDbc` |  `0xd905...96DA`   | `0xd905...96DA` |       N/A       |
| **UnifyVaultController** | `0x7EF5D93f83995228efFc63dbe513367a719f0633` |  `0xd905...96DA`   | `0xd905...96DA` | `0xd905...96DA` |
| **CustodyVault**         | `0x54696d5d00b58F27F9d8C358560ff2a7d10d409e` |  `0xd905...96DA`   | `0xd905...96DA` | `0xd905...96DA` |
| **Treasury**             | `0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D` |  `0xd905...96DA`   | `0xd905...96DA` | `0xd905...96DA` |
| **OracleManager**        | `0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635` |  `0xd905...96DA`   | `0xd905...96DA` |       N/A       |
| **UVBTCETHToken**        | `0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4` |  `0xd905...96DA`   | `0xd905...96DA` | `0xd905...96DA` |
