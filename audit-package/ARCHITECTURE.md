# UnifyVault V2 — System Architecture & Trust Assumptions

## 1. System Overview

UnifyVault V2 is an immutable, non-custodial, non-proxy multi-asset index vault protocol. Users deposit underlying collateral assets (such as USDC, WETH, cbBTC) and receive `UVBTCETHToken` index shares representing proportional ownership of the vault portfolio.

```
                    ┌──────────────────────────────┐
                    │        User / Web3 UI        │
                    └──────────────┬───────────────┘
                                   │ deposit() / redeem()
                                   ▼
                    ┌──────────────────────────────┐
                    │    UnifyVaultController      │
                    └──────┬──────────────┬────────┘
                           │              │
             mint / burn   │              │ asset transfer
                           ▼              ▼
       ┌───────────────────────┐      ┌───────────────────────┐
       │     UVBTCETHToken     │      │     CustodyVault      │
       └───────────────────────┘      └───────────┬───────────┘
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │       Treasury        │
                                      └───────────────────────┘
```

---

## 2. On-Chain Module Interactions

All inter-contract lookups are dynamically resolved using `ProtocolDirectory`, preventing hardcoded cyclic dependencies while preserving non-proxy immutability:

- **`UnifyVaultController`**: Queries `OracleManager` for asset valuation, `FeeManager` for fee deductions, `CustodyVault` for asset balance updates, and `UVBTCETHToken` for share minting/burning.
- **`OracleManager`**: Aggregates prices from `ChainlinkOracleProvider` and secondary fallbacks. Enforces max deviation thresholds (5%) and stale price rejection (24h heartbeat).
- **`CustodyVault`**: Encapsulates collateral asset accounting. Only authorized contracts holding `CONTROLLER_ROLE` can transfer vault assets.
- **`Treasury`**: Receives minting and redemption fees directly from `UnifyVaultController`.

---

## 3. Trust Assumptions & Boundaries

1. **Non-Proxy Logic**: Smart contract code cannot be upgraded post-deployment. Zero proxy contracts are used.
2. **Chainlink Oracles**: Assumes Chainlink price feeds report accurate asset values within a 24-hour heartbeat window. If feeds report stale data, operations halt.
3. **Governance Timelock**: All administrative actions require a mandatory 48-hour delay (`TIMELOCK_DELAY = 2 days`) executed by `UnifyVaultTimelock`.
4. **Multisig Protection**: Safe Multisig requires 4 of 7 hardware key signers to schedule timelock proposals or execute emergency pauses.
5. **No Private Key Dependency**: Zero backend signers or off-chain private keys are required for core operations.

---

## 4. Invariants

- **Invariant 1 (Share Value Non-Zero)**: $\text{Total Assets} > 0 \iff \text{Total Shares} > 0$.
- **Invariant 2 (Zero Accounting Drift)**: $\text{Vault Balance} = \sum \text{User Accounted Balances} + \text{Treasury Fees}$.
- **Invariant 3 (Donation Immunity)**: Direct token transfers to `CustodyVault` do not inflate share minting for future depositors.
- **Invariant 4 (Fee Cap)**: Total deposit and redemption fees cannot exceed 100 bps (1.00%).
