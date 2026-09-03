// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IUVOptionPositionManager {
  struct Position {
    bytes32 positionId;
    bytes32 seriesId;
    address trader;
    bool isLong; // true = Buyer, false = Writer
    uint256 quantityLots; // Integer count of lots (e.g. 1, 2, 10)
    uint256 entryPremiumUvbe;
    uint256 lockedCollateralUvbe;
    bool isOpen;
    bool isSettled;
  }

  event PositionOpened(
    bytes32 indexed positionId,
    bytes32 indexed seriesId,
    address indexed trader,
    bool isLong,
    uint256 quantityLots
  );
  event PositionClosed(bytes32 indexed positionId, uint256 quantityClosed, uint256 netReceiptUvbe);
  event PositionMarkedSettled(bytes32 indexed positionId);

  function openPosition(
    bytes32 seriesId,
    bool isLong,
    uint256 quantityLots
  ) external returns (bytes32 positionId);

  function closePosition(bytes32 positionId, uint256 quantityLots) external;
  function markPositionSettled(bytes32 positionId) external;
  function getPosition(bytes32 positionId) external view returns (Position memory);
  function getTraderPositions(address trader) external view returns (bytes32[] memory);
}
