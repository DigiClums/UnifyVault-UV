# UnifyVault V2 Operational Manual

## Standard Operations

### 1. Monitoring Liquidity Health

Run `LiquidityManager.checkLiquidity(asset)` periodically to inspect accounting health:

- **Refill Trigger**: If `operationalBalance < 5%` of total balance, `checkLiquidity` returns `needsRefill = true` and target refill `amount`.
- **Sweep Trigger**: If `operationalBalance > 15%` of total balance, `checkLiquidity` returns `needsSweep = true` and target sweep `amount`.

### 2. Executing Liquidity Refill

Callable by `GOVERNANCE_ROLE`:

```solidity
LiquidityManager.refillOperationalLiquidity(assetAddress, amount);
```

Shifts specified `amount` from reserve accounting balance to operational accounting balance.

### 3. Executing Reserve Sweep

Callable by `GOVERNANCE_ROLE`:

```solidity
LiquidityManager.sweepReserveLiquidity(assetAddress, amount);
```

Shifts excess `amount` from operational accounting balance to reserve accounting balance.

---

## Emergency & Pause Procedures

### 1. Triggering Protocol Pause

In the event of anomalous market conditions, oracle failures, or suspicious activity, the `GUARDIAN_ROLE` or `GOVERNANCE_ROLE` can invoke:

```solidity
UnifyVaultController.emergencyPause();
```

This immediately halts `deposit()` and `redeem()` operations across the protocol.

### 2. Unpausing Protocol

Once emergency situations are thoroughly resolved, the `GOVERNANCE_ROLE` can invoke:

```solidity
UnifyVaultController.unpause();
```

---

## Treasury Management

To withdraw accrued protocol revenue fees:

```solidity
Treasury.withdraw(assetAddress, recipientAddress, amount);
```

Callable exclusively by `GOVERNANCE_ROLE`.

---

## Operational Monitoring Checklist

1. **Oracle Feed Health**: Monitor `OracleManager.isHealthy(assetId)`. Ensure oracle feeds update within heartbeat (3600s).
2. **Custody Balance Alignment**: Verify `CustodyVault.totalAssets(asset) == ERC20(asset).balanceOf(vault)`.
3. **Controller Invariant**: Monitor `IERC20(asset).balanceOf(controller) == 0`.
