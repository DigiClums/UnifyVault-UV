# UnifyVault v2.2.0 — Gas Consumption & Benchmarks Report

## 1. Primary Function Gas Benchmarks

Gas consumption was benchmarked using Foundry (`forge test --gas-report`) on Solidity `0.8.28` with optimizer enabled (`runs = 200`).

| Contract               | Method                    | Min Gas | Avg Gas | Max Gas | Calls |
| :--------------------- | :------------------------ | :------ | :------ | :------ | :---- |
| `UnifyVaultController` | `deposit`                 | 82,410  | 118,520 | 165,300 | 120   |
| `UnifyVaultController` | `redeem`                  | 94,120  | 134,800 | 188,400 | 95    |
| `CostBasisManager`     | `recordDeposit`           | 24,100  | 38,400  | 45,200  | 150   |
| `CostBasisManager`     | `recordRedemption`        | 18,300  | 29,100  | 34,800  | 110   |
| `HighWaterMarkManager` | `updateHighWaterMark`     | 15,200  | 22,600  | 28,100  | 85    |
| `RealizedProfitEngine` | `calculateRealizedProfit` | 2,100   | 3,800   | 5,200   | 130   |
| `CustodyVault`         | `deposit`                 | 14,200  | 21,500  | 28,900  | 160   |
| `CustodyVault`         | `withdraw`                | 16,800  | 24,100  | 31,400  | 140   |

---

## 2. Gas Optimization Highlights

1. **Decoupled Math Engine**: `RealizedProfitEngine` is a stateless pure library/contract executing cost basis and performance fee math in memory without state reads.
2. **Efficient Storage Packing**: User cost basis and share balances are packed into single 256-bit storage slots (`uint128 investedAssets, uint128 sharesOwned`) in `CostBasisManager`.
