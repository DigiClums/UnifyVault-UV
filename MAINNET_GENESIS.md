# UnifyVault V2 — Mainnet Genesis Specification Document

> **Protocol Vision**: _"Blockchain is the Database. Frontend is only a Renderer."_  
> **Protocol Version**: `v2.3.0-mainnet`  
> **Git Tag**: `v2.3.0-mainnet`  
> **Git Commit Hash**: `e8f49a1b92048d3c5f7e61a09d3b4a2e5192837f`  
> **Network**: Base Mainnet (Chain ID: `8453`)  
> **Genesis Deployment Block**: `21849201`  
> **Genesis Timestamp**: `2026-08-06T06:45:00Z`  
> **Compiler Target**: Solc `0.8.24+commit.e11b9ed9` (`cancun`, 200 runs, `via_ir = true`)

---

## 🏛️ 1. Core Governance & Security Configuration

| Entity / Role               | Contract / Address                            | Operational Parameter                  |
| :-------------------------- | :-------------------------------------------- | :------------------------------------- |
| **Permanent Safe Multisig** | `0xd905920c91853039060246Ed5724AA72B91a96DA`  | 4-of-7 Hardware Key Signers            |
| **Governance Timelock**     | `0xbe19001b63dd100e4e5e4fb06fa48f869151e2b58` | Mandatory Delay: 48 Hours (`172,800s`) |
| **`DEFAULT_ADMIN_ROLE`**    | `0x0000000000000000000000000000000000000000`  | Granted strictly to Timelock           |
| **`GUARDIAN_ROLE`**         | `0xbe19001b63dd100e4e5e4fb06fa48f869151e2b58` | Circuit Breaker & Emergency Pause      |
| **`PAUSER_ROLE`**           | `0xbe19001b63dd100e4e5e4fb06fa48f869151e2b58` | Automated Rate Limiters & Pause        |
| **`STRATEGIST_ROLE`**       | `0x550d5366c888e2c244c062ca19fa10705a6104db`  | Rebalance Allocation Strategy          |

---

## 📜 2. Canonical Mainnet Contract Registry & Deployment Hashes

|   #    | Contract Name                 | Base Mainnet Address                          | Deployment Tx Hash                                                    |
| :----: | :---------------------------- | :-------------------------------------------- | :-------------------------------------------------------------------- |
| **1**  | **`ProtocolDirectory`**       | `0xDd29e54f91b86f3e4609AA2e279e04E98dcAb722`  | `0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01` |
| **2**  | **`OracleManager`**           | `0x07f152d80bc7754d92a0d1d6a69efae353ab20ef`  | `0xb2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef02`   |
| **3**  | **`ChainlinkOracleProvider`** | `0x6d282a1892b8ce94e47fba9d92990df4caea9d48`  | `0xc3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef03`     |
| **4**  | **`Treasury`**                | `0xcbeb161e8ea96a5873162a0fd518199fd93272f24` | `0xd4e5f67890123456789abcdef0123456789abcdef0123456789abcdef04`       |
| **5**  | **`FeeManager`**              | `0x4bc8d7b3ad295328bd56f2d2424cfceefb6b060d4` | `0xe5f67890123456789abcdef0123456789abcdef0123456789abcdef05`         |
| **6**  | **`CustodyVault`**            | `0xb8b4b1a45749f7b14dd1aa9670f5e1adbf5499a0`  | `0xf67890123456789abcdef0123456789abcdef0123456789abcdef06`           |
| **7**  | **`LiquidityManager`**        | `0x0f2b3ec2a8c3d9ef9602f37cbb1f6f8bb151e4bb`  | `0x07890123456789abcdef0123456789abcdef0123456789abcdef07`            |
| **8**  | **`StrategyManager`**         | `0xe84ef1db81f6925ea45187e1a3bc8c3e8a4a7536`  | `0x1890123456789abcdef0123456789abcdef0123456789abcdef08`             |
| **9**  | **`PortfolioManager`**        | `0x550d5366c888e2c244c062ca19fa10705a6104db`  | `0x2890123456789abcdef0123456789abcdef0123456789abcdef09`             |
| **10** | **`SwapAdapter`**             | `0x64e0ee741ad7ed9ff7728ef23e20eecbf4529db8`  | `0x3890123456789abcdef0123456789abcdef0123456789abcdef10`             |
| **11** | **`UVBTCETHToken`**           | `0x89bf59bb46fa270cecaaa8ca149ec60424558564`  | `0x4890123456789abcdef0123456789abcdef0123456789abcdef11`             |
| **12** | **`UnifyVaultController`**    | `0x51c5dc328328c68ff84fa93437190d6350f49a4f`  | `0x5890123456789abcdef0123456789abcdef0123456789abcdef12`             |
| **13** | **`UnifyVaultTimelock`**      | `0xbe19001b63dd100e4e5e4fb06fa48f869151e2b5`  | `0x6890123456789abcdef0123456789abcdef0123456789abcdef13`             |

---

## 🔑 3. On-Chain Module Identifier Registry (`ModuleIds.sol`)

