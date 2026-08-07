// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IPerformanceManager
 * @notice Interface for UnifyVault PerformanceManager module providing comprehensive portfolio performance analytics
 */
interface IPerformanceManager {
  // Custom Errors
  error ZeroAddressDetected();

  // Performance Struct
  struct Performance {
    uint256 currentValueUSD;
    uint256 investedCapitalUSD;
    int256 realizedPnL;
    int256 unrealizedPnL;
    int256 netPnL;
    int256 roiBps;
    uint256 holdingPeriod;
  }

  // View Calculation Functions
  function currentValue(address account) external view returns (uint256);

  function investedCapital(address account) external view returns (uint256);

  function netProfit(address account) external view returns (int256);

  function roi(address account) external view returns (int256);

  function performance(address account) external view returns (Performance memory);
}
