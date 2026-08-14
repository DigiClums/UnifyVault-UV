# Frontend Contract Alignment Report (Base Sepolia V2 Production)

**Status:** ALL CHECKS PASSED  
**Execution Mode:** Read-Only Verification & Alignment (Zero Smart Contract State Mutations / Zero Deployments)  
**Target:** `apps/web-v2` & Monorepo Integration

---

## 1. Executive Summary

A comprehensive frontend contract alignment was conducted for `apps/web-v2` against canonical Base Sepolia V2 production contracts (`packages/protocol/script/mainnet/config/base_sepolia.json` and broadcast deployment manifests `DeployFreshBaseSepolia.s.sol`, `DeployMarketplace.s.sol`, and `DeployAAAndExecuteLiveVerification.s.sol`).

All obsolete V1, legacy test, and unhardened contract references have been eradicated. `apps/web-v2/constants/index.ts` serves as the single source of truth for contract addresses, consumed uniformly across hooks, UI components, API routes, wallet/smart account integration, P2P/Marketplace engines, and transaction explorers.

All regression test suites, typechecks, Next.js production builds, and full monorepo verification suites (`pnpm test:all`) pass with 100% success.

---

## 2. Canonical Base Sepolia Contract Address Matrix

Every contract address in `apps/web-v2` was verified against on-chain bytecode, protocol directory module IDs, and deployment receipts:

| Module / Contract             | Canonical Base Sepolia V2 Address            | Module ID / Protocol Key          | Frontend Status      | On-Chain Verification                                     |
| ----------------------------- | -------------------------------------------- | --------------------------------- | -------------------- | --------------------------------------------------------- |
| **ProtocolDirectory**         | `0x8040006d6907a84911aaC0a9aC08278311B156e2` | Core Registry Entrypoint          | **Canonical Source** | Verified (`DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory`) |
| **Treasury**                  | `0xB8c8113a042f39936dD966A5983fAaE2bF7b7290` | `keccak256("Treasury")`           | **Aligned**          | Verified (Multi-asset revenue & gas vaults)               |
| **FeeManager**                | `0x07f8BD7DAf5002C3C62B3c1280e9258AbBEfA2f1` | `keccak256("FeeManager")`         | **Aligned**          | Verified (Deposit 25 bps, Redeem 200 bps)                 |
| **CustodyVault**              | `0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0` | `keccak256("CustodyVault")`       | **Aligned**          | Verified (USDC, cbBTC, WETH reserve vaults)               |
| **OracleManager**             | `0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF` | `keccak256("OracleManager")`      | **Aligned**          | Verified (Aggregated feed router)                         |
| **ChainlinkOracleProvider**   | `0xCF46A80BbF2e92c16f7e1953F9AC73935340f69B` | Oracle Provider Target            | **Aligned**          | Verified (cbBTC, WETH, USDC feeds)                        |
| **LiquidityManager**          | `0xd1DCd311ACD1176E35823360652FCb356a7F227F` | `keccak256("LiquidityManager")`   | **Aligned**          | Verified (Buffer management & rebalancing)                |
| **UVBEV2 (UVBEToken)**        | `0x006c5DF13C716E5224b33956651C4356BB90DEc0` | `keccak256("IndexToken")`         | **Canonical Token**  | Verified (18 decimals, canonical token)                   |
| **UnifyVaultController**      | `0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec` | `keccak256("DepositManager")`     | **Aligned**          | Verified (Atomic deposits & redemptions)                  |
| **StrategyManager**           | `0x73c894DEFBBd69F09134D53a73A0F6bfaeF5A7Bb` | `keccak256("StrategyManager")`    | **Aligned**          | Verified (Target allocation weights)                      |
| **PortfolioManager**          | `0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b` | `keccak256("PortfolioManager")`   | **Aligned**          | Verified (Real-time NAV & pricing)                        |
| **SwapAdapter**               | `0xbc97337dE85654aCD96182C93841f21168da65B4` | `keccak256("SwapAdapter")`        | **Aligned**          | Verified (DEX routing & slippage bounds)                  |
| **CostBasisManagerV2**        | `0x57869372AFbd7b61752f2f8d3e7F37701e28517B` | `keccak256("CostBasisManager")`   | **Aligned**          | Verified (User P&L, basis preservation)                   |
| **PerformanceManager**        | `0xF1670ca0054D649d1E3dd2f1d642Cc8Ed70109F6` | `keccak256("PerformanceManager")` | **Aligned**          | Verified (Holding period ROI & profits)                   |
| **P2PEscrowV2**               | `0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb` | `keccak256("P2PEscrow")`          | **Aligned**          | Verified (100 bps / 1% protocol fee)                      |
| **Marketplace**               | `0xe908377f96F313a6b7771570ff6Fb414D38F451A` | Orderbook & Matching Engine       | **Aligned**          | Verified (Wired to P2PEscrowV2)                           |
| **Paymaster (Hardened)**      | `0x42c6342516714CFd64474bd41Ce360605b9fEA88` | ERC-4337 Verifying Paymaster      | **Aligned**          | Verified (Signature-verified gas sponsorship)             |
| **GasTreasury**               | `0xd4b19a48c270b720feeed57ccab5aa4ecfcc1fd9` | Automated Paymaster Refill Vault  | **Aligned**          | Verified (Rate-limited refill protection)                 |
| **Canonical EntryPoint v0.7** | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | Canonical ERC-4337 v0.7           | **Aligned**          | Verified (Permissionless UserOp settlement)               |
| **Protocol Admin / Guardian** | `0xd905920c91853039060246Ed5724AA72B91a96DA` | Governance / Admin Multisig       | **Aligned**          | Verified (Authority validation)                           |

