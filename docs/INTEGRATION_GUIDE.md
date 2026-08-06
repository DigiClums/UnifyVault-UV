# UnifyVault V2 Integration Guide for Integrators & Protocols

## Overview

Integrators can easily integrate UnifyVault V2 into dApps, aggregators, or asset management protocols on Base Mainnet.

## Integration Steps

### 1. Depositing Collateral

```solidity
IERC20(usdcToken).approve(controllerAddress, depositAmount);
uint256 sharesMinted = IUnifyVaultController(controllerAddress).deposit(
    usdcToken,
    depositAmount,
    minSharesOut,
    receiverAddress
);
```

### 2. Redeeming Shares

```solidity
IERC20(indexToken).approve(controllerAddress, sharesToRedeem);
uint256 assetsReceived = IUnifyVaultController(controllerAddress).redeem(
    usdcToken,
    sharesToRedeem,
    minAssetsOut,
    receiverAddress,
    deadline
);
```

### 3. Reading Portfolio Value & Share Price

```solidity
uint256 totalVaultValueUsd = IUnifyVaultController(controllerAddress).getVaultTotalValueUsd();
uint256 sharePriceUsd = (totalVaultValueUsd * 1e18) / IERC20(indexToken).totalSupply();
```
