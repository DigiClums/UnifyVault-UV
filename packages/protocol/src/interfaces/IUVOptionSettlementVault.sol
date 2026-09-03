// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IUVOptionSettlementVault {
  struct SettlementSnapshot {
    bytes32 seriesId;
    uint256 settlementTimestamp;
    uint256 twapIndexPrice; // 18 decimals (15-min TWAP)
    uint256 twapUvbePrice; // 18 decimals (15-min TWAP)
    uint256 intrinsicPayoffPerLot; // 18 decimals
    bool settled;
  }

  event SeriesSettlementSnapshotRecorded(
    bytes32 indexed seriesId,
    uint256 twapIndexPrice,
    uint256 twapUvbePrice
  );
  event SettlementClaimed(
    bytes32 indexed positionId,
    bytes32 indexed seriesId,
    address indexed owner,
    uint256 payoutUvbe,
    uint256 refundCollateralUvbe
  );

  function snapshotSeriesSettlement(bytes32 seriesId) external;
  function claimSettlement(
    bytes32 positionId
  ) external returns (uint256 payoutUvbe, uint256 refundCollateralUvbe);
  function getSettlementSnapshot(
    bytes32 seriesId
  ) external view returns (SettlementSnapshot memory);
}