### Collateral & Strategy Assets (Base Sepolia)

- **USDC:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (6 decimals)
- **cbBTC:** `0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29` (8 decimals)
- **WETH:** `0xd116ab1c943cf15904eC4c8dd701086f175FA323` (18 decimals)

---

## 3. Old -> New Address Replacement Audit

All legacy and obsolete references identified during static analysis were replaced or purged:

| Target Component                                                   | Obsolete Address Found                       | Role / Description      | Replacement / Action Taken                                            | Status |
| ------------------------------------------------------------------ | -------------------------------------------- | ----------------------- | --------------------------------------------------------------------- | ------ |
| `apps/web-v2/lib/explorer/eventRegistry.ts`                        | `0xa34596D38Be381A4764141105A91C338Ca5503bB` | V1 Token                | **Purged from `KNOWN_TOKENS`**                                        | Clean  |
| `apps/web-v2/lib/explorer/eventRegistry.ts`                        | `0x5c0c26a825639adc58c6edf3ae864616f1da94b9` | Old Mock Token          | **Purged from `KNOWN_TOKENS`**                                        | Clean  |
| `apps/web-v2/lib/explorer/eventRegistry.ts`                        | `0x4A33d001D7F81C12c0C9262256Af83000e64457D` | V2 Legacy Symbol Token  | **Purged from `KNOWN_TOKENS`**                                        | Clean  |
| `apps/web-v2/lib/contracts/events-registry.ts`                     | `0x4A33d001D7F81C12c0C9262256Af83000e64457D` | V2 Legacy Symbol Token  | **Purged from `tokens` map**                                          | Clean  |
| `apps/web-v2/components/p2p/__tests__/marketplaceDecimals.test.ts` | `0x5c0c26a825639adc58c6edf3ae864616f1da94b9` | Old Token in Unit Test  | **Updated to canonical `0x006c5DF13C716E5224b33956651C4356BB90DEc0`** | Clean  |
| `apps/web-v2/components/p2p/__tests__/marketplaceUi.test.ts`       | `0x4A33d001D7F81C12c0C9262256Af83000e64457D` | Mock Token in Unit Test | **Updated to canonical `0x006c5DF13C716E5224b33956651C4356BB90DEc0`** | Clean  |
| `apps/web-v2/constants/index.ts`                                   | Missing `GasTreasury`, `EntryPoint`, `Admin` | Missing properties      | **Added canonical constants to `DEPLOYED_CONTRACTS_SEPOLIA`**         | Clean  |

---

## 4. Files Changed

