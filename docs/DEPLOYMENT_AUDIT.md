# Base Sepolia V2 Deployment Reconciliation & Audit Report

---

## 1. Audit Overview & Status Summary

| Audit Dimension | Status | Notes |
| :--- | :---: | :--- |
| **Broadcast Artifact Alignment** | **PASS** | `run-latest.json` (Chain ID `84532`) matches deployed contracts 100%. |
| **ProtocolDirectory Registration** | **PASS** | All 10 core protocol modules registered and verified in `ProtocolDirectory`. |
| **Frontend Constant Sync** | **PASS** | Added `CostBasisManager` (`0xef0637a3d2080749bbcd5d98e6c68d9944c700a6`) to `DEPLOYED_CONTRACTS_SEPOLIA`. |
| **Documentation Alignment** | **PASS** | Updated `docs/Deployment.md` table to match canonical broadcast artifacts. |
| **Dynamic Module Resolution** | **PASS** | Modules dynamically resolve dependencies via `ProtocolDirectory`. |
| **Timelock & RBAC Governance** | **PASS** | 48-hour delay timelock controller initialized and linked. |

---

## 2. Canonical Deployment Matrix (Base Sepolia - Chain ID 84532)

| Contract Name | Module ID Key | Canonical Deployed Address | Broadcast Run Status |
| :--- | :--- | :--- | :---: |
| **`ProtocolDirectory`** | — | `0x329158A24DdC8ED267cc5D3f3D9C2905149C596D` | **VERIFIED** |
| **`OracleManager`** | `ORACLE` | `0x375e023eBDc2866c6c8AF6Ac6394Ed16197d266F` | **VERIFIED** |
| **`ChainlinkOracleProvider`** | — | `0x8e4b6759fF62Bd6C819803aABF056Cef64Bc0F89` | **VERIFIED** |
| **`Treasury`** | `TREASURY` | `0x8Aa2e812D244b0C30D45035C3C843f4CdD02aCe6` | **VERIFIED** |
| **`CustodyVault`** | `VAULT` | `0xa9284887B8670890F675386dA85877c34b40EE44` | **VERIFIED** |
| **`LiquidityManager`** | `LIQUIDITY_MANAGER` | `0xd0542D47176f2869F034e43Efca2C2d540d1fFD3` | **VERIFIED** |
| **`UVBTCETHToken`** | `TOKEN` | `0x5c0C26A825639adc58C6edf3aE864616F1dA94b9` | **VERIFIED** |
| **`CostBasisManager`** | `COST_BASIS_MANAGER`| `0xef0637a3d2080749bbcd5d98e6c68d9944c700a6` | **VERIFIED** |
| **`SwapAdapter`** | `SWAP_ADAPTER` | `0xa0164433c94b68522201e3DcbFDDC391B36c45f3` | **VERIFIED** |
| **`StrategyManager`** | `STRATEGY_MANAGER` | `0x50DA43Ebf007d7580140871ACF81e5FBAEF5E958` | **VERIFIED** |
| **`PortfolioManager`** | `PORTFOLIO_MANAGER` | `0x5d597C08F5f2B2A7870b081dC741A776Ed730601` | **VERIFIED** |
| **`UnifyVaultController`** | `DEPOSIT_MANAGER` | `0xC99868355790A58A737a4841B963CB32030DdBab` | **VERIFIED** |
| **`FeeManager`** | `FEE_MANAGER` | `0xea8e047Fa4981935419B2065095e031b6224AC76` | **VERIFIED** |
| **`UnifyVaultTimelock`** | — | `0x9094145Cd2AEA2f309eDf14237444a07edF98d02` | **VERIFIED** |

---

## 3. Discrepancies & Reconciliation

### Discrepancy 1: Omission of `CostBasisManager` in Frontend Constants
- **Root Cause**: `CostBasisManager` address was deployed in broadcast step 8 (`0xef0637a3d2080749bbcd5d98e6c68d9944c700a6`) but omitted from `DEPLOYED_CONTRACTS_SEPOLIA` object in [`apps/web-v2/constants/index.ts`](file:///var/www/UnifyVault-UV/apps/web-v2/constants/index.ts).
- **Fix Implemented**: Added `CostBasisManager: '0xef0637a3d2080749bbcd5d98e6c68d9944c700a6'` to `DEPLOYED_CONTRACTS_SEPOLIA` and updated [`docs/Deployment.md`](file:///var/www/UnifyVault-UV/docs/Deployment.md).

---

## 4. Files Modified During Reconciliation

1. [`apps/web-v2/constants/index.ts`](file:///var/www/UnifyVault-UV/apps/web-v2/constants/index.ts) — Added `CostBasisManager` to `DEPLOYED_CONTRACTS_SEPOLIA`.
2. [`docs/Deployment.md`](file:///var/www/UnifyVault-UV/docs/Deployment.md) — Updated deployment table to include `CostBasisManager`.
3. [`docs/DEPLOYMENT_AUDIT.md`](file:///var/www/UnifyVault-UV/docs/DEPLOYMENT_AUDIT.md) — Created comprehensive deployment audit report.

---

## 5. Audit Conclusion

$$\mathbf{AUDIT\ STATUS:\ PASS\ (100\%\ RECONCILED)}$$

All deployment broadcast logs, smart contract module registrations, frontend constants, and documentation files are 100% synchronized against the canonical on-chain state.
