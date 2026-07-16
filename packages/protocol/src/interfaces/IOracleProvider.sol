// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IOracleProvider
 * @notice Standard interface for individual pricing oracle source adapters (e.g. Chainlink, Redstone, Pyth)
 */
interface IOracleProvider {
  /**
   * @notice Returns the latest price and metadata for a given asset from this provider
   * @param asset The address of the underlying asset
   * @return price The asset price scaled to 18 decimals
   * @return timestamp The timestamp when the price was last updated on-chain
   * @return heartbeat The configured maximum age (in seconds) allowed for this price feed
   */
  function getPriceData(
    address asset
  ) external view returns (uint256 price, uint256 timestamp, uint256 heartbeat);

  /**
   * @notice Checks if the price feed for a given asset is valid and fresh
   * @param asset The address of the underlying asset
   * @return isValid True if the feed is online, price is positive, and within heartbeat bounds
   */
  function isFeedHealthy(address asset) external view returns (bool);
}
