// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IUVNiftyIndexManager {
  struct Component {
    bytes32 assetId;
    address oracle;
    uint256 weightBps; // Sum must equal 10,000 BPS
    uint256 referencePrice;
    uint8 priceDecimals;
    bool active;
  }

  struct Epoch {
    uint256 epochId;
    uint256 startTime;
    uint256 baseIndexValue;
    uint256 divisor;
  }

  event EpochRebalanced(uint256 indexed newEpochId, uint256 newBaseValue, uint256 divisor);
  event ComponentUpdated(bytes32 indexed assetId, uint256 weightBps, bool active);

  function getComponents() external view returns (Component[] memory);
  function getComponent(bytes32 assetId) external view returns (Component memory);
  function getIndexPrice() external view returns (uint256 indexPrice, uint256 updatedAt);
  function getIndexTWAP(
    uint256 startTime,
    uint256 endTime
  ) external view returns (uint256 twapIndex, bool valid);
  function getCurrentEpoch() external view returns (Epoch memory);
  function getTotalWeightBps() external view returns (uint256);
}
