// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IStrategyManager
 * @notice Interface for UnifyVault StrategyManager governing portfolio asset allocation weights
 */
interface IStrategyManager {
  // Events
  event AssetAdded(address indexed asset, uint256 weightBps, address indexed caller);
  event AssetRemoved(address indexed asset, address indexed caller);
  event WeightUpdated(
    address indexed asset,
    uint256 oldWeightBps,
    uint256 newWeightBps,
    address indexed caller
  );
  event StrategyUpdated(address[] assets, uint256[] weightsBps, address indexed caller);

  // Custom Errors
  error InvalidTotalAllocation(uint256 totalBps, uint256 expectedBps);
  error AssetAlreadySupported(address asset);
  error AssetNotSupportedByStrategy(address asset);
  error ZeroWeightNotAllowed();
  error ArrayLengthMismatch();
  error ZeroAddressDetected();
  error EmptyStrategyNotAllowed();

  // Governance Write Functions
  function setStrategy(address[] calldata assets, uint256[] calldata weightsBps) external;
  function addAsset(address asset, uint256 weightBps) external;
  function removeAsset(address asset) external;
  function updateWeights(address[] calldata assets, uint256[] calldata weightsBps) external;

  // View Functions for PortfolioManager & Integrations
  function getSupportedAssets() external view returns (address[] memory);
  function getAssetWeight(address asset) external view returns (uint256);
  function getTargetWeights()
    external
    view
    returns (address[] memory assets, uint256[] memory weightsBps);
  function getTotalAllocationBps() external view returns (uint256);
  function isSupportedAsset(address asset) external view returns (bool);
  function getAssetCount() external view returns (uint256);
}
