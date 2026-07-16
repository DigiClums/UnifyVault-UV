# UnifyVault Product Decisions Log

This document records the official product decisions and engineering rationales for the UnifyVault Protocol V1 release.

---

## 1. Core Decisions Ledger

### Q1: What is the exact redemption model?

- **Decision:** Pro-rata underlying asset delivery (50% wrapped BTC + 50% wrapped ETH).
- **Rationale:** Returning the actual underlying assets guarantees protocol solvency under all conditions. It eliminates the need for the protocol to maintain liquid stablecoin reserves or absorb conversion slippage during redemptions.

### Q2: Should V1 use immutable contracts or upgradeable contracts?

- **Decision:** UUPS Upgradeable contracts (`ERC-1967`) for the Controller, Vault, and Treasury modules.
- **Rationale:** Operating on Base L2 requires flexibility during V1 rollout to resolve any edge-case integration or logic bugs discovered after audits without executing complex collateral migrations.

### Q3: Should mint/burn fees be fixed or dynamically configurable?

- **Decision:** Dynamically configurable with a strict hard cap of 1.00% written into the smart contracts.
- **Rationale:** Volatile market spreads make fixed fees vulnerable to frontrunning. Allowing governance to adjust fees dynamically helps protect the underlying vault value during high volatility.

### Q4: Should `ProtocolDirectory` exist in V1 or use immutable references?

- **Decision:** Yes, `ProtocolDirectory` must exist.
- **Rationale:** Resolving contract references dynamically on-chain allows independent UUPS upgrades of modules (e.g. replacing the Controller or Oracle Manager) without needing to update and link variables across all peer contracts.

### Q5: Which contracts require emergency pause?

- **Decision:** `UnifyVaultController.sol` (pauses deposits and redemptions) and `OracleManager.sol` (pauses price feeds).
- **Rationale:** Pausing deposits and redemptions protects user collateral during exploits or frontrunning attacks. Pausing the oracle prevents outdated pricing from corrupting Net Asset Value (NAV) valuations.

### Q6: Which contracts must never be pausable?

- **Decision:** `CustodyVault.sol` (withdrawals by the authorized controller must never block) and the wrapper token `UVBTCETHToken.sol` (transfers on secondary markets).
- **Rationale:** Keeps the custody model strictly non-custodial and preserves index token utility on L2 secondary DEX markets.

### Q7: Which modules are replaceable?

- **Decision:** `UnifyVaultController` (transaction orchestrator) and pricing feed providers (`OracleProviders`).
- **Rationale:** Allows upgrading calculation logic and fallback oracle architectures.

### Q8: Which modules are immutable?

- **Decision:** `ProtocolDirectory` registration rules (once locked) and base interface rules.
- **Rationale:** Protects the protocol directory registry from administrative capture or frontrunning modifications.
