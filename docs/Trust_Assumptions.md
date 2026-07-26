# UnifyVault v2.2.0 — Trust Assumptions & Privilege Scope

## 1. System Administrative Roles

The protocol relies on administrative governance (`DEFAULT_ADMIN_ROLE`) to configure system parameters and module registry addresses.

### Assumptions:

1. **Multisig Governance**: Production deployment mandates that `DEFAULT_ADMIN_ROLE` is held by a multi-signature wallet (e.g. 3-of-5 Safe) or a timelock governance contract.
2. **Oracle Reliability**: Chainlink node operators provide tamper-resistant price data within configured heartbeat parameters.
3. **DEX Router Integrity**: Bounded slippage checks in `SwapAdapter` protect swaps against sandwiching on external liquidity venues (Uniswap V3).

---

## 2. Immutability & Upgradeability

- Protocol core logic contracts are non-upgradeable by direct proxy modification, but modular references in `ProtocolDirectory` can be updated by governance to point to upgraded implementations.
- Module updates emit transparent on-chain events (`ModuleUpdated`).
