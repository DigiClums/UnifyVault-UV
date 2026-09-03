// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IUVOptionSettlementVault.sol';
import '../interfaces/IUVOptionMarketFactory.sol';
import '../interfaces/IUVOptionPositionManager.sol';
import '../interfaces/IUVNiftyIndexManager.sol';
import '../interfaces/IOracleManager.sol';
import '../interfaces/IUVLiquidityVault.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVOptionSettlementVault
 * @notice Executes 15-minute TWAP series settlement snapshots and position payout claims.
 */
contract UVOptionSettlementVault is AccessControl, IUVOptionSettlementVault {
  bytes32 public constant OPERATOR_ROLE = keccak256('MARKET_OPERATOR_ROLE');

  IUVOptionMarketFactory public marketFactory;
  IUVOptionPositionManager public positionManager;
  IUVNiftyIndexManager public indexManager;
  IOracleManager public oracleManager;
  IUVLiquidityVault public liquidityVault;
  bytes32 public uvbeAssetId;

  mapping(bytes32 => SettlementSnapshot) private _snapshots;

  error SeriesNotExpired();
  error SnapshotAlreadyRecorded();
  error SnapshotNotRecorded();
  error PositionAlreadySettled();
  error Unauthorized();
  error ZeroAddress();

  constructor(
    address admin,
    address _marketFactory,
    address _positionManager,
    address _indexManager,
    address _oracleManager,
    address _liquidityVault,
    bytes32 _uvbeAssetId
  ) {
    if (
      admin == address(0) ||
      _marketFactory == address(0) ||
      _positionManager == address(0) ||
      _indexManager == address(0) ||
      _oracleManager == address(0) ||
      _liquidityVault == address(0)
    ) {
      revert ZeroAddress();
    }

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(OPERATOR_ROLE, admin);

    marketFactory = IUVOptionMarketFactory(_marketFactory);
    positionManager = IUVOptionPositionManager(_positionManager);
    indexManager = IUVNiftyIndexManager(_indexManager);
    oracleManager = IOracleManager(_oracleManager);
    liquidityVault = IUVLiquidityVault(_liquidityVault);
    uvbeAssetId = _uvbeAssetId;
  }

  function snapshotSeriesSettlement(bytes32 seriesId) external override onlyRole(OPERATOR_ROLE) {
    IUVOptionMarketFactory.OptionSeries memory s = marketFactory.getSeries(seriesId);
    if (block.timestamp < s.expiry + 900 seconds) revert SeriesNotExpired();
    if (_snapshots[seriesId].settled) revert SnapshotAlreadyRecorded();

    // 1. Fetch 15-Minute TWAP Index & UVBE Price
    (uint256 twapIndex, bool validIndex) = indexManager.getIndexTWAP(
      s.expiry,
      s.expiry + 900 seconds
    );
    (uint256 twapUvbe, bool validUvbe) = oracleManager.getHistoricalTWAP(
      uvbeAssetId,
      s.expiry,
      s.expiry + 900 seconds
    );

    if (!validIndex || !validUvbe || twapUvbe == 0) {
      twapUvbe = 1e18; // 1:1 fallback
      (twapIndex, ) = indexManager.getIndexPrice();
    }

    // 2. Compute Intrinsic Payoff Per Lot (USD)
    uint256 intrinsicUsd = 0;
    if (s.optionType == 0) {
      // Capped CALL Payoff
      if (twapIndex > s.strike) {
        uint256 diff = twapIndex - s.strike;
        uint256 capDiff = (s.strike * s.maxPriceDeviationCapBps) / 10000;
        uint256 cappedDiff = diff > capDiff ? capDiff : diff;
        intrinsicUsd = (cappedDiff * s.lotSize) / 1e18;
      }
    } else {
      // Defined-Risk PUT Payoff
      if (s.strike > twapIndex) {
        intrinsicUsd = ((s.strike - twapIndex) * s.lotSize) / 1e18;
      }
    }

    uint256 intrinsicPayoffPerLotUvbe = (intrinsicUsd * 1e18) / twapUvbe;

    _snapshots[seriesId] = SettlementSnapshot({
      seriesId: seriesId,
      settlementTimestamp: block.timestamp,
      twapIndexPrice: twapIndex,
      twapUvbePrice: twapUvbe,
      intrinsicPayoffPerLot: intrinsicPayoffPerLotUvbe,
      settled: true
    });

    emit SeriesSettlementSnapshotRecorded(seriesId, twapIndex, twapUvbe);
  }

  function claimSettlement(
    bytes32 positionId
  ) external override returns (uint256 payoutUvbe, uint256 refundCollateralUvbe) {
    IUVOptionPositionManager.Position memory pos = positionManager.getPosition(positionId);
    if (pos.trader != msg.sender) revert Unauthorized();
    if (pos.isSettled || !pos.isOpen) revert PositionAlreadySettled();

    SettlementSnapshot memory snap = _snapshots[pos.seriesId];
    if (!snap.settled) revert SnapshotNotRecorded();

    positionManager.markPositionSettled(positionId);

    if (pos.isLong) {
      // Long Buyer Claim
      payoutUvbe = pos.quantityLots * snap.intrinsicPayoffPerLot;
      refundCollateralUvbe = 0;

      if (payoutUvbe > 0) {
        liquidityVault.transferSeriesSettlementPayout(pos.seriesId, msg.sender, payoutUvbe);
      }
    } else {
      // Short Writer Claim (Collateral Refund - Actual Payoff Liability)
      uint256 totalPayoffLiability = pos.quantityLots * snap.intrinsicPayoffPerLot;
      payoutUvbe = 0;

      if (pos.lockedCollateralUvbe > totalPayoffLiability) {
        refundCollateralUvbe = pos.lockedCollateralUvbe - totalPayoffLiability;
        liquidityVault.releaseCollateral(
          positionId,
          pos.seriesId,
          msg.sender,
          refundCollateralUvbe
        );
      }
    }

    emit SettlementClaimed(positionId, pos.seriesId, msg.sender, payoutUvbe, refundCollateralUvbe);
  }

  function getSettlementSnapshot(
    bytes32 seriesId
  ) external view override returns (SettlementSnapshot memory) {
    return _snapshots[seriesId];
  }
}
