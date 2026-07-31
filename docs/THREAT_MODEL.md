# UnifyVault V2 — Threat Model & Comprehensive Attack Analysis

> **Protocol Version**: 2.0.0-RC2  
> **Status**: APPROVED (RC2 Deliverable #2)  
> **Target Network**: Base Sepolia / Base Mainnet  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)  
> **Commit Hash**: `c144342`

---

## Executive Overview

This document provides a systematic threat model and attack vector analysis for the UnifyVault V2 smart contract architecture. It outlines potential adversarial strategies, risk severity levels, protocol mitigation mechanisms, residual risk classifications, and empirical audit verification statuses.

---

## Executive Risk Matrix

| Threat Category                   | Likelihood |  Impact  | Primary Mitigation Control                                                                                                         | Residual Risk | Audit Status |
| :-------------------------------- | :--------: | :------: | :--------------------------------------------------------------------------------------------------------------------------------- | :-----------: | :----------: |
| **1. Donation Attack**            |    Low     |   Low    | `CustodyVault.totalAssets()` returns `max(accounted, actual)`, so direct transfers update NAV dynamically pro-rata for all holders |    **Low**    | **VERIFIED** |
| **2. First Depositor Inflation**  |    Low     |   High   | Genesis `$1.00/share` baseline fallback + `DEAD_SHARES` (1,000 wei) permanently minted to `0xdEaD` on first deposit                |    **Low**    | **VERIFIED** |
| **3. Flash-Loan Attack**          |    Low     |   High   | Pricing relies on Chainlink/Pyth 18-decimal normalized oracle feeds, NOT AMM spot liquidity pools                                  |    **Low**    | **VERIFIED** |
| **4. Oracle Failure / Staleness** |   Medium   |   High   | Enforces heartbeat staleness checks, 15s grace for L2 clock drift, and routes via `try...catch` to fallback feeds                  |  **Medium**   | **VERIFIED** |
| **5. Governance Compromise**      |    Low     | Critical | SafePal hardware wallet on testnet; Gnosis Safe 3-of-5 Multi-Sig paired with 48h Timelock on mainnet                               |  **Medium**   | **VERIFIED** |
| **6. Reentrancy Exploitation**    |    Low     | Critical | All state-changing entry points enforce OpenZeppelin `ReentrancyGuard` (`nonReentrant` modifier)                                   |    **Low**    | **VERIFIED** |
| **7. Precision & Rounding**       |    Low     |  Medium  | 18-decimal fixed-point BigInt arithmetic (`(TVL18 * 10^18) / Supply`); division truncates in favor of vault                        |    **Low**    | **VERIFIED** |
| **8. Denial of Service (DoS)**    |    Low     |  Medium  | Gas-bounded loops, no unbounded iteration over user addresses, explicit error handling                                             |    **Low**    | **VERIFIED** |
| **9. Front-Running / MEV**        |   Medium   |  Medium  | Deposits and redemptions enforce `minShares` and `minAssets` slippage protection bounds                                            |    **Low**    | **VERIFIED** |
| **10. Keeper Failure**            |   Medium   |   Low    | Vault deposits and redemptions function independently of automated keeper rebalancing                                              |    **Low**    | **VERIFIED** |
| **11. Emergency Pause Abuse**     |    Low     |  Medium  | `GUARDIAN_ROLE` can pause; unpausing requires separate `GOVERNANCE_ROLE` call (`resume()`)                                         |    **Low**    | **VERIFIED** |
| **12. Fee Schedule Bypass**       |    Low     |  Medium  | Enforces `FeeManager` registration in `ProtocolDirectory`; controller reverts with `FeeManagerNotAvailable` if missing             |    **Low**    | **VERIFIED** |

---

## Economic Assumptions

