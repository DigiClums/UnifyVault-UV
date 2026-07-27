// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IHighWaterMarkManager
 * @notice Interface for HighWaterMarkManager which tracks user High Water Mark (HWM) levels
 */
interface IHighWaterMarkManager {
  struct PerformanceState {
    uint256 highWaterMark;
    uint256 lastSettledCostBasis;
  }

  // Events
  event HighWaterMarkUpdated(address indexed user, uint256 previousValue, uint256 newValue);

  event HighWaterMarkReset(address indexed user);

  // State-changing functions
  function updateHighWaterMark(address user, uint256 newValue) external;

  function resetHighWaterMark(address user) external;

  // View functions
  function highWaterMark(address user) external view returns (uint256);

  function performanceState(
    address user
  ) external view returns (uint256 highWaterMark, uint256 lastSettledCostBasis);
}