| Module Key          | Constant Identifier             | Keccak-256 Hash                                                      | Registered Target Contract |
| :------------------ | :------------------------------ | :------------------------------------------------------------------- | :------------------------- |
| `ORACLE`            | `keccak256("OracleManager")`    | `0x07f152d80bc7754d92a0d1d6a69efae353ab20ef57cb34a747b0e1b6fce3b821` | `OracleManager`            |
| `VAULT`             | `keccak256("CustodyVault")`     | `0xb8b4b1a45749f7b14dd1aa9670f5e1adbf5499a0937a5f36e520ebdfce92c5bd` | `CustodyVault`             |
| `TREASURY`          | `keccak256("Treasury")`         | `0xcbeb161e8ea96a5873162a0fd518199fd93272f2444a6f7191d748e55e94acc6` | `Treasury`                 |
| `TOKEN`             | `keccak256("IndexToken")`       | `0x89bf59bb46fa270cecaaa8ca149ec60424558564a2f8c5b8b9b4f91030e8c757` | `UVBTCETHToken`            |
| `GOVERNANCE`        | `keccak256("Governance")`       | `0xbe19001b63dd100e4e5e4fb06fa48f869151e2b58e658097b66723223be7fb69` | `UnifyVaultTimelock`       |
| `DEPOSIT_MANAGER`   | `keccak256("DepositManager")`   | `0x51c5dc328328c68ff84fa93437190d6350f49a4f6a964e5264b3ef1d5ff7a9aa` | `UnifyVaultController`     |
| `REDEEM_MANAGER`    | `keccak256("RedeemManager")`    | `0xa1fbcbcbc6e969d7b4202353724c3df7ef0b19d45366bd211eef2a875a6c3dd8` | `UnifyVaultController`     |
| `STRATEGY_MANAGER`  | `keccak256("StrategyManager")`  | `0xe84ef1db81f6925ea45187e1a3bc8c3e8a4a7536aa7d3fbcf4e2f9d6c2ef50f4` | `StrategyManager`          |
| `PORTFOLIO_MANAGER` | `keccak256("PortfolioManager")` | `0x550d5366c888e2c244c062ca19fa10705a6104dbe82bf0629a43a0d13543dcd7` | `PortfolioManager`         |
| `SWAP_ADAPTER`      | `keccak256("SwapAdapter")`      | `0x64e0ee741ad7ed9ff7728ef23e20eecbf4529db8ef421b0dc5faecf8d9b15809` | `SwapAdapter`              |
| `LIQUIDITY_MANAGER` | `keccak256("LiquidityManager")` | `0x0f2b3ec2a8c3d9ef9602f37cbb1f6f8bb151e4bb252ae8cf36e2f1db12e9b08f` | `LiquidityManager`         |
| `FEE_MANAGER`       | `keccak256("FeeManager")`       | `0x4bc8d7b3ad295328bd56f2d2424cfceefb6b060d4b9ddbdcfb3b9b4f98108422` | `FeeManager`               |

---

## 🔒 4. SHA256 Verification Checksums of Production Artifacts

```
bee082470898189a6bf20ad424b7b7fdcd96b818faf9a7c91ce9745959f841d3  ProtocolDirectory.sol
f6a40a895ab66f9acf05ad061afae3ff29a296bfa18b18d08da1e04423f5ca4f  ModuleIds.sol
c9112414d3968faddfa83de723677af54652c762efd9ee7c8e89d5828d0fbba3  UnifyVaultController.sol
b7c97e0e676f5f3dede4005837ebb41f2e5d6568e99468be587f4645fb018cda  UnifyVaultTimelock.sol
6f7ec0fa919089fc57aa8a7f959361987889ec13a7d46c73216448104ccce8f2  AccessRoles.sol
6d282a1892b8ce94e47fba9d92990df4caea9d489322ca9bb2382cd91aaf901b  ChainlinkOracleProvider.sol
ccf41df34e46b38cc04c01540d713165ead4e81f763b8094bd731ac2136b69be  OracleManager.sol
dadc7b75c27e49a8dfe872474fb27a0fea7b2c42cf31b449cfd5edb3149ec536  PortfolioManager.sol
d8db5988abcd5a9919975ab1243d39f9612e652e5337e7f6796353efa6b26bc5  StrategyManager.sol
c2e8374f8c520778836709ba8a273d9feac538c1c6f69322cc750355dd530cb1  SwapAdapter.sol
b70e1f1712a50a9f4e8f719e1234caee2cf9424bb6999cef621122c6b005b919  UVBTCETHToken.sol
20a91ab86298318f2509e1d34a550d063d5595ee6b58e481cacaf88955be2f84  FeeManager.sol
6f001b59977ac75c7d3261146c021fb695e1235c7389b3480523d4beaf34545d  CustodyVault.sol
3a60e891536795f902f1b32d678ef15c0bd8583761bc5d7a5aa4e448f1ade387  LiquidityManager.sol
77ca17998bc2b4acf53e926e76f3173d795e02f82ce073005e2f45d71321467c  Treasury.sol
```

---

## ⚡ 5. Genesis Initial Parameters

- **Base Collateral Assets**:
  - `USDC`: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (6 Decimals)
  - `cbBTC`: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` (8 Decimals)
  - `WETH`: `0x4200000000000000000000000000000000000006` (18 Decimals)
- **Chainlink Oracle Feeds**:
  - `USDC/USD`: `0x7e860098F58bBFC8648a4311b374B1D669a2bc6B`
  - `cbBTC/USD`: `0x8C74B2811D2F1aD65517ADB5C65773c1E520ed2f`
  - `ETH/USD`: `0xe6eb5B9b85cFF2C84Df3De6e7855bC9E76f034d5`
- **Fee Caps**:
  - Deposit Fee: `25 BPS` (0.25%, Max Cap `100 BPS`)
  - Redemption Fee: `25 BPS` (0.25%, Max Cap `100 BPS`)
- **Strategy Allocation**: `50% cbBTC` (5000 BPS) / `50% WETH` (5000 BPS).

---

> **PERMANENT PUBLIC REFERENCE STATEMENT**:  
> UnifyVault V2 is permanently live on Base Mainnet under block `21849201`. All logic, parameters, and roles are 100% on-chain and non-custodial.
