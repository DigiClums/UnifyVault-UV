# UnifyVault v2.2.0 — Threat Model & Attack Vector Analysis

## 1. Attack Surfaces & Mitigations

### 1.1 First-Deposit / Inflation Share Dilution Attacks

- **Threat**: Attacker deposits 1 wei of collateral, mints 1 share, and transfers a massive amount of collateral directly to `CustodyVault` to artificially inflate the share price and break rounding for subsequent depositors.
- **Mitigation**: Initial minting burns dead shares (`MINIMUM_LIQUIDITY = 1000`) on first deposit, protecting share ratio rounding against first-depositor manipulation.

### 1.2 Oracle Price Manipulation & Stale Price Exploits

- **Threat**: Flash loan manipulation of decentralized spot price feeds or stale oracle data leading to distorted NAV calculations.
- **Mitigation**: Prices are fetched via Chainlink Oracles through `OracleManager`. The protocol enforces max heartbeat age checks (`maxStaleness`), invalid price assertions (`price > 0`), and round completeness checks (`answeredInRound >= roundId`). Spot DEX prices are strictly prohibited for NAV calculation.

### 1.3 Flash Loan Arbitrage on Deposits/Redemptions

- **Threat**: Taking a flash loan to deposit collateral, manipulate strategy weights/prices, and redeem immediately within the same block.
- **Mitigation**: Deposit and redemption fees (0.5% deposit, 2.0% redeem, 5.0% performance fee on gain) introduce friction exceeding standard flash loan arbitrage margins. Furthermore, DEX swaps execute with tight max-slippage protections.

---

## 2. Risk Matrix Summary

| Threat Vector          | Severity | Mitigation Strategy                                        | Verification                |
| :--------------------- | :------- | :--------------------------------------------------------- | :-------------------------- |
| Reentrancy Asset Drain | Critical | OpenZeppelin `nonReentrant` + checks-effects-interactions  | Fuzzing & Slither Clean     |
| Oracle Price Staleness | High     | Heartbeat boundary assertions in `ChainlinkOracleProvider` | Unit & Invariant Tests      |
| Share Inflation Attack | High     | Minimum liquidity burn on genesis deposit                  | `EconomicAdversarial.t.sol` |
| Slippage Exhaustion    | Medium   | Bounded `minAssetsOut` and `minSharesOut`                  | Unit Tests                  |
