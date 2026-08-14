# Base Sepolia V2 Deployment Reconciliation & Audit Report

---

## 1. Audit Overview & Status Summary

| Audit Dimension                     |  Status  | Notes                                                                                                                       |
| :---------------------------------- | :------: | :-------------------------------------------------------------------------------------------------------------------------- |
| **Broadcast Artifact Alignment**    | **PASS** | `base_sepolia.json` (Chain ID `84532`) matches deployed contracts 100%.                                                     |
| **ProtocolDirectory Registration**  | **PASS** | All core protocol modules registered and verified in `ProtocolDirectory` (`0x8040006d6907a84911aaC0a9aC08278311B156e2`).    |
| **Frontend Constant Sync**          | **PASS** | Synced `DEPLOYED_CONTRACTS_SEPOLIA` in `apps/web-v2/constants/index.ts` with all V2 modules.                                |
| **CostBasisManager Hook Alignment** | **PASS** | `UVBEV2` attached to `CostBasisManagerV2` (`0x57869372AFbd7b61752f2f8d3e7F37701e28517B`) with pre-transfer accounting lock. |
| **P2P Escrow Isolation**            | **PASS** | `P2PEscrowV2` (`0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb`) registered as `isEscrow = true` in `CostBasisManagerV2`.       |
| **Timelock & RBAC Governance**      | **PASS** | 48-hour delay timelock controller (`0x9094145Cd2AEA2f309eDf14237444a07edF98d02`) initialized and linked.                    |

---

## 2. Canonical Deployment Matrix (Base Sepolia - Chain ID 84532)

| Contract Name                 | Module ID Key         | Canonical Deployed Address                   |    Status    |
| :---------------------------- | :-------------------- | :------------------------------------------- | :----------: |
| **`ProtocolDirectory`**       | —                     | `0x8040006d6907a84911aaC0a9aC08278311B156e2` | **VERIFIED** |
| **`Treasury`**                | `TREASURY`            | `0xB8c8113a042f39936dD966A5983fAaE2bF7b7290` | **VERIFIED** |
| **`FeeManager`**              | `FEE_MANAGER`         | `0x07f8BD7DAf5002C3C62B3c1280e9258AbBEfA2f1` | **VERIFIED** |
| **`CustodyVault`**            | `VAULT`               | `0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0` | **VERIFIED** |
| **`OracleManager`**           | `ORACLE`              | `0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF` | **VERIFIED** |
| **`ChainlinkOracleProvider`** | —                     | `0xCF46A80BbF2e92c16f7e1953F9AC73935340f69B` | **VERIFIED** |
| **`LiquidityManager`**        | `LIQUIDITY_MANAGER`   | `0xd1DCd311ACD1176E35823360652FCb356a7F227F` | **VERIFIED** |
| **`UVBEV2` (`UVBEToken`)**    | `TOKEN`               | `0x006c5DF13C716E5224b33956651C4356BB90DEc0` | **VERIFIED** |
| **`UnifyVaultController`**    | `DEPOSIT_MANAGER`     | `0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec` | **VERIFIED** |
| **`StrategyManager`**         | `STRATEGY_MANAGER`    | `0x73c894DEFBBd69F09134D53a73A0F6bfaeF5A7Bb` | **VERIFIED** |
| **`PortfolioManager`**        | `PORTFOLIO_MANAGER`   | `0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b` | **VERIFIED** |
| **`SwapAdapter`**             | `SWAP_ADAPTER`        | `0xbc97337dE85654aCD96182C93841f21168da65B4` | **VERIFIED** |
| **`CostBasisManagerV2`**      | `COST_BASIS_MANAGER`  | `0x57869372AFbd7b61752f2f8d3e7F37701e28517B` | **VERIFIED** |
| **`PerformanceManager`**      | `PERFORMANCE_MANAGER` | `0xF1670ca0054D649d1E3dd2f1d642Cc8Ed70109F6` | **VERIFIED** |
| **`P2PEscrowV2`**             | `P2P_ESCROW`          | `0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb` | **VERIFIED** |
| **`Marketplace`**             | —                     | `0x5978273B16467E99f45984Dc8AE9048ba05a30F7` | **VERIFIED** |
| **`UnifyVaultTimelock`**      | —                     | `0x9094145Cd2AEA2f309eDf14237444a07edF98d02` | **VERIFIED** |

---

## 3. Reconciliation Conclusion

$$\mathbf{AUDIT\ STATUS:\ PASS\ (100\%\ RECONCILED)}$$

All deployment configurations, smart contract module registrations, frontend constants, and documentation files are 100% synchronized against the canonical on-chain state.
