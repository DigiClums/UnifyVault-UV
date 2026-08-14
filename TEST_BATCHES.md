# Foundry Test Execution Batches

This document describes the logical batching strategy implemented for the UnifyVault Protocol Foundry test suite. The test suite is organized into independent, isolated batches to minimize CPU spikes during development, accelerate feedback loops, and preserve 100% test coverage.

---

## 📊 Summary of Batches

| Batch #      | Name                        | Core Focus Area                                   | Key Contracts & Suites                                             | Est. Runtime (Cached) |
| :----------- | :-------------------------- | :------------------------------------------------ | :----------------------------------------------------------------- | :-------------------- |
| **Batch 1**  | Unit & Hook Tests           | Cost Basis V2, Performance, Share tokens          | `CostBasisManagerV2`, `PerformanceManager`, `UVBEV2`               | ~50 ms                |
| **Batch 2**  | AccessControl & Libraries   | Roles, Directory, Validation libs                 | `ProtocolDirectory`, `AddressValidationLib`, `MathValidationLib`   | ~50 ms                |
| **Batch 3**  | Treasury & Custody          | Vault storage, fee custody, rate limits           | `CustodyVault`, `Treasury`, `AccountingModel`                      | ~150 ms               |
| **Batch 4**  | Oracle & Pricing            | Multi-provider feeds, staleness, circuit breakers | `OracleManager`, `ChainlinkOracleProvider`, `OracleCircuitBreaker` | ~100 ms               |
| **Batch 5**  | Portfolio & Strategy        | Asset allocations, liquidity & portfolio NAV      | `PortfolioManager`, `StrategyManager`, `LiquidityManager`          | ~20 ms                |
| **Batch 6**  | Controller & Deposit/Redeem | Minting, burning, collateral validation           | `UnifyVaultController`, `DepositCollateral`, `Redemption`          | ~250 ms               |
| **Batch 7**  | Swap & Fee                  | Router adapters & fee distribution                | `SwapAdapter`, `FeeManager`, `DepositFeeRouting`                   | ~100 ms               |
| **Batch 8**  | P2P Escrow & Marketplace    | Non-custodial OTC settlement, matching, disputes  | `P2PEscrow`, `P2PEscrowV2`, `Marketplace`, `P2PEscrowAdversarial`  | ~150 ms               |
| **Batch 9**  | Fork Tests                  | Mainnet fork simulations & validation             | `GovernanceMigrationValidation`, `MainnetDeploymentValidation`     | ~10.5 s               |
| **Batch 10** | Fuzz & Invariant Tests      | Stateful invariant & fuzz tests                   | `P2PEscrowInvariant`, `RedemptionFuzz`, `V2ProtocolInvariants`     | ~2.0 s                |

---

## 📁 Detailed Batch Breakdown

### Batch 1: Unit & Pre-Transfer Hook Tests

- **Filter**: `test/unit/{CostBasisManagerV2,PerformanceManager,UVBEV2}.t.sol`
- **Estimated Runtime**: ~50 ms
- **Test Files**:
  - `packages/protocol/test/unit/CostBasisManagerV2.t.sol`
  - `packages/protocol/test/unit/PerformanceManager.t.sol`
  - `packages/protocol/test/unit/UVBEV2.t.sol`

### Batch 2: AccessControl & Libraries

- **Filter**: `test/{AddressValidationLib,MathValidationLib,OracleValidationLib,ShareLibPrecision,GovernanceMigration,ProtocolDirectory,TimelockHardening,SecurityMonitoringEvents}.t.sol`
- **Estimated Runtime**: ~50 ms
- **Test Files**:
  - `packages/protocol/test/AddressValidationLib.t.sol`
  - `packages/protocol/test/MathValidationLib.t.sol`
  - `packages/protocol/test/OracleValidationLib.t.sol`
  - `packages/protocol/test/ShareLibPrecision.t.sol`
  - `packages/protocol/test/GovernanceMigration.t.sol`
  - `packages/protocol/test/ProtocolDirectory.t.sol`
  - `packages/protocol/test/TimelockHardening.t.sol`
  - `packages/protocol/test/SecurityMonitoringEvents.t.sol`

### Batch 3: Treasury & Custody

- **Filter**: `test/{Treasury,CustodyVault,AccountingModel,RateLimits}.t.sol`
- **Estimated Runtime**: ~150 ms
- **Test Files**:
  - `packages/protocol/test/Treasury.t.sol`
  - `packages/protocol/test/CustodyVault.t.sol`
  - `packages/protocol/test/AccountingModel.t.sol`
  - `packages/protocol/test/RateLimits.t.sol`

### Batch 4: Oracle & Pricing