1. **Honest Oracle Majority**: Chainlink and Pyth decentralized oracle networks operate honestly and maintain accurate price feeds.
2. **Rational Arbitrage Efficiency**: Rational arbitrageurs restore market peg alignment when asset prices fluctuate.
3. **Sufficient Underlying Liquidity**: Collateral assets (WBTC, WETH, USDC) maintain sufficient market depth on DEX/CEX venues.
4. **Reasonable Volatility**: Collateral asset price movements occur within standard market volatility bounds.

---

## Detailed Attack Vector & Residual Risk Analysis

### 1. Donation Attack

- **Attack Scenario**: An attacker transfers raw collateral (e.g. 10 WBTC) directly to `CustodyVault.sol` using standard ERC-20 `transfer()` without invoking `UnifyVaultController.deposit()`.
- **Impact**: Attacker attempts to manipulate share pricing or steal unminted shares.
- **Protocol Mitigation**: `CustodyVault.totalAssets(asset)` queries the maximum of internal accounted assets and live ERC-20 balance (`max(_accountedAssets, balanceOf)`). Direct token transfers increase the Total Portfolio NAV dynamically, increasing the value of existing `$uvBTCETH` shares pro-rata for all token holders. No shares are minted to the attacker without calling `deposit()` through `UnifyVaultController`.
- **Residual Risk**: **Low** (Attacker permanently forfeits donated collateral to existing share holders).

### 2. First Depositor Inflation Attack (ERC-4626 Vault Attack)

- **Attack Scenario**: The first depositor attempts to deposit 1 wei of asset, receive 1 wei of shares, then donate 100 WETH to inflate the share price.
- **Impact**: Subsequent small depositors lose collateral due to integer rounding to 0 shares.
- **Protocol Mitigation**: `UnifyVaultController.sol` explicitly mints `DEAD_SHARES` (1,000 wei) permanently locked to `address(0xdEaD)` on the first deposit. Subsequent calculations operate against a non-zero share supply. Zero-value deposits and small deposits yielding $\le \text{DEAD\_SHARES}$ revert explicitly.
- **Residual Risk**: **Low** (First-depositor inflation attack is mathematically rendered unviable).

### 3. Flash-Loan Attack

- **Attack Scenario**: An attacker takes a flash loan, manipulates an AMM spot pool balance in the same transaction, and attempts to deposit into UnifyVault at an artificial share price.
- **Impact**: Mispricing of vault shares during flash-loan transactions.
- **Protocol Mitigation**: UnifyVault **does NOT use AMM spot reserves** to determine asset valuations. Asset prices are derived exclusively from `OracleManager.sol`, which consumes Chainlink / Pyth decentralized oracle feeds.
- **Residual Risk**: **Low** (Flash loans cannot alter Chainlink/Pyth oracle outputs).

### 4. Oracle Manipulation & Staleness Exploitation

- **Attack Scenario**: A Chainlink oracle feed freezes, returns a stale price, or has a timestamp slightly in the future due to L2 block timestamp variance.
- **Impact**: Vault collateral drain or protocol DoS via stale/invalid pricing.
- **Protocol Mitigation**: `OracleManager.sol` validates heartbeat freshness (`age <= config.heartbeat`), allows a 15-second grace period for L2 block timestamp variations (`rawRound.updatedAt <= block.timestamp + 15`), and routes via `try...catch` to the secondary `fallbackProvider`. If both fail, transactions revert with `Errors.AssetNotSupported()`.
- **Residual Risk**: **Medium** (Dependent on external oracle availability; fallback provider should be configured in deployment).

### 5. Governance Compromise & Malicious Admin

- **Attack Scenario**: An attacker compromises a governance private key and attempts to drain vault collateral by updating contract registry addresses or modifying target strategy weights.
- **Impact**: Total loss of custodied vault collateral.
- **Protocol Mitigation**: On testnet, governance roles are held by a dedicated SafePal hardware wallet (`0xd905...96DA`). On mainnet, `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE` will be held by a Gnosis Safe 3-of-5 Multi-Sig paired with a 48-hour Timelock Controller.
- **Residual Risk**: **Medium** (Mitigated by Multi-Sig and Timelock architecture on mainnet).

