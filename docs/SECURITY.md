# UnifyVault v2.2.0 — Security Model & Access Control Matrix

## 1. Security Architecture

UnifyVault v2.2.0 uses OpenZeppelin `AccessControl` and `ReentrancyGuard` across core protocol modules.

### Role Matrix

| Role                 | Target Contracts                      | Capabilities                                                              |
| :------------------- | :------------------------------------ | :------------------------------------------------------------------------ |
| `DEFAULT_ADMIN_ROLE` | All Modules                           | Grant/revoke roles, update module pointers in `ProtocolDirectory`.        |
| `CONTROLLER_ROLE`    | `CustodyVault`, `UVBTCETHToken`       | Call restricted mint, burn, deposit, and withdraw procedures.             |
| `MANAGER_ROLE`       | `LiquidityManager`, `StrategyManager` | Adjust operational liquidity thresholds and portfolio allocation weights. |
| `PAUSER_ROLE`        | `UnifyVaultController`, `Treasury`    | Trigger immediate pause on deposits and redemptions.                      |

---

## 2. Emergency Controls & Reentrancy Protections

- **Non-Reentrant Guards**: `UnifyVaultController.deposit` and `UnifyVaultController.redeem` use OpenZeppelin `ReentrancyGuard` to prevent reentrancy during external token transfers and fee collection.
- **Pausability**: Critical state-changing functions in `UnifyVaultController` respect `whenNotPaused` state, allowing emergency response teams to halt protocol operations if anomalous conditions arise.