- **Filter**: `test/{ChainlinkOracleProvider,OracleAdapter,OracleCircuitBreaker,OracleManager,OracleProvider}.t.sol`
- **Estimated Runtime**: ~100 ms
- **Test Files**:
  - `packages/protocol/test/ChainlinkOracleProvider.t.sol`
  - `packages/protocol/test/OracleAdapter.t.sol`
  - `packages/protocol/test/OracleCircuitBreaker.t.sol`
  - `packages/protocol/test/OracleManager.t.sol`
  - `packages/protocol/test/OracleProvider.t.sol`

### Batch 5: Portfolio & Strategy

- **Filter**: `test/{PortfolioManager,StrategyManager,LiquidityManager}.t.sol`
- **Estimated Runtime**: ~20 ms
- **Test Files**:
  - `packages/protocol/test/PortfolioManager.t.sol`
  - `packages/protocol/test/StrategyManager.t.sol`
  - `packages/protocol/test/LiquidityManager.t.sol`

### Batch 6: Controller & Deposit/Redeem

- **Filter**: `test/{UnifyVaultController,DepositCollateral,DepositMinting,DepositValidation,Redemption,UVBTCETHToken}.t.sol`
- **Estimated Runtime**: ~250 ms
- **Test Files**:
  - `packages/protocol/test/UnifyVaultController.t.sol`
  - `packages/protocol/test/DepositCollateral.t.sol`
  - `packages/protocol/test/DepositMinting.t.sol`
  - `packages/protocol/test/DepositValidation.t.sol`
  - `packages/protocol/test/Redemption.t.sol`
  - `packages/protocol/test/UVBTCETHToken.t.sol`

### Batch 7: Swap & Fee

- **Filter**: `test/{DepositFeeRouting,FeeManager,SwapAdapter}.t.sol`
- **Estimated Runtime**: ~100 ms
- **Test Files**:
  - `packages/protocol/test/DepositFeeRouting.t.sol`
  - `packages/protocol/test/FeeManager.t.sol`
  - `packages/protocol/test/SwapAdapter.t.sol`

### Batch 8: P2P Escrow & Marketplace

- **Filter**: `test/{unit/P2PEscrow.t.sol,unit/P2PEscrowAdversarial.t.sol,Marketplace.t.sol,P2PEscrow.t.sol}`
- **Estimated Runtime**: ~150 ms
- **Test Files**:
  - `packages/protocol/test/unit/P2PEscrow.t.sol`
  - `packages/protocol/test/unit/P2PEscrowAdversarial.t.sol`
  - `packages/protocol/test/Marketplace.t.sol`

### Batch 9: Fork Tests

- **Filter**: `test/{fork/*.t.sol,BaseMainnetFork.t.sol}`
- **Estimated Runtime**: ~10.5 seconds
- **Test Files**:
  - `packages/protocol/test/fork/GovernanceMigrationValidation.t.sol`
  - `packages/protocol/test/fork/MainnetDeploymentValidation.t.sol`
  - `packages/protocol/test/BaseMainnetFork.t.sol`

### Batch 10: Fuzz & Invariant Tests

- **Filter**: `test/{invariant/*.t.sol,*Invariant.t.sol,RedemptionFuzz.t.sol,V2ProtocolInvariants.t.sol}`
- **Estimated Runtime**: ~2.0 seconds
- **Test Files**:
  - `packages/protocol/test/invariant/P2PEscrowInvariant.t.sol`
  - `packages/protocol/test/ChainlinkOracleProviderInvariant.t.sol`
  - `packages/protocol/test/CustodyVaultInvariant.t.sol`
  - `packages/protocol/test/DepositCollateralInvariant.t.sol`
  - `packages/protocol/test/DepositFeeRoutingInvariant.t.sol`
  - `packages/protocol/test/DepositMintingInvariant.t.sol`
  - `packages/protocol/test/DepositValidationInvariant.t.sol`
  - `packages/protocol/test/OracleManagerInvariant.t.sol`
  - `packages/protocol/test/OracleProviderInvariant.t.sol`
  - `packages/protocol/test/RedemptionFuzz.t.sol`
  - `packages/protocol/test/RedemptionInvariant.t.sol`
  - `packages/protocol/test/TreasuryInvariant.t.sol`
  - `packages/protocol/test/UnifyVaultControllerInvariant.t.sol`
  - `packages/protocol/test/UVBTCETHTokenInvariant.t.sol`
  - `packages/protocol/test/V2ProtocolInvariants.t.sol`

---

## 🚀 Recommended Execution Commands

```bash
# Run P2P & Marketplace suites
cd packages/protocol && forge test --match-contract "P2P"

# Run all test suites
forge test

# Run frontend Vitest test suites
cd apps/web-v2 && npx vitest run
```
