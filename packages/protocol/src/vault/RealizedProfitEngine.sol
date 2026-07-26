// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '../interfaces/IRealizedProfitEngine.sol';

/**
 * @title RealizedProfitEngine
 * @notice Pure, deterministic engine that calculates cost basis removed, realized profit, and chargeable profit during redemption
 * @dev Stateless calculation module without state mutation, external calls, or storage dependencies.
 */
contract RealizedProfitEngine is IRealizedProfitEngine {
  // Custom errors
  error InvalidSharesOwned();
  error InsufficientSharesOwned(uint256 requested, uint256 actual);

  /**
   * @notice Calculates realized profit and chargeable profit for a given redemption context (external interface)
   * @param ctx RedemptionContext containing assetsReceived, investedAssets, sharesOwned, sharesRedeemed, highWaterMark
   * @return ProfitResult struct containing costRemoved, realizedProfit, and chargeableProfit
   */
  function calculateRealizedProfit(
    RedemptionContext calldata ctx
  ) external pure override returns (ProfitResult memory) {
    return calculate(ctx);
  }

  /**
   * @notice Pure, deterministic calculation function accepting memory context
   * @param ctx RedemptionContext containing assetsReceived, investedAssets, sharesOwned, sharesRedeemed, highWaterMark
   * @return result ProfitResult struct containing costRemoved, realizedProfit, and chargeableProfit
   */
  function calculate(
    RedemptionContext memory ctx
  ) public pure returns (ProfitResult memory result) {
    if (ctx.sharesOwned == 0) {
      if (ctx.sharesRedeemed > 0) {
        revert InsufficientSharesOwned(ctx.sharesRedeemed, 0);
      }
      return result;
    }

    if (ctx.sharesRedeemed > ctx.sharesOwned) {
      revert InsufficientSharesOwned(ctx.sharesRedeemed, ctx.sharesOwned);
    }

    // Step 1: Determine proportional cost basis
    uint256 costRemoved;
    if (ctx.sharesRedeemed == ctx.sharesOwned) {
      costRemoved = ctx.investedAssets;
    } else {
      costRemoved = (ctx.investedAssets * ctx.sharesRedeemed) / ctx.sharesOwned;
    }

    // Step 2: Determine realized profit = max(assetsReceived - costRemoved, 0)
    uint256 realizedProfit = 0;
    if (ctx.assetsReceived > costRemoved) {
      realizedProfit = ctx.assetsReceived - costRemoved;
    }

    // Step 3: Determine profit above HWM = max(realizedProfit - highWaterMark, 0)
    uint256 chargeableProfit = 0;
    if (realizedProfit > ctx.highWaterMark) {
      chargeableProfit = realizedProfit - ctx.highWaterMark;
    }

    result.costRemoved = costRemoved;
    result.realizedProfit = realizedProfit;
    result.chargeableProfit = chargeableProfit;
  }
}
