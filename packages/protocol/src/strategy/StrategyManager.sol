// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IStrategyManager.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title StrategyManager
 * @notice Dedicated portfolio allocation strategy module for the UnifyVault Protocol
 * @dev Governs target asset weights in basis points (BPS) for crypto index portfolios.
 * Enforces strict invariant: total target allocation must equal 10,000 BPS (100.00%).
 * Contains NO fund holding, swap execution, oracle reading, or NAV calculation logic.
 */
contract StrategyManager is AccessControl, IStrategyManager {
  uint256 public constant TOTAL_BPS = 10000;

  // List of active portfolio asset addresses
  address[] private _supportedAssets;

  // Quick lookup mapping for asset support
  mapping(address => bool) private _isSupported;

  // Mapping from asset address to target weight in basis points (1 BPS = 0.01%)
  mapping(address => uint256) private _targetWeightsBps;

  // 1-based index mapping for O(1) asset array removal
  mapping(address => uint256) private _assetIndex;

  /**
   * @notice StrategyManager constructor initializing access roles and optional initial strategy
   * @param admin Address granted DEFAULT_ADMIN_ROLE and GOVERNANCE_ROLE
   * @param initialAssets Initial portfolio asset addresses (optional)
   * @param initialWeightsBps Initial target weights in basis points (optional)
   */
  constructor(address admin, address[] memory initialAssets, uint256[] memory initialWeightsBps) {
    if (admin == address(0)) revert ZeroAddressDetected();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    if (initialAssets.length > 0) {
      _setStrategy(initialAssets, initialWeightsBps);
    }
  }

  // --- External Governance Functions ---

  /**
   * @notice Sets the entire portfolio asset allocation strategy in a single atomic call
   * @param assets Array of asset addresses
   * @param weightsBps Array of corresponding target weights in BPS (must sum to 10,000)
   */
  function setStrategy(
    address[] calldata assets,
    uint256[] calldata weightsBps
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _setStrategy(assets, weightsBps);
  }

  /**
   * @notice Adds a new asset to the portfolio with a target weight
   * @dev Validates that the resulting total weight sum equals 10,000 BPS
   * @param asset Address of asset to add
   * @param weightBps Target weight in basis points
   */
  function addAsset(
    address asset,
    uint256 weightBps
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0)) revert ZeroAddressDetected();
    if (weightBps == 0) revert ZeroWeightNotAllowed();
    if (_isSupported[asset]) revert AssetAlreadySupported(asset);

    _supportedAssets.push(asset);
    _assetIndex[asset] = _supportedAssets.length;
    _isSupported[asset] = true;
    _targetWeightsBps[asset] = weightBps;

    uint256 total = _calculateTotalBps();
    if (total != TOTAL_BPS) revert InvalidTotalAllocation(total, TOTAL_BPS);

    emit AssetAdded(asset, weightBps, msg.sender);
  }

  /**
   * @notice Removes an asset from the portfolio allocation
   * @dev Governance must ensure remaining asset weights are updated so total equals 10,000 BPS
   * @param asset Address of asset to remove
   */
  function removeAsset(address asset) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (!_isSupported[asset]) revert AssetNotSupportedByStrategy(asset);

    uint256 indexPlusOne = _assetIndex[asset];
    uint256 index = indexPlusOne - 1;
    uint256 lastIndex = _supportedAssets.length - 1;

    if (index != lastIndex) {
      address lastAsset = _supportedAssets[lastIndex];
      _supportedAssets[index] = lastAsset;
      _assetIndex[lastAsset] = indexPlusOne;
    }

    _supportedAssets.pop();
    delete _assetIndex[asset];
    delete _isSupported[asset];
    delete _targetWeightsBps[asset];

    uint256 total = _calculateTotalBps();
    if (_supportedAssets.length > 0 && total != TOTAL_BPS) {
      revert InvalidTotalAllocation(total, TOTAL_BPS);
    }

    emit AssetRemoved(asset, msg.sender);
  }

  /**
   * @notice Updates target allocation weights for specified assets
   * @dev Validates that total allocation equals 10,000 BPS
   * @param assets Array of supported asset addresses to update
   * @param weightsBps Array of corresponding new target weights in BPS
   */
  function updateWeights(
    address[] calldata assets,
    uint256[] calldata weightsBps
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (assets.length != weightsBps.length) revert ArrayLengthMismatch();
    if (assets.length == 0) revert EmptyStrategyNotAllowed();

    for (uint256 i = 0; i < assets.length; i++) {
      address asset = assets[i];
      uint256 newWeight = weightsBps[i];

      if (!_isSupported[asset]) revert AssetNotSupportedByStrategy(asset);
      if (newWeight == 0) revert ZeroWeightNotAllowed();

      uint256 oldWeight = _targetWeightsBps[asset];
      _targetWeightsBps[asset] = newWeight;

      emit WeightUpdated(asset, oldWeight, newWeight, msg.sender);
    }

    uint256 total = _calculateTotalBps();
    if (total != TOTAL_BPS) revert InvalidTotalAllocation(total, TOTAL_BPS);
  }

  // --- External View Functions ---

  /**
   * @notice Returns the list of currently supported strategy asset addresses
   */
  function getSupportedAssets() external view override returns (address[] memory) {
    return _supportedAssets;
  }

  /**
   * @notice Returns target weight in BPS for a given asset
   * @param asset Address of the portfolio asset
   */
  function getAssetWeight(address asset) external view override returns (uint256) {
    if (!_isSupported[asset]) revert AssetNotSupportedByStrategy(asset);
    return _targetWeightsBps[asset];
  }

  /**
   * @notice Returns both asset addresses and target weights arrays for the current strategy
   */
  function getTargetWeights()
    external
    view
    override
    returns (address[] memory assets, uint256[] memory weightsBps)
  {
    uint256 len = _supportedAssets.length;
    assets = new address[](len);
    weightsBps = new uint256[](len);

    for (uint256 i = 0; i < len; i++) {
      address asset = _supportedAssets[i];
      assets[i] = asset;
      weightsBps[i] = _targetWeightsBps[asset];
    }
  }

  /**
   * @notice Calculates and returns total strategy allocation in BPS
   */
  function getTotalAllocationBps() external view override returns (uint256) {
    return _calculateTotalBps();
  }

  /**
   * @notice Checks if an asset is supported by the current strategy
   * @param asset Address of the token to check
   */
  function isSupportedAsset(address asset) external view override returns (bool) {
    return _isSupported[asset];
  }

  /**
   * @notice Returns total number of active portfolio assets in the strategy
   */
  function getAssetCount() external view override returns (uint256) {
    return _supportedAssets.length;
  }

  // --- Internal Helper Functions ---

  /**
   * @dev Atomically updates entire strategy array and target weights
   */
  function _setStrategy(address[] memory assets, uint256[] memory weightsBps) internal {
    if (assets.length != weightsBps.length) revert ArrayLengthMismatch();
    if (assets.length == 0) revert EmptyStrategyNotAllowed();

    // Reset previous strategy storage
    uint256 oldLen = _supportedAssets.length;
    for (uint256 i = 0; i < oldLen; i++) {
      address oldAsset = _supportedAssets[i];
      delete _isSupported[oldAsset];
      delete _targetWeightsBps[oldAsset];
      delete _assetIndex[oldAsset];
    }
    delete _supportedAssets;

    uint256 total = 0;
    uint256 newLen = assets.length;
    for (uint256 i = 0; i < newLen; i++) {
      address asset = assets[i];
      uint256 weight = weightsBps[i];

      if (asset == address(0)) revert ZeroAddressDetected();
      if (weight == 0) revert ZeroWeightNotAllowed();
      if (_isSupported[asset]) revert AssetAlreadySupported(asset);

      _supportedAssets.push(asset);
      _assetIndex[asset] = _supportedAssets.length;
      _isSupported[asset] = true;
      _targetWeightsBps[asset] = weight;

      total += weight;
    }

    if (total != TOTAL_BPS) revert InvalidTotalAllocation(total, TOTAL_BPS);

    emit StrategyUpdated(assets, weightsBps, msg.sender);
  }

  /**
   * @dev Calculates total target allocation BPS across all active supported assets
   */
  function _calculateTotalBps() internal view returns (uint256 total) {
    uint256 len = _supportedAssets.length;
    for (uint256 i = 0; i < len; i++) {
      total += _targetWeightsBps[_supportedAssets[i]];
    }
  }
}
