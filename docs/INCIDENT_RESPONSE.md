# 🚨 UnifyVault V2 — Emergency Incident Response Runbook

> **Target Network**: Base Mainnet (Chain ID `8453`)  
> **Classification**: Operational Security & Emergency Operations

---

## 1. Incident Severity Matrix

| Severity Level       | Definition / Scenario                                                   | Authorized Responders         | Primary Action                         | Target SLA   |
| :------------------- | :---------------------------------------------------------------------- | :---------------------------- | :------------------------------------- | :----------- |
| **SEV-1 (Critical)** | Active exploit, TVL loss, oracle corruption, or unauthorized withdrawal | Guardian, Governance Multisig | Trigger `emergencyPause()` immediately | < 5 minutes  |
| **SEV-2 (High)**     | Chainlink oracle staleness, RPC outage, keeper failure                  | Oracle Operator, Sentinel     | Switch oracle backup / restart keeper  | < 15 minutes |
| **SEV-3 (Medium)**   | UI indexing delay, front-end RPC throttling                             | DevOps Team                   | Reroute RPC endpoints                  | < 1 hour     |
| **SEV-4 (Low)**      | Minor cosmetic UI issue, telemetry mismatch                             | Core Engineering              | Standard patch release                 | Next Sprint  |

---

## 2. Emergency Response Workflows

### Phase 1: Rapid Emergency Pause (SEV-1 / SEV-2)

The `GUARDIAN_ROLE` hardware key or automated Sentinel can trigger emergency pause across protocol contracts without governance delay:

```bash
# Emergency Pause Controller via Sentinel Key
cast send <CONTROLLER_ADDRESS> "pause()" \
  --rpc-url https://mainnet.base.org \
  --private-key $GUARDIAN_PRIVATE_KEY
```

Impact of `pause()`:

- Disables all user deposits (`deposit()`).
- Disables share redemptions (`redeem()`).
- Prevents fee collection and strategy rebalancing.

---

### Phase 2: Vulnerability Triage & Safe Multisig Execution

1. Convene 3-of-5 Safe Multisig signers on Base Mainnet.
2. Analyze smart contract state using Foundry simulation:
   ```bash
   cast call <VAULT_ADDRESS> "totalAssetBalance(address)" <ASSET_ADDRESS> --rpc-url https://mainnet.base.org
   ```
3. Prepare governance proposal for asset sweep or parameter adjustment via Safe UI (`app.safe.global`).

---

### Phase 3: Unpausing Protocol Operations

Only `GOVERNANCE_ROLE` (3-of-5 Safe Multisig) can unpause the protocol once security is verified:

```bash
cast send <CONTROLLER_ADDRESS> "unpause()" \
  --rpc-url https://mainnet.base.org \
  --ledger
```

---

## 3. Contact & Escalation Roster

- **Security Ops Lead**: `security@unifyvault.io`
- **Guardian Sentinel Hotline**: `sentinel@unifyvault.io`
- **Safe Multisig Coordinator**: Keyholders 1 through 5
