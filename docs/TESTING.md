# UnifyVault V2 Test Suite & Verification Report

## Test Suite Overview

UnifyVault V2 maintains a 100% pass rate across a comprehensive 44-suite testing framework containing **335 total unit, integration, invariant, economic adversarial, and fork tests**.

```bash
Ran 44 test suites in 2.22s (14.61s CPU time): 335 tests passed, 0 failed, 0 skipped (335 total tests)
```

---

## Breakdown of Test Layers

### 1. Core Unit Test Suites (30 Suites / 281 Tests)

- `UnifyVaultController.t.sol`: Controller deposit/redeem, fee collection, pause states.
- `PortfolioManager.t.sol`: NAV calculation, portfolio valuation math, asset previews.
- `StrategyManager.t.sol`: 10,000 BPS weight validation, asset addition/removal.
- `CustodyVault.t.sol`: Custody accounting, totalAssets vs surplusAssets.
- `LiquidityManager.t.sol`: Operational/reserve accounting, refill/sweep triggers.
- `SwapAdapter.t.sol`: DEX router integration and swap execution.
- `OracleManager.t.sol`: Oracle registration, staleness checks, heartbeat enforcement.
- `Treasury.t.sol`: Fee collection, governance withdrawals, emergency pause.
- `UVBTCETHToken.t.sol`: ERC20 minting, burning, role control, pausing.

### 2. Invariant & Fuzz Test Suite (`V2ProtocolInvariants.t.sol` - 15 Protocol Invariants)

Runs 64-256 runs per invariant verifying:

1. Controller never retains assets.
2. SwapAdapter never retains assets.
3. Operational + Reserve == CustodyVault Balance.
4. Treasury balance non-decreasing except via governance withdrawal.
5. Total strategy allocation always equals 10,000 BPS.
6. Unsupported assets cannot enter protocol accounting.
7. Shares cannot exist without backing assets.
8. NAV is never negative or invalid.
9. Surplus assets remain tracked separately.
10. Oracle health enforces staleness limits.
11. Emergency pause blocks state-changing operations.
12. Access control permissions cannot be bypassed.
13. Strategy updates preserve total weight sum.
14. Share burn equals redeemed proportional assets.
15. Protocol directory registrations remain consistent.

### 3. Economic Adversarial Test Suite (`EconomicAdversarial.t.sol` - 13 Scenarios)

1. Donation Attack: Direct transfers do not manipulate NAV.
2. Share Inflation Attack: Micro-deposits cannot steal funds.
3. Flash Loan Simulation: Instant deposit-redeem cycles yield negative return.
4. Oracle Manipulation: Stale, zero, and negative prices revert.
5. Slippage Protection: `minSharesOut` and `minAssetsOut` enforce execution bounds.
6. Liquidity Exhaustion: Excess redemptions cleanly draw from reserve accounting.
7. Repeated Rebalance Integrity: 50 sequential refill/sweep operations preserve total balance.
8. Unauthorized Treasury Access: All unauthorized paths revert.
9. Rounding Dust Attack: Repeated 1-wei deposit/redeem cycles extract zero profit.
10. Multi-User Fairness: Proportional share pricing and redemption payouts preserved.

### 4. Base Mainnet Fork Validation (`BaseMainnetFork.t.sol` - 10 Integration Tests)

Validates real Base Mainnet contract specifications and addresses (USDC, cbBTC, WETH, Uniswap V3 SwapRouter02).

---

## Running Test Commands

Run full test suite:

```bash
forge test
```

Run invariant tests with high depth:

```bash
forge test --match-path test/V2ProtocolInvariants.t.sol
```

Run economic adversarial suite:

```bash
forge test --match-path test/EconomicAdversarial.t.sol
```

Run Base Mainnet fork tests:

```bash
forge test --match-path test/BaseMainnetFork.t.sol
```
