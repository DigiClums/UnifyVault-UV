# UnifyVault V2 — Incident Response Plan & Operational Playbooks

> **Protocol Version**: 2.0.0-RC2  
> **Status**: RC2 Deliverable #9 — Submitted for Review  
> **Target Network**: Base Sepolia / Base Mainnet  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)  
> **Commit Hash**: `c144342`

---

## 1. Executive Summary

This Incident Response Plan establishes protocol escalation procedures, emergency pause criteria, communication guidelines, and step-by-step remediation playbooks for security incidents, oracle corruptions, infrastructure outages, and governance compromises.

---

## 2. Incident Severity Classification Matrix

|    Severity Level    | Definition                                                |    Target Response SLA     |    Pause Required?    | Primary Responder                 |
| :------------------: | :-------------------------------------------------------- | :------------------------: | :-------------------: | :-------------------------------- |
| **SEV-1 (Critical)** | Active exploit, funds at risk, critical oracle corruption | **Target SLA: < 15 Mins**  |        **YES**        | Lead Security Engineer & Guardian |
|   **SEV-2 (High)**   | Oracle feed frozen, keeper failure, RPC provider outage   |  **Target SLA: < 1 Hour**  | **NO** (Unless stale) | DevOps & Infrastructure Lead      |
|  **SEV-3 (Medium)**  | Non-critical UI state mismatch, minor latency             | **Target SLA: < 4 Hours**  |        **NO**         | Frontend Lead & Core Developer    |
|   **SEV-4 (Low)**    | Informational bug, minor telemetry display discrepancy    | **Target SLA: < 24 Hours** |        **NO**         | Core Developer                    |

---

## 3. Specialized Incident Playbooks

### Playbook 1: Oracle Failure & Price Feed Corruption

- **Trigger**: `OracleManager.isPriceFresh()` returns `false` or price feed returns $0$ / corrupted pricing.
- **Remediation Steps**:
  1. Verify oracle error via `cast call <ORACLE_MANAGER> "getPrice(bytes32)"`.
  2. If primary provider is frozen, configure fallback provider via `OracleManager.configureAsset(...)`.
  3. If both feeds are corrupted, invoke `UnifyVaultController.emergencyPause()` immediately via `GUARDIAN_ROLE`.
  4. Restore healthy feed configuration and execute `resume()` via `GOVERNANCE_ROLE`.

### Playbook 2: Governance Key Compromise

- **Trigger**: Suspicious transaction broadcast from an authorized governance admin address.
- **Remediation Steps**:
  1. Immediately invoke `UnifyVaultController.emergencyPause()` via `GUARDIAN_ROLE`.
  2. Execute emergency signer rotation: `grantRole(GOVERNANCE_ROLE, newSafePalWallet)` and `renounceRole(GOVERNANCE_ROLE, compromisedWallet)`.
  3. Verify role revocation on BaseScan explorer.
  4. Perform complete contract state audit before executing `resume()`.

### Playbook 3: RPC Outage & Network Connectivity Loss

- **Trigger**: Frontend error rate spikes > 15% due to RPC transport failures.
- **Remediation Steps**:
  1. Inspect primary RPC provider status (Alchemy / Infura).
  2. Update environment fallback RPC endpoint in `apps/web-v2/.env`.
  3. Restart Next.js web application cluster via `pm2 restart all`.

### Playbook 4: Unexpected Vault Accounting Anomaly

- **Trigger**: Discrepancy detected between `CustodyVault.totalAssets()` and `$uvBTCETH` share claims.
- **Remediation Steps**:
  1. Invoke `UnifyVaultController.emergencyPause()` via `GUARDIAN_ROLE`.
  2. Run empirical math audit script (`portfolioMath.test.ts`) against live contract state.
  3. Verify zero unauthorized withdrawals occurred.
  4. Identify root cause before resuming protocol operations.

### Playbook 5: Smart Contract Vulnerability / Active Exploit

- **Trigger**: Anomalous transaction sequence or unexpected collateral outflow.
- **Remediation Steps**:
  1. **EXECUTE EMERGENCY PAUSE IMMEDIATELY**: `cast send <CONTROLLER> "emergencyPause()"` via `GUARDIAN_ROLE`.
  2. Isolate compromised contract module or function vector.
  3. Develop, test, and audit contract patch script.
  4. Execute governance upgrade via `ProtocolDirectory.sol` module registry update.
  5. Perform complete post-fix invariant check and invoke `resume()`.

### Playbook 6: Frontend Outage

- **Trigger**: Web-V2 user interface inaccessible.
- **Remediation Steps**:
  1. Inspect PM2 web cluster status (`pm2 status 2-8`).
  2. Restart web cluster: `pm2 restart unifyvault-web`.
  3. Verify static page generation (`21/21 static pages`).

### Playbook 7: Indexer Failure

- **Trigger**: NAV history charts freeze on frontend.
- **Remediation Steps**:
  1. Inspect indexer logs: `tail -n 100 indexer.log`.
  2. Restart indexer process: `pm2 restart 1`.
  3. Restore latest indexer JSON snapshot from S3 if corrupted.

### Playbook 8: Keeper Failure & Rebalance Stoppage

- **Trigger**: Strategy allocation drift exceeds 5.0% and keeper fails to rebalance.
- **Remediation Steps**:
  1. Check keeper log: `tail -n 100 oracleKeeper.log`.
  2. Trigger manual rebalance via `cast send <STRATEGY_MANAGER> "rebalance()"`.
  3. Restart keeper process (`pm2 restart 0`).

---

## 4. Communication & Public Disclosure Plan

```
INCIDENT OCCURRENCE
   │
   ├─► 1. INTERNAL ESCALATION (< 15 mins)
   │      - Alert Core Team & Guardian via PagerDuty / Emergency Call
   │
   ├─► 2. PUBLIC STATUS ACKNOWLEDGEMENT (< 30 mins)
   │      - Post initial acknowledgement on Status Page & Official Twitter/Discord
   │      - Statement: "We are investigating a technical issue. Protocol is paused for safety."
   │
   ├─► 3. REGULAR STATUS UPDATES (Every 2 Hours)
   │      - Provide ongoing technical remediation progress
   │
   └─► 4. POST-MORTEM PUBLICATION (Within 72 Hours)
          - Publish comprehensive root cause analysis, timeline, and preventive actions
```

---

## 5. Recovery & Resumption Criteria

- **Pause Criteria**: Immediate pause required if user funds are at risk, oracle pricing is corrupted, or a contract vulnerability is suspected.
- **Resumption Criteria**: Protocol operations MAY ONLY be resumed via `GOVERNANCE_ROLE.resume()` when:
  1. Root cause is fully identified and remediated.
  2. All core invariants (`INV-001` to `INV-009`) are verified clean on-chain.
  3. Oracle price feeds report `isPriceFresh() == true`.
  4. Governance admin and guardian approvals are confirmed.
