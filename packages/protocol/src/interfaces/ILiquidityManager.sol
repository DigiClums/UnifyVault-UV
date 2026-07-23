// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ILiquidityManager
 * @notice Interface for UnifyVault LiquidityManager governing operational and reserve liquidity accounting
 */
interface ILiquidityManager {
  // Events
  event RefillRequired(
    address indexed asset,
    uint256 currentOperationalBalance,
    uint256 targetOperationalBalance,
    uint256 requiredRefillAmount
  );

  event ReserveSweepRequired(
    address indexed asset,
    uint256 currentOperationalBalance,
    uint256 targetOperationalBalance,
    uint256 excessSweepAmount
  );

  event OperationalLiquidityRefilled(
    address indexed asset,
    uint256 amount,
    uint256 newOperationalBalance,
    uint256 newReserveBalance,
    address indexed caller
  );

  event ReserveLiquiditySwept(
    address indexed asset,
    uint256 amount,
    uint256 newOperationalBalance,
    uint256 newReserveBalance,
    address indexed caller
  );

  event ThresholdsConfigured(
    address indexed asset,
    uint256 operationalTargetBps,
    uint256 refillThresholdBps,
    uint256 excessThresholdBps,
    address indexed caller
  );

  event LiquidityBalancesSynced(
    address indexed asset,
    uint256 operationalBalance,
    uint256 reserveBalance,
    address indexed caller
  );

  event VaultSynchronized(address indexed vault);

  // Custom Errors
  error ZeroAddressDetected();
  error ZeroAmountDetected();
  error InvalidThresholdConfiguration();
  error InsufficientReserveBalance(address asset, uint256 requested, uint256 available);
  error InsufficientOperationalBalance(address asset, uint256 requested, uint256 available);

  // Structs
  struct ThresholdConfig {
    uint256 operationalTargetBps;
    uint256 refillThresholdBps;
    uint256 excessThresholdBps;
    bool isCustom;
  }

  // Governance & Execution Functions
  function refillOperationalLiquidity(address asset, uint256 amount) external;
  function sweepReserveLiquidity(address asset, uint256 amount) external;
  function setThresholds(
    address asset,
    uint256 operationalTargetBps,
    uint256 refillThresholdBps,
    uint256 excessThresholdBps
  ) external;
  function resetThresholds(address asset) external;
  function setLiquidityBalances(
    address asset,
    uint256 operationalBalance,
    uint256 reserveBalance
  ) external;
  function recordDeposit(address asset, uint256 amount) external;
  function recordWithdrawal(address asset, uint256 amount) external;
  function syncModules() external;

  // Assessment & View Functions
  function checkLiquidity(
    address asset
  ) external returns (bool needsRefill, bool needsSweep, uint256 amount);

  function assessLiquidity(
    address asset
  )
    external
    view
    returns (bool needsRefill, bool needsSweep, uint256 amount, uint256 targetOperationalBalance);

  function getLiquidityBalances(
    address asset
  )
    external
    view
    returns (uint256 operationalBalance, uint256 reserveBalance, uint256 totalBalance);

  function getThresholds(
    address asset
  )
    external
    view
    returns (uint256 operationalTargetBps, uint256 refillThresholdBps, uint256 excessThresholdBps);
}
