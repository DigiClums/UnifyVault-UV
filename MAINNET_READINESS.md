# UnifyVault V2 — Base Mainnet Readiness Checklist

> **Protocol Version**: UnifyVault V2 Engine  
> **Target Deployment Chain**: Base Mainnet (Chain ID 8453)  
> **Testnet Validation**: Base Sepolia (Chain ID 84532)  
> **Date**: July 27, 2026  
> **Status**: READY FOR PRE-LAUNCH AUDIT & MAINNET PROVISIONING

---

## 1. Deployed Contract Suite & Verification Registry

### Base Sepolia Verified Deployments

| Module Name            | Contract Address                             | Admin / Governance | Status   |
| :--------------------- | :------------------------------------------- | :----------------- | :------- |
| `ProtocolDirectory`    | `0xB5dd6d766867cB4c299AD2711068455C718EDDbc` | `0xB145AC...59Da`  | Verified |
| `UnifyVaultController` | `0x7EF5D93f83995228efFc63dbe513367a719f0633` | `0xB145AC...59Da`  | Verified |
| `CustodyVault`         | `0x54696d5d00b58F27F9d8C358560ff2a7d10d409e` | `0xB145AC...59Da`  | Verified |
| `Treasury`             | `0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D` | `0xB145AC...59Da`  | Verified |
| `OracleManager`        | `0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635` | `0xB145AC...59Da`  | Verified |
| `UVBTCETHToken`        | `0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4` | `0xB145AC...59Da`  | Verified |
| `CostBasisManager`     | `0xef0637A3D2080749BbcD5D98e6C68D9944C700A6` | `0xB145AC...59Da`  | Verified |
| `USDC` (Testnet)       | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Mintable ERC-20    | Verified |
| `WBTC` (Testnet)       | `0xc83D0A904E1103d8144E9DF93cdb5bC05f7cdee6` | Mintable ERC-20    | Verified |
| `WETH` (Testnet)       | `0xEEAa69Db6046f026d88004d0D6946518071bA15c` | Mintable ERC-20    | Verified |

---

## 2. Base Mainnet Target Token & Feed Mappings

| Asset     | Base Mainnet Address                         | Chainlink Oracle Feed (Base Mainnet)         | Heartbeat |
| :-------- | :------------------------------------------- | :------------------------------------------- | :-------- |
| **USDC**  | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `0x7e860098F58bBFC8648a4311b374B1D669a2bc6B` | 86,400s   |
| **cbBTC** | `0xc1C47053535975d27170a4B716A54013444A002e` | `0x07421888e5d2631557551062086f78f8982a8e80` | 3,600s    |
| **WETH**  | `0x4200000000000000000000000000000000000006` | `0x71041dddad3595F9CE3270B0104d3790996d6654` | 1,200s    |

---

## 3. Mainnet Pre-Flight Security & Governance Checklist

- [x] **Smart Contracts Feature Complete**: 100% deposit, redeem, oracle, cost basis, and treasury logic tested.
- [x] **Automated Test Suite**: 416 tests passing in Foundry (0 failures).
- [x] **Slither Static Analysis**: 0 critical vulnerabilities.
- [x] **Frontend Pure Data**: Zero mock/fake data; 100% on-chain contract state.
- [x] **PM2 Keeper Service**: Live Coinbase spot price oracle keeper running on 15s loop.
- [x] **PM2 Event Indexer**: Live block indexer scanning Base Sepolia.
- [ ] **Gnosis Safe Multisig**: Transfer `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE` to 3-of-5 Safe on Base Mainnet.
- [ ] **Timelock Controller**: Connect 48-hour Timelock for fee parameter updates.
- [ ] **Mainnet Chainlink Feeds**: Replace mock aggregators with canonical Chainlink Base Mainnet aggregators.

---

## 4. Mainnet Deployment Order

1. Deploy `ProtocolDirectory` and grant deployer initial setup role.
2. Deploy `CustodyVault`, `Treasury`, `OracleManager`, `CostBasisManager`, `PortfolioManager`, `StrategyManager`, and `UVBTCETHToken`.
3. Register all module addresses in `ProtocolDirectory`.
4. Configure Chainlink mainnet aggregators for cbBTC/USD, ETH/USD, and USDC/USD in `OracleManager`.
5. Deploy `UnifyVaultController` and link to `ProtocolDirectory`.
6. Transfer `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE` from deployer to Gnosis Safe Multisig.
7. Verify all contracts on BaseScan.

---

## 5. Rollback Strategy

If an unexpected condition occurs during mainnet setup:

1. Invoke `UnifyVaultController.emergencyPause()`.
2. Revoke active roles on `UnifyVaultController`.
3. Redeem or sweep custodied assets back to depositors via `CustodyVault` governance override.

---

## 6. Related Launch Documentation & Policies

For executive reports, sign-off status, code freeze policies, and security policies, refer to:

- [LAUNCH_READINESS_REPORT.md](file:///var/www/UnifyVault-UV/docs/LAUNCH_READINESS_REPORT.md) — Executive launch report & readiness status
- [CODE_FREEZE_POLICY.md](file:///var/www/UnifyVault-UV/docs/CODE_FREEZE_POLICY.md) — Mainnet Code Freeze allowed/prohibited scope rules
- [RELEASE_SIGNOFF.md](file:///var/www/UnifyVault-UV/docs/RELEASE_SIGNOFF.md) — Multi-domain release approval sign-off table
- [SECURITY.md](file:///var/www/UnifyVault-UV/SECURITY.md) — Responsible disclosure policy & bug bounty contacts
