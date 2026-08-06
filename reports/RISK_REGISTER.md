# Protocol Security Risk Register — UnifyVault v2.3

**Repository**: `UnifyVault-UV`  
**Version**: v2.3 Audit Release  
**Last Updated**: August 6, 2026

---

## 1. Risk Scoring Methodology

Risks are categorized based on **Likelihood** (1-5) and **Impact** (1-5).  
Risk Rating = $\text{Likelihood} \times \text{Impact}$.

- **Critical (20-25)**: Immediate threat to protocol funds or solvency.
- **High (15-19)**: Significant disruption or potential partial loss of funds.
- **Medium (8-14)**: Non-fatal operational anomaly or transient state degradation.
- **Low (1-7)**: Minor administrative or display issue.

---

## 2. Comprehensive Protocol Risk Matrix

| Risk ID  | Title / Risk Scenario                                                  | Initial Likelihood | Initial Impact |  Initial Risk   | Mitigation Mechanism                                                                                                              | Residual Likelihood | Residual Impact | Residual Risk |    Status     |
| :------- | :--------------------------------------------------------------------- | :----------------: | :------------: | :-------------: | :-------------------------------------------------------------------------------------------------------------------------------- | :-----------------: | :-------------: | :-----------: | :-----------: |
| **R-01** | **Oracle Staleness / Deviation** (Feed latency during high volatility) |         3          |       5        |  **High (15)**  | Multi-oracle aggregator with heartbeat enforcement (<= 3600s), deviation bounds, and circuit breaker fallback in `OracleManager`. |          1          |        3        |  **Low (3)**  | **Mitigated** |
| **R-02** | **Flash Loan Price Manipulation** (DEX pool reserves skew)             |         3          |       5        |  **High (15)**  | Protocol uses Chainlink decentralized oracle feeds; spot DEX prices are not used for NAV calculation.                             |          1          |        2        |  **Low (2)**  | **Mitigated** |
| **R-03** | **First-Depositor Inflation / Donation Attack**                        |         3          |       4        | **Medium (12)** | Permanent `DEAD_SHARES = 1000` burned on initial deposit; NAV tracks `_accountedAssets` instead of raw balance.                   |          1          |        1        |  **Low (1)**  | **Mitigated** |
| **R-04** | **Reentrancy during Payout / Transfer**                                |         3          |       5        |  **High (15)**  | `nonReentrant` state modifier across all entry points; strict Checks-Effects-Interactions (CEI) design pattern.                   |          1          |        1        |  **Low (1)**  | **Mitigated** |
| **R-05** | **Slippage Exploitation / Sandwich Attack**                            |         4          |       3        | **Medium (12)** | Mandatory user-defined minimum output parameters (`minSharesOut`, `minAmountOut`); maximum slippage caps.                         |          1          |        2        |  **Low (2)**  | **Mitigated** |
| **R-06** | **Privileged Role Compromise** (Admin key breach)                      |         2          |       5        |  **High (10)**  | Strict AccessControl role isolation bound to 48-hour timelock (`UnifyVaultTimelock`) and multi-sig authorization.                 |          1          |        3        |  **Low (3)**  | **Mitigated** |
| **R-07** | **Fee Assessment Overflow / Inflation**                                |         2          |       4        | **Medium (8)**  | Hardcoded maximum protocol fee ceiling (500 BPS / 5%); `FeeLib` bounds validation.                                                |          1          |        1        |  **Low (1)**  | **Mitigated** |
| **R-08** | **Vault Insolvency on Mass Redemption**                                |         2          |       5        |  **High (10)**  | Dynamic liquidity manager reserves (`LiquidityManager`); asset-proportional redemption payout.                                    |          1          |        2        |  **Low (2)**  | **Mitigated** |
| **R-09** | **Contract Upgrade Storage Collision**                                 |         2          |       4        | **Medium (8)**  | Reserved storage gap array (`uint256[50] __gap`) maintained in all upgradeable parent contracts.                                  |          1          |        1        |  **Low (1)**  | **Mitigated** |
| **R-10** | **Emergency Pause Lockup**                                             |         2          |       3        |   **Low (6)**   | Guardian role can trigger pause instantly, but unpause and emergency withdrawals are strictly governed.                           |          1          |        2        |  **Low (2)**  | **Mitigated** |

---

## 3. Operational & Security Monitoring Plan

1. **Chainlink Feed Monitoring**: Automated off-chain bot checking aggregator heartbeat every 300 seconds.
2. **Deposit & Redemption Limits**: Daily volume rate limits (`dailyDepositTotal`, `dailyRedeemTotal`) active on `UnifyVaultController`.
3. **Emergency Safeguards**: Guardian key holders equipped to invoke `pause()` upon detection of anomalous transaction activity.
