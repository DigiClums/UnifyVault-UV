# UnifyVault Constitution & Governance Charter

## 1. Timelock Enforcement

- All administrative parameter changes, module address updates, or oracle feed registrations must be queued through `UnifyVaultTimelock`.
- Mandatory delay: **48 Hours (172,800 Seconds)**. Zero exceptions.

## 2. Emergency Pause Guidelines

- `GUARDIAN_ROLE` and `PAUSER_ROLE` are granted exclusively to the Security Multisig and automated circuit breakers.
- Emergency pause halts deposits and redemptions immediately to protect user funds during market anomalies or oracle failures.
- Unpausing requires explicit action by `UnifyVaultTimelock` or authorized Governance Multisig.

## 3. Role Allocation Boundaries

- `DEFAULT_ADMIN_ROLE`: Held strictly by `UnifyVaultTimelock`.
- `CONTROLLER_ROLE`: Assigned to `UnifyVaultController`.
- `STRATEGIST_ROLE`: Assigned to Strategy Multisig for portfolio rebalances.
- `BOT_ROLE`: Assigned to automated maintenance scripts.

## 4. Parameter Boundaries

- Max Deposit Fee: **100 bps (1.00%)**
- Max Redemption Fee: **100 bps (1.00%)**
- Max Oracle Deviation: **500 bps (5.00%)**
- Max Oracle Heartbeat: **86,400 seconds (24 Hours)**
