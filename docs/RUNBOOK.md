# UnifyVault V2 — Protocol Operations Runbook

> **Protocol Version**: 2.0.0-RC2  
> **Status**: APPROVED (RC2 Deliverable #8)  
> **Target Network**: Base Sepolia / Base Mainnet  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)  
> **Commit Hash**: `c144342`

---

## 1. Executive Summary

This Runbook defines standard operating procedures, daily/weekly/monthly operational checklists, service monitoring guidelines, keeper bot maintenance, and escalation pathways for protocol release engineers and DevOps administrators.

---

## 2. Health Monitoring & Observability Stack

### 2.1 Protocol Health Dashboard Targets

- **Total Value Locked (TVL)**: Real-time on-chain collateral total ($22.08 on testnet).
- **NAV & Share Price**: Constant 18-decimal fixed-point price check ($0.77/share).
- **Oracle Freshness**: `isPriceFresh() == true` across all registered feeds.
- **Keeper Status**: PM2 Process `0` running with 0 unhandled crash errors.
- **RPC Telemetry**: Response latency < 250ms with 0% dropped calls.

### 2.2 Observability Stack Roadmap

- **Logging & Telemetry**: PM2 logs + OpenTelemetry collector integration.
- **Alerting**: Prometheus + Grafana dashboard triggers paired with PagerDuty / Sentry integration.

---

## 3. Operational Checklists

### 3.1 Daily Operational Checklist

- [ ] **PM2 Microservices**: Verify all 9 background processes are `online`.
- [ ] **Oracle Freshness**: Run `cast call <ORACLE> "isPriceFresh(address)(bool)"` across all asset feeds.
- [ ] **Strategy Allocation Drift**: Query `cast call <STRATEGY> "checkRebalanceNeeded()(bool)"`.
- [ ] **RPC Endpoint Latency**: Monitor Base RPC response latency (< 250ms).
- [ ] **Keeper Log Inspection**: Review `tail -n 100 oracleKeeper.log` for zero execution errors.

### 3.2 Weekly Operational Checklist

- [ ] **Role Audit**: Verify `hasRole()` permissions across all protocol modules.
- [ ] **Dependency Scan**: Run `gitleaks` secret scan and npm dependency vulnerability check.
- [ ] **Gas Usage Review**: Inspect keeper transaction gas costs on Base block explorer.
- [ ] **Log Rotation**: Rotate and archive PM2 log files (`pm2 flush`).

### 3.3 Monthly Operational Checklist

- [ ] **Disaster Recovery Simulation**: Test off-chain indexer database restoration from S3 backups.
- [ ] **Governance Key Review**: Inspect SafePal hardware admin wallet access and signer health.
- [ ] **Security Patch Review**: Evaluate upstream OpenZeppelin and Node.js dependency updates.

---

## 4. Service Architecture & Process Monitoring (PM2)

All protocol background microservices are managed via PM2 Process Manager:

| Process ID | Service Name               | Primary Function                       | Log Path            | Health Command |
| :--------: | :------------------------- | :------------------------------------- | :------------------ | :------------- |
|   **0**    | `unifyvault-oracle-keeper` | Automated Oracle Price Update Keeper   | `oracleKeeper.log`  | `pm2 status 0` |
|   **1**    | `unifyvault-indexer`       | On-Chain Event & NAV Telemetry Indexer | `indexer.log`       | `pm2 status 1` |
|  **2-8**   | `unifyvault-web`           | Next.js Web-V2 Frontend Clusters       | `apps/web-v2/logs/` | `pm2 status 2` |

---

## 5. Capacity & Scaling Guidelines

| Component           |   Target Load    |   Scaling Limit    | Scaling Action Plan                                               |
| :------------------ | :--------------: | :----------------: | :---------------------------------------------------------------- |
| **Web Frontend**    |    100 req/s     |    1,000 req/s     | Add PM2 cluster instances (`pm2 scale unifyvault-web +4`)         |
| **Indexer Service** | 100 events/block | 1,000 events/block | Upgrade VPS CPU / memory allocation (4 vCPU $\rightarrow$ 8 vCPU) |
| **RPC Endpoints**   | 10,000 calls/min |  50,000 calls/min  | Enable Alchemy / Infura auto-scaling fallbacks                    |

---

## 6. Alert Thresholds & Monitoring Criteria

| Monitor Target                 |  Warning Threshold  | Critical Alert Threshold | Action Required                              |
| :----------------------------- | :-----------------: | :----------------------: | :------------------------------------------- |
| **Oracle Heartbeat Staleness** |  `> 43,200s` (12h)  |    `> 86,400s` (24h)     | Restart oracle keeper; verify RPC provider   |
| **Strategy Allocation Drift**  | `> 3.5%` (350 BPS)  |    `> 5.0%` (500 BPS)    | Trigger manual `StrategyManager.rebalance()` |
| **RPC Endpoint Errors**        | `> 5%` failure rate |   `> 15%` failure rate   | Switch RPC fallback provider in `.env`       |
| **PM2 Process Crash**          |      1 restart      |      `> 3` restarts      | Inspect crash stack trace in `pm2 logs`      |

---

## 7. Backup & Recovery Procedures

- **Contract State & Ledger Backup**: EVM state is immutable on Base blockchain. Off-chain indexer state (`public/indexer.json`) is backed up automatically every 6 hours to AWS S3.
- **Service Recovery**: In the event of server failure, execute full service recovery via PM2:
  ```bash
  cd /var/www/UnifyVault-UV && pm2 start ecosystem.config.js
  ```

---

## 8. Escalation Pathways & On-Call Matrix

|    Severity Level    |    Target Response SLA    | Primary Contact        | Secondary Contact | Escalation Channel          |
| :------------------: | :-----------------------: | :--------------------- | :---------------- | :-------------------------- |
| **SEV-1 (Critical)** | **Target SLA: < 15 Mins** | Lead Security Engineer | Protocol Lead     | PagerDuty / Emergency Phone |
|   **SEV-2 (High)**   | **Target SLA: < 1 Hour**  | DevOps Engineer        | Lead Developer    | Telegram Ops Channel        |
|  **SEV-3 (Medium)**  | **Target SLA: < 4 Hours** | Frontend Engineer      | Community Lead    | Discord Support             |
