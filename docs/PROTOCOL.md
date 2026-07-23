# UnifyVault V2 Protocol Specification

## Overview

UnifyVault V2 provides a non-custodial, fully asset-backed index vault mechanism. This document specifies the protocol lifecycles, accounting equations, fee structure, strategy mechanics, and custody architecture.

---

## 1. Deposit Lifecycle

1. **User Initiation**:
   - User calls `UnifyVaultController.deposit(asset, amount, minSharesOut, receiver)`.
   - Controller verifies non-zero amount, non-zero receiver address, and active protocol pause state.
2. **Fee Deduction**:
   - `FeeLib.calculateDepositFee(amount)` computes the 0.1% (10 BPS) deposit fee.
   - Net deposit amount = `amount - protocolFee`.
   - `protocolFee` is transferred from user to `Treasury` via `ITreasury.collectFee()`.
3. **Strategy Execution & Swap Routing**:
   - Controller fetches target assets and weights from `StrategyManager.getTargetWeights()`.
   - For each target strategy asset:
     - Allocated deposit amount = `(netDeposit * weightBps) / 10000`.
     - `SwapAdapter` executes atomic DEX swap (`depositAsset -> targetAsset`).
     - Output tokens are immediately deposited into `CustodyVault.deposit()`.
4. **NAV & Share Issuance**:
   - `PortfolioManager.calculateNAV()` calculates current portfolio valuation and NAV per share.
   - Index shares to mint = `(netDepositValueUSD * 1e18) / navPerShare`.
   - Verification: `shares >= minSharesOut` (reverts with `SlippageLimitExceeded` if violated).
   - `UVBTCETHToken.mint(receiver, shares)` mints shares to receiver.
5. **Zero Controller Balance Invariant**:
   - Controller verifies `IERC20(asset).balanceOf(address(controller)) == 0`.

---

## 2. Redeem Lifecycle

1. **User Initiation**:
   - User calls `UnifyVaultController.redeem(asset, shares, minAssetsOut, receiver, deadline)`.
   - Controller verifies `block.timestamp <= deadline`, `shares > 0`, and active pause state.
2. **Custody Release & Swap-Back**:
   - Controller calculates proportional strategy assets owed based on share ratio `shares / totalSupply`.
   - `CustodyVault.withdraw()` releases physical tokens from vault to Controller.
   - `SwapAdapter` swaps strategy tokens back into the requested payout asset (e.g. USDC).
3. **Fee Deduction & Share Burn**:
   - Redemption fee (0.1%) is routed to `Treasury`.
   - Net output USDC is verified against `minAssetsOut`.
   - `UVBTCETHToken.burn(msg.sender, shares)` burns user shares.
   - Net USDC transferred to `receiver`.
4. **Zero Controller Balance Invariant**:
   - Controller verifies zero residual token balances.

---

## 3. NAV Calculation & Pricing Formula

$$\text{Total Portfolio Value USD} = \sum_{i=1}^{N} \left( \text{CustodyVault.totalAssets}(A_i) \times \text{Oracle.getAssetPrice}(A_i) \right) / 10^{\text{decimals}(A_i)}$$

$$ \text{NAV Per Share} =
\begin{cases}
1.00 \times 10^{18} & \text{if } \text{Total Shares} = 0 \\
\frac{\text{Total Portfolio Value USD} \times 10^{18}}{\text{Total Shares}} & \text{if } \text{Total Shares} > 0
\end{cases}$$

---

## 4. Treasury Fee Structure

- **Deposit Fee**: Default 0.10% (10 BPS) of gross deposit collateral.
- **Redeem Fee**: Default 0.10% (10 BPS) of gross output assets.
- **Fee Routing**: Deposited directly into `Treasury` via `ITreasury.collectFee()`.
- **Treasury Ownership**: Governance can withdraw accumulated fees via `Treasury.withdraw()`.

---

## 5. Strategy Allocation & Rebalancing

- **Target Weights**: Expressed in basis points ($1 \text{ BPS} = 0.01\%$).
- **Allocation Invariant**:
  $$\sum_{i=1}^{N} \text{targetWeightsBps}[A_i] == 10000 \text{ BPS}$$
- **Governance Controls**: `StrategyManager.setStrategy()`, `addAsset()`, `removeAsset()`, and `updateWeights()`.

---

## 6. Liquidity Management & Custody Architecture

- **Operational Target**: Default 10% of total asset balance.
- **Refill Threshold**: Default 5% (emits `RefillRequired`).
- **Excess Threshold**: Default 15% (emits `ReserveSweepRequired`).
- **No Automatic Transfers**: `LiquidityManager` emits event signals; governance executes manual balance shifts (`refillOperationalLiquidity`, `sweepReserveLiquidity`).
- **Accounting Invariant**:
  $$\text{Operational Balance}(A_i) + \text{Reserve Balance}(A_i) == \text{CustodyVault.totalAssets}(A_i)$$
$$
