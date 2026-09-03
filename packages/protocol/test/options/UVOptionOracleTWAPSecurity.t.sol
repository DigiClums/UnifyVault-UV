// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/options/UVNiftyIndexManager.sol';
import '../../src/options/UVOptionSettlementVault.sol';
import '../../src/interfaces/IOracleManager.sol';

contract MockMaliciousOracle is IOracleManager {
  bool public forceStale;
  bool public forceInvalid;
  uint256 public btcPrice = 60000e18;

  function setStale(bool _stale) external {
    forceStale = _stale;
  }

  function setInvalid(bool _invalid) external {
    forceInvalid = _invalid;
  }

  function recordObservation(bytes32) external pure override returns (uint192) {
    return 1e18;
  }

  function getPrice(bytes32 assetId) external view override returns (PriceRound memory) {
    if (forceInvalid) revert('INVALID_PRICE');
    uint256 updated = forceStale ? block.timestamp - 2 days : block.timestamp;
    return
      PriceRound({
        price: btcPrice,
        decimals: 18,
        updatedAt: updated,
        roundId: 1,
        providerId: 'ORACLE'
      });
  }

  function getNormalizedPrice(bytes32) external view override returns (uint256) {
    if (forceInvalid) revert('INVALID_PRICE');
    return btcPrice;
  }

  function isHealthy(bytes32) external view override returns (bool) {
    return !forceStale && !forceInvalid;
  }

  function isPriceFresh(bytes32) external view override returns (bool) {
    return !forceStale;
  }

  function getHistoricalTWAP(
    bytes32,
    uint256,
    uint256
  ) external view override returns (uint256, bool) {
    if (forceInvalid || forceStale) return (0, false);
    return (btcPrice, true);
  }
}

contract UVOptionOracleTWAPSecurityTest is Test {
  UVNiftyIndexManager public indexManager;
  MockMaliciousOracle public oracle;

  bytes32 public btcId = keccak256('BTC');
  bytes32 public ethId = keccak256('ETH');

  function setUp() public {
    oracle = new MockMaliciousOracle();
    indexManager = new UVNiftyIndexManager(address(this), address(oracle));
    indexManager.registerComponent(btcId, address(oracle), 6000, 60000e18, 18);
    indexManager.registerComponent(ethId, address(oracle), 4000, 3000e18, 18);
  }

  function test_NormalizedPriceCalculation() public view {
    (uint256 price, uint256 updatedAt) = indexManager.getIndexPrice();
    assertEq(price, 1000e18, 'Index spot price must scale correctly with 18 decimals');
    assertEq(updatedAt, block.timestamp);
  }

  function test_RevertOnInvalidOraclePrice() public {
    oracle.setInvalid(true);
    vm.expectRevert();
    indexManager.getIndexPrice();
  }

  function test_TWAPFailsOnStaleData() public {
    oracle.setStale(true);
    (, bool valid) = indexManager.getIndexTWAP(block.timestamp - 15 minutes, block.timestamp);
    assertFalse(valid, 'TWAP must return invalid on stale oracle');
  }
}
