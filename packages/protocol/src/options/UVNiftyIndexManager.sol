// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IUVNiftyIndexManager.sol';
import '../interfaces/IOracleManager.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVNiftyIndexManager
 * @notice Canonical manager for UV-NIFTY underlying components, oracles, weights, and continuous epochs.
 */
contract UVNiftyIndexManager is AccessControl, IUVNiftyIndexManager {
  bytes32 public constant GOVERNANCE_ROLE = AccessRoles.GOVERNANCE_ROLE;
  uint256 public constant BPS_DENOMINATOR = 10000;
  uint256 public constant BASE_INDEX_PRECISION = 1e18;

  IOracleManager public oracleManager;
  bytes32[] private _assetIds;
  mapping(bytes32 => Component) private _components;

  Epoch private _currentEpoch;

  error InvalidWeightSum();
  error ComponentNotFound();
  error OracleStaleOrInvalid();
  error ZeroAddress();

  constructor(address admin, address _oracleManager) {
    if (admin == address(0) || _oracleManager == address(0)) revert ZeroAddress();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(GOVERNANCE_ROLE, admin);

    oracleManager = IOracleManager(_oracleManager);

    _currentEpoch = Epoch({
      epochId: 1,
      startTime: block.timestamp,
      baseIndexValue: 1000 * BASE_INDEX_PRECISION, // Initial $1,000 base unit
      divisor: 1 * BASE_INDEX_PRECISION
    });
  }

  function registerComponent(
    bytes32 assetId,
    address oracle,
    uint256 weightBps,
    uint256 referencePrice,
    uint8 priceDecimals
  ) external onlyRole(GOVERNANCE_ROLE) {
    if (_components[assetId].assetId == bytes32(0)) {
      _assetIds.push(assetId);
    }

    _components[assetId] = Component({
      assetId: assetId,
      oracle: oracle,
      weightBps: weightBps,
      referencePrice: referencePrice,
      priceDecimals: priceDecimals,
      active: true
    });

    emit ComponentUpdated(assetId, weightBps, true);
  }

  function getComponents() external view override returns (Component[] memory) {
    Component[] memory list = new Component[](_assetIds.length);
    for (uint256 i = 0; i < _assetIds.length; i++) {
      list[i] = _components[_assetIds[i]];
    }
    return list;
  }

  function getComponent(bytes32 assetId) external view override returns (Component memory) {
    Component memory comp = _components[assetId];
    if (comp.assetId == bytes32(0)) revert ComponentNotFound();
    return comp;
  }

  function getTotalWeightBps() public view override returns (uint256 total) {
    for (uint256 i = 0; i < _assetIds.length; i++) {
      if (_components[_assetIds[i]].active) {
        total += _components[_assetIds[i]].weightBps;
      }
    }
  }

  function getIndexPrice() public view override returns (uint256 indexPrice, uint256 updatedAt) {
    if (getTotalWeightBps() != BPS_DENOMINATOR) revert InvalidWeightSum();

    uint256 compositeWeightSum = 0;
    uint256 oldestTimestamp = block.timestamp;

    for (uint256 i = 0; i < _assetIds.length; i++) {
      Component memory comp = _components[_assetIds[i]];
      if (!comp.active) continue;

      IOracleManager.PriceRound memory round = oracleManager.getPrice(comp.assetId);
      if (round.updatedAt < oldestTimestamp) {
        oldestTimestamp = round.updatedAt;
      }

      uint256 currentPrice = round.price;
      uint256 relativePrice = (currentPrice * 1e18) / comp.referencePrice;
      compositeWeightSum += (relativePrice * comp.weightBps) / BPS_DENOMINATOR;
    }

    indexPrice = (_currentEpoch.baseIndexValue * compositeWeightSum) / 1e18;
    updatedAt = oldestTimestamp;
  }

  function getIndexTWAP(
    uint256 startTime,
    uint256 endTime
  ) external view override returns (uint256 twapIndex, bool valid) {
    if (getTotalWeightBps() != BPS_DENOMINATOR) revert InvalidWeightSum();

    uint256 compositeWeightSum = 0;

    for (uint256 i = 0; i < _assetIds.length; i++) {
      Component memory comp = _components[_assetIds[i]];
      if (!comp.active) continue;

      (uint256 twapPrice, bool isValid) = oracleManager.getHistoricalTWAP(
        comp.assetId,
        startTime,
        endTime
      );
      if (!isValid) return (0, false);

      uint256 relativePrice = (twapPrice * 1e18) / comp.referencePrice;
      compositeWeightSum += (relativePrice * comp.weightBps) / BPS_DENOMINATOR;
    }

    twapIndex = (_currentEpoch.baseIndexValue * compositeWeightSum) / 1e18;
    valid = true;
  }

  function getCurrentEpoch() external view override returns (Epoch memory) {
    return _currentEpoch;
  }
}
