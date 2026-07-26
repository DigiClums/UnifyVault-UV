// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IPerformanceFeeSettler
 * @notice Interface for PerformanceFeeSettler module orchestrating performance fee calculations and accounting state updates
 */
interface IPerformanceFeeSettler {
  struct SettlementResult {
    uint256 costRemoved;
    uint256 realizedProfit;
    uint256 chargeableProfit;
    uint256 performanceFee;
    uint256 netAssetsToUser;
    uint256 newHighWaterMark;
  }

  // Events
  event PerformanceFeeSettled(
    address indexed user,
    uint256 grossAssets,
    uint256 costRemoved,
    uint256 realizedProfit,
    uint256 chargeableProfit,
    uint256 performanceFee,
    uint256 netAssetsToUser
  );

  function previewSettlement(
    address user,
    uint256 sharesRedeemed,
    uint256 grossAssetsReceived
  ) external view returns (SettlementResult memory result);

  function executeSettlement(
    address user,
    uint256 sharesRedeemed,
    uint256 grossAssetsReceived
  ) external returns (SettlementResult memory result);
}
