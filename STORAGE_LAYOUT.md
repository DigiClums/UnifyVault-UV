# Storage Layout Freeze

> **Freeze Status**: LOCKED & FROZEN  
> **Solidity Version**: `0.8.24`  
> **EVM Target**: `cancun`  
> **Optimization**: 200 runs (`via_ir = true`)

This document specifies the exact storage layout for all core contracts in UnifyVault V2.

## ChainlinkOracleProvider

| Slot | Offset | Bytes  | Name     | Type                                                            |
| :--- | :----- | :----- | :------- | :-------------------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles` | `mapping(bytes32 => struct AccessControl.RoleData)`             |
| `1`  | `0`    | `None` | `_feeds` | `mapping(bytes32 => struct ChainlinkOracleProvider.FeedConfig)` |

## CustodyVault

| Slot | Offset | Bytes  | Name               | Type                                                  |
| :--- | :----- | :----- | :----------------- | :---------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`           | `mapping(bytes32 => struct AccessControl.RoleData)`   |
| `1`  | `0`    | `None` | `_paused`          | `bool`                                                |
| `2`  | `0`    | `None` | `_assets`          | `mapping(address => struct CustodyVault.AssetConfig)` |
| `3`  | `0`    | `None` | `_accountedAssets` | `mapping(address => uint256)`                         |

## FeeManager

| Slot | Offset | Bytes  | Name            | Type                                                |
| :--- | :----- | :----- | :-------------- | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`        | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `1`  | `0`    | `None` | `depositFeeBps` | `uint256`                                           |
| `2`  | `0`    | `None` | `redeemFeeBps`  | `uint256`                                           |
| `3`  | `0`    | `None` | `treasury`      | `address`                                           |

## LiquidityManager

| Slot | Offset | Bytes  | Name                   | Type                                                           |
| :--- | :----- | :----- | :--------------------- | :------------------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`               | `mapping(bytes32 => struct AccessControl.RoleData)`            |
| `1`  | `0`    | `None` | `custodyVault`         | `address`                                                      |
| `2`  | `0`    | `None` | `_operationalBalances` | `mapping(address => uint256)`                                  |
| `3`  | `0`    | `None` | `_reserveBalances`     | `mapping(address => uint256)`                                  |
| `4`  | `0`    | `None` | `_thresholds`          | `mapping(address => struct ILiquidityManager.ThresholdConfig)` |

## OracleManager

| Slot | Offset | Bytes  | Name               | Type                                                   |
| :--- | :----- | :----- | :----------------- | :----------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`           | `mapping(bytes32 => struct AccessControl.RoleData)`    |
| `1`  | `0`    | `None` | `_assets`          | `mapping(bytes32 => struct OracleManager.AssetConfig)` |
| `2`  | `0`    | `None` | `_maxDeviationBps` | `mapping(bytes32 => uint256)`                          |
| `3`  | `0`    | `None` | `_lastValidPrices` | `mapping(bytes32 => uint256)`                          |

## PortfolioManager

| Slot | Offset | Bytes  | Name              | Type                                                |
| :--- | :----- | :----- | :---------------- | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`          | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `1`  | `0`    | `None` | `strategyManager` | `address`                                           |
| `2`  | `0`    | `None` | `oracleManager`   | `address`                                           |
| `3`  | `0`    | `None` | `custodyVault`    | `address`                                           |
| `4`  | `0`    | `None` | `indexToken`      | `address`                                           |

## ProtocolDirectory

| Slot | Offset | Bytes  | Name         | Type                                                |
| :--- | :----- | :----- | :----------- | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`     | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `1`  | `0`    | `None` | `_addresses` | `mapping(bytes32 => address)`                       |
| `2`  | `0`    | `None` | `_frozen`    | `bool`                                              |

## StrategyManager

| Slot | Offset | Bytes  | Name                | Type                                                |
| :--- | :----- | :----- | :------------------ | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`            | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `1`  | `0`    | `None` | `_supportedAssets`  | `address[]`                                         |
| `2`  | `0`    | `None` | `_isSupported`      | `mapping(address => bool)`                          |
| `3`  | `0`    | `None` | `_targetWeightsBps` | `mapping(address => uint256)`                       |
| `4`  | `0`    | `None` | `_assetIndex`       | `mapping(address => uint256)`                       |

## SwapAdapter

| Slot | Offset | Bytes  | Name     | Type                                                |
| :--- | :----- | :----- | :------- | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles` | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `1`  | `0`    | `None` | `router` | `address`                                           |

## Treasury

| Slot | Offset | Bytes  | Name      | Type                                                |
| :--- | :----- | :----- | :-------- | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`  | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `1`  | `0`    | `None` | `_paused` | `bool`                                              |
| `2`  | `0`    | `None` | `_assets` | `mapping(address => struct Treasury.AssetConfig)`   |

## UVBTCETHToken

| Slot | Offset | Bytes  | Name               | Type                                                |
| :--- | :----- | :----- | :----------------- | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_balances`        | `mapping(address => uint256)`                       |
| `1`  | `0`    | `None` | `_allowances`      | `mapping(address => mapping(address => uint256))`   |
| `2`  | `0`    | `None` | `_totalSupply`     | `uint256`                                           |
| `3`  | `0`    | `None` | `_name`            | `string`                                            |
| `4`  | `0`    | `None` | `_symbol`          | `string`                                            |
| `5`  | `0`    | `None` | `_nameFallback`    | `string`                                            |
| `6`  | `0`    | `None` | `_versionFallback` | `string`                                            |
| `7`  | `0`    | `None` | `_nonces`          | `mapping(address => uint256)`                       |
| `8`  | `0`    | `None` | `_roles`           | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `9`  | `0`    | `None` | `_paused`          | `bool`                                              |

## UnifyVaultController

| Slot | Offset | Bytes  | Name                     | Type                                                |
| :--- | :----- | :----- | :----------------------- | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`                 | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `1`  | `0`    | `None` | `_paused`                | `bool`                                              |
| `2`  | `0`    | `None` | `_maxDepositPerTx`       | `uint256`                                           |
| `3`  | `0`    | `None` | `_maxRedeemPerTx`        | `uint256`                                           |
| `4`  | `0`    | `None` | `_dailyDepositCap`       | `uint256`                                           |
| `5`  | `0`    | `None` | `_dailyRedeemCap`        | `uint256`                                           |
| `6`  | `0`    | `None` | `_currentDepositDay`     | `uint256`                                           |
| `7`  | `0`    | `None` | `_dailyDepositTotal`     | `uint256`                                           |
| `8`  | `0`    | `None` | `_currentRedeemDay`      | `uint256`                                           |
| `9`  | `0`    | `None` | `_dailyRedeemTotal`      | `uint256`                                           |
| `10` | `0`    | `None` | `_largeDepositThreshold` | `uint256`                                           |
| `11` | `0`    | `None` | `_largeRedeemThreshold`  | `uint256`                                           |
| `12` | `0`    | `None` | `_swapSlippageBps`       | `uint256`                                           |

## UnifyVaultTimelock

| Slot | Offset | Bytes  | Name          | Type                                                |
| :--- | :----- | :----- | :------------ | :-------------------------------------------------- |
| `0`  | `0`    | `None` | `_roles`      | `mapping(bytes32 => struct AccessControl.RoleData)` |
| `1`  | `0`    | `None` | `_timestamps` | `mapping(bytes32 => uint256)`                       |
| `2`  | `0`    | `None` | `_minDelay`   | `uint256`                                           |
