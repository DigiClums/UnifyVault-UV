# UnifyVault V2: Multi-Asset Index Protocol

UnifyVault V2 is a non-custodial, multi-asset crypto index vault protocol designed for EVM networks (Base Mainnet). It enables users to deposit collateral (such as USDC) to mint single-token index shares (`UVBTCETHToken`), representing proportional, asset-backed ownership of an underlying portfolio of strategy tokens (cbBTC and WETH).

---

## 🚀 Key Features & Highlights

- **Single-Token Index Vault**: Mint and redeem `UVBTCETH` index shares representing a 60% cbBTC / 40% WETH strategy portfolio.
- **Decoupled Architecture**: Modular design separating directory resolution (`ProtocolDirectory`), deposit/redeem orchestration (`UnifyVaultController`), custody (`CustodyVault`), treasury fee storage (`Treasury`), liquidity accounting (`LiquidityManager`), valuation (`PortfolioManager`), strategy governance (`StrategyManager`), DEX swaps (`SwapAdapter`), and oracle feeds (`OracleManager`).
- **Separation of Custody & Fee Revenue**: `CustodyVault` manages vault collateral; `Treasury` holds collected protocol fees (0.10% deposit / 0.10% redeem).
- **Liquidity Management**: `LiquidityManager` tracks operational (10% target, 5% refill threshold) and reserve (15% sweep threshold) accounting balances without automatic transfer risk.
- **Battle-Tested Security**: Enforces slippage protection (`minSharesOut`, `minAssetsOut`), deadline verification, pause states, reentrancy guards, stale oracle heartbeat validation, and zero controller balance invariants.

---

## 📁 Repository Structure

```
UnifyVault-UV/
├── docs/                      # Production Protocol & Security Documentation
│   ├── ARCHITECTURE.md        # Architecture overview, module breakdown & Mermaid call flow diagrams
│   ├── PROTOCOL.md            # Detailed protocol lifecycles, NAV math, fee structure & custody
│   ├── SECURITY.md            # Access control matrix, pause controls & emergency procedures
│   ├── THREAT_MODEL.md        # Attack surface analysis, threat vectors & mitigations
│   ├── OPERATIONS.md          # Operational manual, liquidity refill/sweep & monitoring
│   ├── DEPLOYMENT.md          # Deployment order, constructor parameters & verification
│   ├── TESTING.md             # Test layer summary (335 passing tests)
│   └── AUDIT_PREP.md          # Auditor preparation guide, scope & privilege map
│
├── packages/
│   ├── protocol/              # Solidity Smart Contracts & Foundry Workspaces
│   │   ├── src/               # Core smart contracts (Controller, Vault, Oracle, Strategy, etc.)
│   │   ├── test/              # 44 Test suites (335 tests: Unit, Invariants, Adversarial, Base Fork)
│   │   ├── script/            # Deployment & configuration scripts (Deploy.s.sol)
│   │   └── foundry.toml       # Foundry configuration
│   └── frontend/              # Web application interface
```

---

## 🧪 Testing & Verification

The protocol maintains a 100% test pass rate across unit, invariant, economic adversarial, and mainnet fork test suites.

```bash
cd packages/protocol
forge test
```

### Test Suite Summary

```
Ran 44 test suites in 2.22s (14.61s CPU time): 335 tests passed, 0 failed, 0 skipped (335 total tests)
```

- **30 Core Unit Suites (281 tests)**: Complete unit coverage of all contract methods and edge cases.
- **15 Protocol Invariants**: Verified across random fuzzing runs in `V2ProtocolInvariants.t.sol`.
- **13 Economic Adversarial Scenarios**: Validates protocol resilience against donation attacks, flash loan arbitrage, oracle manipulation, slippage, liquidity exhaustion, and dust rounding in `EconomicAdversarial.t.sol`.
- **10 Base Mainnet Fork Scenarios**: Validated against Base Mainnet contracts (USDC, cbBTC, WETH, Uniswap V3) in `BaseMainnetFork.t.sol`.

---

## 📖 Production Documentation Links

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Protocol Lifecycles & NAV Math](docs/PROTOCOL.md)
- [Security Model & Access Controls](docs/SECURITY.md)
- [Threat Model & Attack Vector Analysis](docs/THREAT_MODEL.md)
- [Operational Guide & Liquidity Procedures](docs/OPERATIONS.md)
- [Deployment & Setup Guide](docs/DEPLOYMENT.md)
- [Test Suite & Verification Report](docs/TESTING.md)
- [Auditor Preparation Guide](docs/AUDIT_PREP.md)

---

## 📄 License

[MIT](LICENSE)
