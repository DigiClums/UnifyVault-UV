# Known Limitations & Operational Constraints

This document lists design limitations and operational constraints of the UnifyVault Protocol v0.8.0 / v0.9.0 release.

---

## 1. Mathematical Limitations

### Rounding Truncation

- **Behavior:** The division calculation for proportional share minting and redemptions always rounds down:
  `shares = (netDeposit * totalSupply) / totalAssets`
- **Constraint:** For extremely small deposits (e.g. 1 wei when total assets are high), the division rounds down to `0`. This is expected behavior to favor the vault and prevent arbitrage, but requires frontends to enforce minimum deposit bounds.

---

## 2. Tokenomic Constraints

### Fixed Basis Point Fees

- **Behavior:** Deposit and redemption fees are fixed at `25 BPS` via the `FeeLib` constants:
  `DEPOSIT_FEE_BPS = 25`
  `REDEEM_FEE_BPS = 25`
- **Constraint:** In v1.0.0, fees are immutable and cannot be adjusted dynamically by governance. Any changes to fees require redeploying the controller contract or library upgrades.

---

## 3. Operational Limitations

### Single Collateral Assets

- **Behavior:** While `CustodyVault` supports registering multiple collateral assets, the share calculations evaluate NAV and total assets _per-asset_ context during deposit/redemption.
- **Constraint:** Multi-asset basket index calculations (e.g. depositing ETH to mint shares backed by a basket of both BTC and ETH) must be coordinated by a secondary portfolio manager contract.
