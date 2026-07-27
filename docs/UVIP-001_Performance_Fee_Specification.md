# UVIP-001: Performance Fee Specification

**Status:** Final  
**Target Release:** v2.2.0  
**Author:** UnifyVault Engineering Team

---

## 1. Objective

Implement a fair, deterministic, gas-efficient, and audit-friendly 5% performance fee engine on realized investment profits. The subsystem guarantees that performance fees are never assessed twice on previously settled gains.

---

## 2. Architecture & Responsibilities

| Module                      | Responsibility                                                                                           |
| :-------------------------- | :------------------------------------------------------------------------------------------------------- |
| **`FeeManager`**            | Protocol-wide fee configuration parameters (deposit, redemption, performance fee BPS)                    |
| **`FeeLib`**                | Pure, protocol-wide fee mathematics (deposit, redeem, and performance fee calculations)                  |
| **`CostBasisManager`**      | $O(1)$ weighted average cost basis accounting (`investedAssets`, `sharesOwned`)                          |
| **`HighWaterMarkManager`**  | User High Water Mark (HWM) tracking to prevent double-charging                                           |
| **`RealizedProfitEngine`**  | Pure, stateless calculation engine for proportional cost removal, realized profit, and chargeable profit |
| **`PerformanceFeeSettler`** | Standalone settlement preview and execution module                                                       |
| **`UnifyVaultController`**  | Execution orchestrator for deposit and redemption workflows                                              |
| **`Treasury`**              | Protocol fee custody and asset collection                                                                |

---

## 3. Mathematical Formulae

### 3.1 Proportional Cost Basis

$$\text{costRemoved} = \begin{cases} \text{investedAssets} & \text{if } \text{sharesRedeemed} == \text{sharesOwned} \\ \frac{\text{investedAssets} \times \text{sharesRedeemed}}{\text{sharesOwned}} & \text{otherwise} \end{cases}$$

### 3.2 Realized Profit

$$\text{realizedProfit} = \max(\text{assetsReceived} - \text{costRemoved}, 0)$$

### 3.3 Chargeable Profit Above High Water Mark

$$\text{chargeableProfit} = \max(\text{realizedProfit} - \text{highWaterMark}, 0)$$

### 3.4 Performance Fee

$$\text{performanceFee} = \frac{\text{chargeableProfit} \times \text{performanceFeeBps}}{10,000}$$

---

## 4. Accounting State Rules

1. **Deposit:** `investedAssets += netDeposit`, `sharesOwned += mintedShares`.
2. **Partial Redemption:**
   - `investedAssets -= costRemoved`
   - `sharesOwned -= sharesRedeemed`
   - `highWaterMark += chargeableProfit` (if $\text{chargeableProfit} > 0$)
3. **Full Exit (`sharesRedeemed == sharesOwned`):**
   - `investedAssets = 0`
   - `sharesOwned = 0`
   - `highWaterMark = 0` (cleared via `resetHighWaterMark`)

---

## 5. Protocol Invariants

- **Non-Negative Fees:** $\text{PerformanceFee} \ge 0$.
- **Realized Profit Cap:** $\text{PerformanceFee} \le 5\% \times \text{realizedProfit}$.
- **Monotonic HWM Growth:** $\text{HWM}_{t+1} \ge \text{HWM}_t$ (reset to $0$ only on complete exit).
- **Zero Dust:** Full redemption completely clears user cost basis and HWM.
- **No Double Charging:** Previously settled profits are excluded from future fee calculations.
