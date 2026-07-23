# UnifyVault V2 Protocol Smart Contracts (`@unifyvault/protocol`)

Production smart contract suite, deployment scripts, invariant suites, economic adversarial tests, and mainnet fork validation for **UnifyVault V2**, built with the Foundry toolchain for EVM deployment (Base Mainnet).

---

## 🏗️ Architecture Overview

UnifyVault V2 is a non-custodial, multi-asset crypto index vault protocol. Users deposit collateral (USDC) to mint single-token index shares (`UVBTCETHToken`), representing proportional ownership of underlying strategy assets (cbBTC, WETH).

```
┌─────────────────────────────────────────────────────────────────┐
│                       ProtocolDirectory                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
    ┌───────────────────┬────────┴──────────┬───────────────────┐
    │                   │                   │                   │
    ▼                   ▼                   ▼                   ▼
┌──────────────┐ ┌──────────────┐   ┌──────────────┐    ┌──────────────┐
│  Controller  │ │ CustodyVault │   │ LiquidityMgr │    │   Treasury   │
└───────┬──────┘ └──────────────┘   └──────────────┘    └──────────────┘
        │
        ├─────────────────────────┐
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│ PortfolioMgr │         │ SwapAdapter  │
└───────┬──────┘         └──────────────┘
        │
        ▼
┌──────────────┐
│ StrategyMgr  │
└──────────────┘
```

---

## 🛠️ Core Module Registry

1. **`ProtocolDirectory`**: Central module registry discovering `DEPOSIT_MANAGER`, `VAULT`, `TREASURY`, `ORACLE`, `TOKEN`, `PORTFOLIO_MANAGER`, `STRATEGY_MANAGER`, `SWAP_ADAPTER`, `LIQUIDITY_MANAGER`.
2. **`UnifyVaultController`**: Entry point orchestrating atomic deposits, DEX swaps, redemptions, fee collection, and zero residual balance assertions.
3. **`CustodyVault`**: Passive storage vault managing physical ERC20 custody balances and accounted balances.
4. **`LiquidityManager`**: Operational (10% target, 5% refill) and reserve (15% sweep) liquidity accounting module.
5. **`Treasury`**: Protocol fee collection vault.
6. **`PortfolioManager`**: Portfolio valuation and NAV calculation engine.
7. **`StrategyManager`**: Allocation strategy manager enforcing 10,000 BPS total weight allocation.
8. **`SwapAdapter`**: Atomic DEX swap router adapter (Uniswap V3 Router).
9. **`OracleManager`**: Price feed aggregator with stale price and heartbeat checks.
10. **`UVBTCETHToken`**: ERC20 index shares token.

---

## 🧪 Testing & Verification

```bash
Ran 44 test suites in 2.22s (14.61s CPU time): 335 tests passed, 0 failed, 0 skipped (335 total tests)
```

- **Unit Tests**: 30 suites / 281 tests covering all component states.
- **Invariant Tests**: 15 global protocol invariants verified across fuzzing runs.
- **Economic Adversarial Suite**: 13 hostile scenarios (Donation Attacks, Flash Loans, Oracle Manipulation, Slippage, Liquidity Exhaustion, Dust Rounding).
- **Base Mainnet Fork Validation**: 10 real integration tests on Base Mainnet contract specifications.

---

## 📚 Complete Production Documentation

- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md): Module breakdown, dependency graph, call flow diagrams.
- [PROTOCOL.md](../../docs/PROTOCOL.md): Deposit/redeem lifecycles, NAV math, fee structure, strategy weights.
- [SECURITY.md](../../docs/SECURITY.md): Access control matrix, pause controls, reentrancy guards, oracle security.
- [THREAT_MODEL.md](../../docs/THREAT_MODEL.md): Threat analysis, attack vectors, mitigations, trust assumptions.
- [OPERATIONS.md](../../docs/OPERATIONS.md): Operational guide, liquidity refill/sweep, pause procedures.
- [DEPLOYMENT.md](../../docs/DEPLOYMENT.md): Deployment order, constructor params, verification, role grants.
- [TESTING.md](../../docs/TESTING.md): Test layer breakdown and verification commands.
- [AUDIT_PREP.md](../../docs/AUDIT_PREP.md): Auditor guide, scope, privilege map, review priorities.