### 6. Reentrancy Exploitation (Cross-Function & Cross-Contract)

- **Attack Scenario**: An attacker uses a malicious fallback function during ERC-20 transfer to re-enter `UnifyVaultController.redeem()` or `CustodyVault.withdraw()`.
- **Impact**: Double-withdrawal of collateral or unbacked share burning.
- **Protocol Mitigation**: All public state-changing functions in `UnifyVaultController.sol` and `CustodyVault.sol` inherit OpenZeppelin `ReentrancyGuard` and apply the `nonReentrant` modifier. Internal balances are updated before external transfers are initiated (Checks-Effects-Interactions).
- **Residual Risk**: **Low** (Gated by `nonReentrant` and CEI pattern).

### 7. Precision Loss & Rounding Exploitation

- **Attack Scenario**: An attacker executes millions of micro-transactions to accumulate fractional rounding discrepancies.
- **Impact**: Gradual draining of vault reserves over time.
- **Protocol Mitigation**: All pricing and share calculations use 18-decimal fixed-point BigInt arithmetic (`(TVL18 * 10^18) / totalSupply`). EVM integer division truncates fractional wei **down in favor of vault reserves**, ensuring that the vault never pays out more assets than it holds.
- **Residual Risk**: **Low** (Rounding favors vault collateral reserves).

### 8. Denial of Service (DoS) Vectors

- **Attack Scenario**: An attacker creates thousands of empty deposit addresses to cause gas limit exhaustion in administrative loops.
- **Impact**: Freezing of protocol rebalancing or fee collection.
- **Protocol Mitigation**: Contracts contain **zero unbounded loops** over user address arrays. Operations execute in $O(1)$ constant time complexity per transaction.
- **Residual Risk**: **Low** ($O(1)$ constant gas execution).

### 9. Front-Running / MEV (Sandwich Attacks)

- **Attack Scenario**: A searcher front-runs a large user deposit or rebalance transaction to extract value via DEX sandwiching.
- **Impact**: User receives fewer shares or rebalance incurs higher slippage.
- **Protocol Mitigation**: User deposits and redemptions accept explicit `minShares` and `minAssets` parameters. Strategy rebalancing enforces a `minAmountOut` check against current oracle prices.
- **Residual Risk**: **Low** (Slippage bounds enforce minimum payout thresholds).

### 10. Keeper Failure & Rebalance Stoppage

- **Attack Scenario**: The off-chain keeper bot crashes or runs out of gas, failing to execute strategy rebalancing.
- **Impact**: Portfolio allocation drifts away from target weights.
- **Protocol Mitigation**: Vault deposits, redemptions, and NAV calculations operate **100% independently** of keeper rebalancing. Keeper failure does not freeze user funds or corrupt share pricing.
- **Residual Risk**: **Low** (User funds remain 100% liquid and redeemable).

### 11. Emergency Pause Privilege Abuse

- **Attack Scenario**: A rogue guardian repeatedly calls `emergencyPause()` to disrupt protocol operations.
- **Impact**: Temporary denial of service for deposit and redemption transactions.
- **Protocol Mitigation**: `GUARDIAN_ROLE` has permission ONLY to pause (`emergencyPause()`). Unpausing the protocol requires a separate `GOVERNANCE_ROLE` transaction (`resume()`).
- **Residual Risk**: **Low** (Role segregation prevents unauthorized unpausing).

---

## Out-of-Scope Threats

1. **L1 / L2 Consensus Failure**: Re-ordering, re-orgs, or consensus breakdown on Base L2 / Ethereum L1.
2. **Global Internet Outage**: Total loss of global internet connectivity or public RPC node availability.
3. **Network-Wide Oracle Collapse**: Simultaneous structural breakdown of Chainlink and Pyth oracle networks across all nodes.
4. **Client-Side Wallet Malware**: Compromise of user private keys by local device malware or phishing.
