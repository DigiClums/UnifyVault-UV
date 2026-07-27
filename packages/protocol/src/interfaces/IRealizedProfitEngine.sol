// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IRealizedProfitEngine
 * @notice Interface for the pure, deterministic RealizedProfitEngine calculation module
 */
interface IRealizedProfitEngine {
  struct RedemptionContext {
    uint256 assetsReceived;
    uint256 investedAssets;
    uint256 sharesOwned;
    uint256 sharesRedeemed;
    uint256 highWaterMark;
  }

  struct ProfitResult {
    uint256 costRemoved;
    uint256 realizedProfit;
    uint256 chargeableProfit;
  }

  function calculateRealizedProfit(
    RedemptionContext calldata ctx
  ) external pure returns (ProfitResult memory);
}
