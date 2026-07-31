# UnifyVault V2 — Known Limitations & Architectural Trade-offs

> **Version**: 2.0.0-RC2  
> **Status**: Code Freeze / Audit Readiness

---

## 1. Integer Division Truncation (Vault Favoring Rounding)

- **Behavior**: Standard EVM integer division rounds down. In pro-rata redemption calculations `(totalAssetRaw * userSharesRaw) / totalSharesRaw`, fractional wei values are truncated down.
- **Rationale**: Truncating fractional wei down ensures that the vault never pays out more assets than it physically holds in custody, protecting remaining share holders from fractional reserve erosion.

---

## 2. Rebalance Drift Tolerance Threshold

- **Behavior**: Rebalancing is gated by a `500 BPS` (5.0%) drift threshold (`StrategyManager.rebalanceThreshold()`).
- **Rationale**: Rebalancing involves executing swaps across DEX pools. Enforcing a 5% drift threshold prevents gas waste and DEX fee erosion on small price movements.

---

## 3. Testnet Cost Basis Accounting Fallback

- **Behavior**: On Base Sepolia testnet where on-chain `CostBasisManager` events are unindexed, the frontend falls back to browser deposit ledgers (`localStorage`) backed by genesis `$1.00/share` baseline valuation.
- **Rationale**: Ensures responsive UI performance during testnet deployment without requiring heavy sub-graph infrastructure for transient test addresses.

---

## 4. Single-Admin Testnet Governance

- **Behavior**: `DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, and `GUARDIAN_ROLE` are held by a single dedicated SafePal admin address (`0xd905920c91853039060246Ed5724AA72B91a96DA`) on testnet.
- **Mitigation**: Mainnet deployment mandates transferring governance roles to a Gnosis Safe 3-of-5 Multi-Sig paired with a 48-hour Timelock Controller.