1. `apps/web-v2/constants/index.ts`:
   - Enriched `DEPLOYED_CONTRACTS_SEPOLIA` with `GasTreasury` (`0xd4b19a48c270b720feeed57ccab5aa4ecfcc1fd9`), `EntryPoint` (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`), and `Admin` (`0xd905920c91853039060246Ed5724AA72B91a96DA`).
2. `apps/web-v2/lib/contracts/events-registry.ts`:
   - Removed obsolete legacy token `0x4A33d001D7F81C12c0C9262256Af83000e64457D` while preserving canonical tokens.
3. `apps/web-v2/lib/explorer/eventRegistry.ts`:
   - Purged obsolete token keys `0xa34596d38be381a4764141105a91c338ca5503bb`, `0x5c0c26a825639adc58c6edf3ae864616f1da94b9`, and `0x4a33d001d7f81c12c0c9262256af83000e64457d` from `KNOWN_TOKENS`.
4. `apps/web-v2/components/p2p/__tests__/marketplaceDecimals.test.ts`:
   - Aligned UVBE address with canonical `0x006c5DF13C716E5224b33956651C4356BB90DEc0`.
5. `apps/web-v2/components/p2p/__tests__/marketplaceUi.test.ts`:
   - Aligned test mock asset with canonical `0x006c5DF13C716E5224b33956651C4356BB90DEc0`.
6. `apps/web-v2/hooks/useTransactionExplorer.ts`:
   - Resolved strict TypeScript type casting for `publicClient` passed into event discovery.
7. `apps/web-v2/lib/__tests__/frontendContractAlignment.test.ts`:
   - Created full regression test suite (31 automated assertions) validating canonical Base Sepolia V2 addresses, scanning all frontend source files to strictly ban obsolete addresses, checking protocol module IDs, validating ABI compatibility, and enforcing P2P 1% fee invariants.

---

## 5. ABI and Function Compatibility Status

All frontend ABI definitions match the on-chain deployed contracts:

- **UnifyVaultController ABI:** Contains `deposit(address,uint256,uint256,address)`, `redeem(address,uint256,uint256,address,uint256)`, `getDepositQuote`, `getRedeemQuote`, `previewDeposit`, `previewRedeem`, `paused`, `swapSlippageBps`, `emergencyPause`, `resume`.
- **P2PEscrowV2 ABI:** Contains `createTrade((address,address,address,uint256,uint256,bytes32,uint256))`, `fundTrade(uint256)`, `submitPayment(uint256,bytes32,bytes32)`, `confirmAndRelease(uint256)`, `refund(uint256)`, `cancelUnfundedTrade(uint256)`, `raiseDispute(uint256,bytes32)`, `resolveDispute(uint256,uint8)`, `getTrade(uint256)`, `feeBps()`, `totalTrades()`.
- **Marketplace ABI:** Contains `createBuyOrder`, `createSellOrder`, `cancelOrder`, `matchOrders`, `takeOrder`, `getOrder`, `getOrderCount`, `p2pEscrow`, `uvbeToken`.
- **PortfolioManager ABI:** Contains `calculatePortfolioValue()`, `calculateUVPrice()`, `calculateNAV()`, `nav()`, `sharePrice()`, `assetValueUSD(address)`, `allocation()`, `previewDeposit()`, `previewRedeem()`.
- **CostBasisManagerV2 ABI:** Contains `costBasis(address)`, `investedAssets(address)`, `averageEntryPrice(address)`, `realizedPnL(address)`, `unrealizedPnL(address)`, `portfolioPerformance(address)`.
- **PerformanceManager ABI:** Contains `currentValue(address)`, `investedCapital(address)`, `netProfit(address)`, `roi(address)`, `performance(address)`.
- **Treasury & CustodyVault ABIs:** Contains `totalAssets(address)`, `balance(address)`, `totalAssetBalance(address)`, `withdraw(address,address,uint256)`, `withdrawNative(address,uint256)`.
- **ProtocolDirectory ABI:** Contains `getAddress(bytes32)` with exact keccak256 module identifiers.

---

## 6. P2P Frontend Semantics & Accounting Isolation Verification

1. **Protocol Fee (100 BPS / 1.00%):**
   - Verified that `P2PEscrowV2.feeBps` evaluates to `100n` (1.00%).
   - Frontend UI (`TradeDetailCard.tsx`, `CreateTradeModal.tsx`, `P2POrderBook.tsx`) computes `(amount * 100n) / 10000n` for protocol fees credited to Treasury (`0xB8c8113a042f39936dD966A5983fAaE2bF7b7290`).
2. **Escrow Lifecycle:**
   - Order creation -> matching -> escrow creation (`createTrade`) -> funding (`fundTrade` 2-call batch with approval) -> fiat proof submission (`submitPayment`) -> seller confirmation & release (`confirmAndRelease`) or refund (`refund`) / dispute (`raiseDispute`).
3. **Portfolio Accounting Isolation:**
   - On-chain: `CostBasisManagerV2` has `isEscrow[P2PEscrowV2] = true`, ensuring direct peer-to-peer crypto transfers between buyers and sellers preserve cost-basis and do NOT trigger deposit/redemption fee realizations or artificially inflate protocol deposit TVL.
   - Frontend: `portfolioTransforms.ts` and `useUserPortfolio.ts` source portfolio metrics strictly from `PerformanceManager` / `CostBasisManagerV2` and do not confuse P2P fiat trades with vault liquidity transactions.

---

## 7. Smart Account & ERC-4337 Configuration

- **EntryPoint:** Canonical ERC-4337 v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`)
- **Paymaster:** Hardened Verifying Paymaster (`0x42c6342516714CFd64474bd41Ce360605b9fEA88`)
- **GasTreasury:** Automated refill contract (`0xd4b19a48c270b720feeed57ccab5aa4ecfcc1fd9`)
- **Chain ID:** `84532` (Base Sepolia)
- **Approved UserOp Targets (`APPROVED_SEPOLIA_TARGETS`):**
  - USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  - Controller: `0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec`
  - UVBE: `0x006c5DF13C716E5224b33956651C4356BB90DEc0`
  - P2PEscrow: `0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb`
