# UnifyVault v2.2.0 Post-Launch Monitoring & Observability Guide

> [!NOTE]
> This document specifies the real-time monitoring, alerting thresholds, and health metrics required for maintaining UnifyVault v2.2.0 on Base Mainnet.

---

## 1. On-Chain Smart Contract Monitoring

### 1.1 Critical Events to Monitor

| Event Name              | Contract Source     | Metric & Alert Criteria                                                | Severity        |
| :---------------------- | :------------------ | :--------------------------------------------------------------------- | :-------------- |
| `DepositExecuted`       | `UnifyControllerV2` | Volume spike > $500,000 in 10 mins                                     | `INFO` / `WARN` |
| `RedeemExecuted`        | `UnifyControllerV2` | Large redemption > 20% TVL                                             | `WARNING`       |
| `PerformanceFeeSettled` | `FeeManager`        | Fee calculation verification (`UVIP-001`)                              | `INFO`          |
| `Rebalanced`            | `StrategyManager`   | Strategy weight deviation > 2.0% from 50/50                            | `WARNING`       |
| `OracleUpdated`         | `OracleManager`     | Price deviation > 3.5% between updates or heartbeat timeout (> 1 hour) | `CRITICAL`      |
| `EmergencyPaused`       | `UnifyControllerV2` | Protocol paused by Sentinel / Admin                                    | `CRITICAL`      |

### 1.2 Automated Alert Thresholds

1. **Collateralization Ratio**:
   - `Target`: 100.0% backed by cbBTC, WETH, and USDC reserve buffers.
   - `Alert`: If Total Collateral Value < 99.5% of Total Share NAV, trigger `CRITICAL_UNDERCOLLATERALIZED` alert.

2. **Oracle Price Staleness**:
   - `Max Heartbeat`: 3,600 seconds (1 hour).
   - `Alert`: If Chainlink feed update > 45 minutes old, trigger `WARN_ORACLE_STALE`.

3. **Treasury Fee Accumulation**:
   - Track accumulated protocol deposit/redeem fees and performance fees in `TreasuryCard`.

---

## 2. Frontend & Infrastructure Observability

### 2.1 RPC Resilience & Error Metrics

- **RPC Timeout Rate**: Alert if RPC request failure rate exceeds 2.0% over a 5-minute window.
- **RPC Latency**: Monitor 95th percentile RPC response time (target < 800ms).

### 2.2 User Experience Telemetry

- **Wallet Connection Success Rate**: Track connection drop-off across MetaMask, Coinbase Wallet, and WalletConnect.
- **Transaction Rejection Rate**: Monitor user cancellation rate during wallet signature phase (`Error Code 4001`).

---

## 3. Incident Escalation Matrix

1. **Level 1 (Warning)**: Single RPC node failure or minor rebalance deviation $\rightarrow$ Automatic RPC fallback node switch.
2. **Level 2 (High)**: Chainlink Oracle heartbeat delay or price divergence $\rightarrow$ Notify Security On-Call team.
3. **Level 3 (Critical)**: Contract invariant failure or under-collateralization $\rightarrow$ Trigger Emergency Sentinel `pause()` command.
