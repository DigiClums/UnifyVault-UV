# ❓ UnifyVault V2 — Frequently Asked Questions (FAQ)

---

## 1. General Protocol Questions

### What is UnifyVault V2?

UnifyVault V2 is a non-custodial index vault deployed on Base Mainnet. It allows users to deposit collateral (USDC, WETH, cbBTC) and mint `UVBTCETH` index shares representing exposure to a 50/50 BTC/ETH strategy.

### What chain is UnifyVault V2 deployed on?

Base Mainnet (Chain ID `8453`).

---

## 2. Depositing & Share Accounting

### How is my cost basis tracked?

Cost basis is tracked automatically on-chain per user wallet address by `CostBasisManager.sol` upon every deposit transaction.

### What fees does the protocol charge?

Fee parameters are configured in basis points (BPS) via `UnifyVaultController.sol` and governed by the 3-of-5 Safe Multisig:

- Deposit Fee: Up to 50 BPS (0.5%)
- Redeem Fee: Up to 50 BPS (0.5%)
- Performance Fee: Settled by `PerformanceFeeSettler.sol` based on High-Water Mark tracking.

---

## 3. Governance & Security

### Who controls protocol admin roles?

All administrative (`DEFAULT_ADMIN_ROLE`) and governance (`GOVERNANCE_ROLE`) controls are owned by an institutional 3-of-5 Safe Multisig (`0xd905920c91853039060246Ed5724AA72B91a96DA`).

### Is there an emergency pause mechanism?

Yes. The `GUARDIAN_ROLE` sentinel key can invoke `pause()` on `UnifyVaultController` to halt deposits and redemptions instantly in case of emergency. Only `GOVERNANCE_ROLE` (3-of-5 Safe Multisig) can unpause.
