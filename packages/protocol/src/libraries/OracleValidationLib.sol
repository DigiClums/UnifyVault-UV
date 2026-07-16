// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import '../errors/Errors.sol';

/**
 * @title OracleValidationLib
 * @notice Provides validation checks for oracle prices and heartbeat latency limits
 */
library OracleValidationLib {
  /**
   * @notice Reverts if the oracle price is non-positive
   * @param price The price value fetched from the aggregator
   * @param asset The asset address associated with the price
   */
  function validateOraclePrice(int256 price, address asset) internal pure {
    if (price <= 0) {
      revert Errors.OraclePriceNegative(asset, price);
    }
  }

  /**
   * @notice Reverts if the price update has elapsed past its heartbeat timeout threshold
   * @param timestamp The price feed update timestamp
   * @param heartbeat The maximum allowed latency age in seconds
   * @param asset The asset address associated with the price
   */
  function validatePriceFreshness(
    uint256 timestamp,
    uint256 heartbeat,
    address asset
  ) internal view {
    uint256 age = block.timestamp - timestamp;
    if (age > heartbeat) {
      revert Errors.OraclePriceStale(asset, age, heartbeat);
    }
  }
}
