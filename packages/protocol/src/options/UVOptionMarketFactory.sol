// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IUVOptionMarketFactory.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVOptionMarketFactory
 * @notice Factory for generating, querying, and managing UV-NIFTY Option Series and Strike Ladders.
 */
contract UVOptionMarketFactory is AccessControl, IUVOptionMarketFactory {
  bytes32 public constant GOVERNANCE_ROLE = AccessRoles.GOVERNANCE_ROLE;
  bytes32 public constant OPERATOR_ROLE = keccak256('MARKET_OPERATOR_ROLE');

  ExpiryConfig private _expiryConfig;
  mapping(bytes32 => OptionSeries) private _series;
  mapping(bytes32 => bytes32[]) private _seriesByUnderlying;

  error SeriesAlreadyExists();
  error SeriesNotFound();
  error InvalidParameters();

  constructor(address admin) {
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(GOVERNANCE_ROLE, admin);
    _grantRole(OPERATOR_ROLE, admin);

    _expiryConfig = ExpiryConfig({
      dailyExpiryHourUtc: 15,
      dailyExpiryMinuteUtc: 30,
      weeklyExpiryDay: 5, // Friday
      monthlyExpiryWeek: 4 // Last week
    });
  }

  function getOptionSeries(
    bytes32 underlyingIndexId
  ) external view override returns (OptionSeries[] memory) {
    bytes32[] memory ids = _seriesByUnderlying[underlyingIndexId];
    OptionSeries[] memory list = new OptionSeries[](ids.length);
    for (uint256 i = 0; i < ids.length; i++) {
      list[i] = _series[ids[i]];
    }
    return list;
  }

  function getSeries(bytes32 seriesId) external view override returns (OptionSeries memory) {
    OptionSeries memory s = _series[seriesId];
    if (s.seriesId == bytes32(0)) revert SeriesNotFound();
    return s;
  }

  function getExpiryConfig() external view override returns (ExpiryConfig memory) {
    return _expiryConfig;
  }

  function createSeries(
    bytes32 underlyingIndexId,
    uint256 strike,
    uint256 expiry,
    uint256 lotSize,
    uint8 optionType,
    uint256 maxPriceDeviationCapBps
  ) public onlyRole(OPERATOR_ROLE) returns (bytes32 seriesId) {
    if (expiry <= block.timestamp || strike == 0 || lotSize == 0) revert InvalidParameters();

    seriesId = keccak256(
      abi.encodePacked(
        underlyingIndexId,
        strike,
        expiry,
        lotSize,
        optionType,
        maxPriceDeviationCapBps
      )
    );
    if (_series[seriesId].seriesId != bytes32(0)) revert SeriesAlreadyExists();

    _series[seriesId] = OptionSeries({
      seriesId: seriesId,
      underlyingIndexId: underlyingIndexId,
      strike: strike,
      expiry: expiry,
      lotSize: lotSize,
      optionType: optionType,
      maxPriceDeviationCapBps: maxPriceDeviationCapBps,
      active: true
    });

    _seriesByUnderlying[underlyingIndexId].push(seriesId);

    emit SeriesCreated(seriesId, strike, expiry, optionType);
  }

  function createStrikeLadder(
    bytes32 underlyingIndexId,
    uint256 expiry,
    uint256 lotSize,
    uint256 centerStrike,
    uint256 interval,
    uint256 count
  ) external onlyRole(OPERATOR_ROLE) returns (bytes32[] memory seriesIds) {
    seriesIds = new bytes32[](count * 2);
    uint256 half = count / 2;
    uint256 idx = 0;

    for (uint256 i = 0; i < count; i++) {
      int256 offset = int256(i) - int256(half);
      uint256 strike = uint256(int256(centerStrike) + (offset * int256(interval)));

      // CALL
      seriesIds[idx++] = createSeries(underlyingIndexId, strike, expiry, lotSize, 0, 5000);
      // PUT
      seriesIds[idx++] = createSeries(underlyingIndexId, strike, expiry, lotSize, 1, 0);
    }
  }

  function deactivateSeries(bytes32 seriesId) external onlyRole(OPERATOR_ROLE) {
    if (_series[seriesId].seriesId == bytes32(0)) revert SeriesNotFound();
    _series[seriesId].active = false;
    emit SeriesDeactivated(seriesId);
  }
}
