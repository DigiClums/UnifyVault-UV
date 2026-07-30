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
├── packages/
│   ├── protocol/              # Solidity Smart Contracts & Foundry Workspaces
│   │   ├── src/               # Core smart contracts (Controller, Vault, Oracle, Strategy, etc.)
│   │   ├── test/              # Test suites
│   │   ├── script/            # Deployment & configuration scripts
│   │   └── foundry.toml       # Foundry configuration
│   └── frontend/              # Web application interface
```

---

## 🧪 Testing & Verification

The protocol maintains complete test coverage across unit, invariant, economic adversarial, and mainnet fork test suites.

```bash
cd packages/protocol
forge test
```

---

## 📄 License

[MIT](LICENSE)
