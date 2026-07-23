# UnifyVault V2 Threat Model

## Executive Summary

This document details the threat vectors, attack surfaces, trust assumptions, and mitigation strategies evaluated for UnifyVault V2.

---

## 1. Asset & Trust Assumptions

- **Assets in Scope**: ERC20 collateral tokens (USDC, cbBTC, WETH) and index shares (`UVBTCETH`).
- **Standard Tokens**: Assumes standard 6, 8, or 18 decimal ERC20 tokens without fee-on-transfer or rebasing mechanics. Fee-on-transfer tokens are explicitly rejected by treasury reception verification.
- **Oracle Integrity**: Assumes Chainlink price feeds operate correctly within configured heartbeat boundaries.

---

## 2. Threat Analysis & Mitigations

### A. Direct Token Donation Attack

- **Attack Vector**: Attacker transfers ERC20 tokens directly into `CustodyVault` attempting to artificially inflate NAV or manipulate share pricing.
- **Mitigation**: `CustodyVault` separates physical ERC20 balance from internal `_accountedAssets`. `PortfolioManager` values vault assets using `totalAssets()` (accounted assets only). Direct donations enter `surplusAssets` and have zero impact on NAV or share pricing. Tested in `testAdversarial_DonationAttack_DirectTransferDoesNotManipulateNAV()`.

### B. Share Inflation / First-Depositor Attack

- **Attack Vector**: First depositor deposits 1 wei, donates large asset balance, and inflates share price to cause rounding loss for subsequent depositors.
- **Mitigation**: Virtual initial share pricing ($1.00 USD initial NAV benchmark), fee deduction, and proportional minting protect new depositors. Tested in `testAdversarial_ShareInflationAttack_RepeatedSmallDepositsNoUnfairGain()`.

### C. Flash Loan & Deposit Arbitrage

- **Attack Vector**: Attacker uses flash loan liquidity to deposit large capital, manipulate price/share state, and immediately redeem.
- **Mitigation**: Protocol deposit (0.10%) and redemption (0.10%) fees make instantaneous deposit-redeem cycles net negative. Tested in `testAdversarial_FlashLoanSimulation_LargeLiquidityInjectionNoProfit()`.

### D. Oracle Price Manipulation & Stale Data

- **Attack Vector**: Attacker attempts to deposit/redeem during stale or zero price feed conditions.
- **Mitigation**: `OracleManager` validates price age against heartbeat limits and checks `price > 0`. Reverts on stale (`OraclePriceStale`) or zero (`OraclePriceNegative`) prices. Tested in `testAdversarial_OracleManipulation_*`.

### E. Slippage & MEV Front-Running

- **Attack Vector**: MEV bot front-runs user deposit or redemption to cause unfavorable swap execution.
- **Mitigation**: Mandatory `minSharesOut` (deposit) and `minAssetsOut` (redeem) slippage bounds enforced on every transaction. Tested in `testAdversarial_SlippageAttack_*`.

### F. Liquidity Exhaustion

- **Attack Vector**: Large redemptions exceed operational liquidity balance.
- **Mitigation**: `LiquidityManager` smoothly draws remaining withdrawal balance from reserve accounting while maintaining `Operational + Reserve == Total Assets`. Tested in `testAdversarial_LiquidityExhaustion_*`.

### G. Rounding & Dust Arbitrage

- **Attack Vector**: Repeated 1-wei micro deposits/redemptions to exploit integer division truncation.
- **Mitigation**: Protocol fee rounding and share pricing floor prevent positive return extraction. Tested in `testAdversarial_RoundingAttack_*`.

### H. Governance Compromise

- **Attack Vector**: Compromised admin key attempts to drain vault assets.
- **Mitigation**: Governance actions bound to multi-sig timelock. Passive `CustodyVault` only releases funds to authorized `CONTROLLER_ROLE`.
