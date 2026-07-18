// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/errors/Errors.sol';

/**
 * @title MockOracleProviderHandler
 * @notice Intermediary contract to manage state mutations and track expected variables for invariant testing
 */
contract MockOracleProviderHandler is Test {
  MockOracleProvider public provider;

  bytes32[] public activeAssets;
  mapping(bytes32 => bool) public isActive;

  // Track expected state for consistency assertions
  mapping(bytes32 => uint256) public expectedPrices;
  mapping(bytes32 => uint8) public expectedDecimals;
  mapping(bytes32 => uint256) public expectedTimestamps;
  mapping(bytes32 => uint256) public expectedRounds;

  constructor(MockOracleProvider _provider) {
    provider = _provider;
  }

  function registerAsset(
    bytes32 assetId,
    uint256 price,
    uint8 decimals,
    uint256 updatedAt,
    uint256 roundId
  ) public {
    vm.assume(assetId != bytes32(0));
    vm.assume(decimals > 0 && decimals <= 24);
    vm.assume(price > 0 && price < type(uint256).max / 10 ** 18 && int256(price) > 0);

    if (isActive[assetId]) {
      return;
    }

    provider.registerAsset(assetId, price, decimals, updatedAt, roundId);

    activeAssets.push(assetId);
    isActive[assetId] = true;
    expectedPrices[assetId] = price;
    expectedDecimals[assetId] = decimals;
    expectedTimestamps[assetId] = updatedAt;
    expectedRounds[assetId] = roundId;
  }

  function setPrice(uint256 assetIdx, uint256 price) public {
    if (activeAssets.length == 0) return;
    bytes32 assetId = activeAssets[assetIdx % activeAssets.length];
    vm.assume(price > 0 && price < type(uint256).max / 10 ** 18 && int256(price) > 0);

    provider.setPrice(assetId, price);
    expectedPrices[assetId] = price;
  }

  function setTimestamp(uint256 assetIdx, uint256 timestamp) public {
    if (activeAssets.length == 0) return;
    bytes32 assetId = activeAssets[assetIdx % activeAssets.length];

    provider.setTimestamp(assetId, timestamp);
    expectedTimestamps[assetId] = timestamp;
  }

  function setDecimals(uint256 assetIdx, uint8 decimals) public {
    if (activeAssets.length == 0) return;
    bytes32 assetId = activeAssets[assetIdx % activeAssets.length];
    vm.assume(decimals > 0 && decimals <= 24);

    provider.setDecimals(assetId, decimals);
    expectedDecimals[assetId] = decimals;
  }

  function setRoundId(uint256 assetIdx, uint256 roundId) public {
    if (activeAssets.length == 0) return;
    bytes32 assetId = activeAssets[assetIdx % activeAssets.length];

    provider.setRoundId(assetId, roundId);
    expectedRounds[assetId] = roundId;
  }

  function removeAsset(uint256 assetIdx) public {
    if (activeAssets.length == 0) return;
    uint256 index = assetIdx % activeAssets.length;
    bytes32 assetId = activeAssets[index];

    provider.removeAsset(assetId);
    isActive[assetId] = false;

    // Remove from activeAssets array
    activeAssets[index] = activeAssets[activeAssets.length - 1];
    activeAssets.pop();
  }

  function getActiveAssets() external view returns (bytes32[] memory) {
    return activeAssets;
  }
}

/**
 * @title OracleProviderInvariantTest
 * @notice Invariant test suite verifying the behavior invariants of MockOracleProvider
 */
contract OracleProviderInvariantTest is Test {
  MockOracleProvider public provider;
  MockOracleProviderHandler public handler;
  address[] public targetContracts;

  function setUp() public {
    provider = new MockOracleProvider();
    handler = new MockOracleProviderHandler(provider);

    // Grant handler the roles to configure prices
    provider.grantRole(provider.TEST_OPERATOR_ROLE(), address(handler));

    targetContracts.push(address(handler));
  }

  // Invariant 1: Registered assets always return consistent metadata matching handler expectations
  function invariant_consistentMetadata() public {
    bytes32[] memory assets = handler.getActiveAssets();
    for (uint256 i = 0; i < assets.length; i++) {
      bytes32 assetId = assets[i];

      // Check that provider state matches handler expected state
      ProviderPrice memory data = provider.getLatestRound(assetId);
      assertEq(data.price, handler.expectedPrices(assetId));
      assertEq(data.decimals, handler.expectedDecimals(assetId));
      assertEq(data.updatedAt, handler.expectedTimestamps(assetId));
      assertEq(data.roundId, handler.expectedRounds(assetId));
    }
  }

  // Invariant 2: Removing an asset makes it unavailable (querying it reverts)
  function invariant_removedAssetUnavailable() public {
    bytes32 unregistered = keccak256('UNREGISTERED_INVARIANT');
    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, unregistered));
    provider.getLatestPrice(unregistered);
  }

  // Invariant 3: Decimals remain within supported bounds (<= 24)
  function invariant_decimalsWithinBounds() public {
    bytes32[] memory assets = handler.getActiveAssets();
    for (uint256 i = 0; i < assets.length; i++) {
      bytes32 assetId = assets[i];
      uint8 decimals = provider.getDecimals(assetId);
      assertTrue(decimals > 0 && decimals <= 24);
    }
  }
}
