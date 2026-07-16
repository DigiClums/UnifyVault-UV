// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IOracle
 * @notice Interface for the UnifyVault Oracle Adapters
 */
interface IOracle {
  /**
   * @notice Returns the normalized, consolidated valuation price for a given asset
   * @dev Performs safety checks, latency heartbeats, and provider fallbacks internally
   * @param asset The address of the underlying collateral asset
   * @return price The normalized asset price scaled to 18 decimals
   */
  function getAssetPrice(address asset) external view returns (uint256 price);

  /**
   * @notice Evaluates if the price feed is currently active and within safety parameters
   * @param asset The address of the underlying collateral asset
   * @return isFresh True if the price feed is fresh and has not expired past its heartbeat
   */
  function isPriceFresh(address asset) external view returns (bool);

  /**
   * @notice Returns the metadata details of the active provider feed for an asset
   * @param asset The address of the underlying collateral asset
   * @return provider The address of the active oracle provider
   * @return heartbeat The configured heartbeat timeout threshold
   */
  function getFeedMetadata(
    address asset
  ) external view returns (address provider, uint256 heartbeat);
}