- **UserOp Builder & Paymaster Policy:**
  - 2-call batch deposits (`USDC.approve(controller, amount)` + `Controller.deposit(...)`) with zero excess allowance.
  - P2P 2-call batch funding (`ERC20.approve(escrow, amount)` + `P2PEscrow.fundTrade(tradeId)`).
  - Single-call redemptions (`Controller.redeem(...)`) and UVBE transfers.
  - Zero ETH drain protection rejecting native transfers and unauthorized contract calls.

---

## 8. Environment Variables Verification

All environment configurations (`.env`, `.env.example`, `apps/web-v2/.env.example`, `apps/web-v2/.env.local`) were verified:

- `NEXT_PUBLIC_PAYMASTER_ADDRESS_SEPOLIA=0x42c6342516714CFd64474bd41Ce360605b9fEA88`
- `NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA=0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb`
- `NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA=0xe908377f96F313a6b7771570ff6Fb414D38F451A`
- `NEXT_PUBLIC_PROTOCOL_DIRECTORY_ADDRESS_SEPOLIA=0x8040006d6907a84911aaC0a9aC08278311B156e2`
- `PAYMASTER_SIGNER_PRIVATE_KEY` configured for server-side verification signing without client exposure.

---

## 9. Verification & Test Results

### 1. Web-v2 Vitest Test Suite

```
pnpm --filter @unifyvault/web-v2 test
Test Files: 44 passed (44 total)
Tests:      420 passed (420 total)
Duration:   10.58s
```

### 2. TypeScript Compilation Check

```
pnpm --filter @unifyvault/web-v2 typecheck
tsc --noEmit -> Exit status 0 (0 errors)
```

### 3. Next.js Production Build

```
pnpm --filter @unifyvault/web-v2 build
next build -> Generated 38 static routes, 0 build errors.
```

### 4. Full Monorepo Test Suite (`pnpm test:all`)

```
pnpm test:all
- Foundry Unit Tests: 62 passed (62 total)
- Foundry Invariant & Fuzz Suites: All passed
- Foundry Fork Tests (BaseSepoliaProductionAuditAndRegressionTest, BaseSepoliaV2MigrationTest, BaseSepoliaRebaseMigrationTest): All passed
- Web-v2 Vitest Suite: 420 passed (420 total)
- Monorepo Turbo Build: 2 successful, 0 failed
Exit status 0
```

---

## 10. Final Verification Verdict

- **FRONTEND CONTRACT ALIGNMENT:** **PASS**
- **PHASE 6 READY:** **YES**
