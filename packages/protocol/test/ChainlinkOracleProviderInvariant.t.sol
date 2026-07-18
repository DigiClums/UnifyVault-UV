// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/oracle/ChainlinkOracleProvider.sol';
import './ChainlinkOracleProvider.t.sol';
import '../src/errors/Errors.sol';

/**
 * @title ChainlinkOracleProviderHandler
 * @notice State handler to manage state updates and verify invariant states during fuzzing
 */
contract ChainlinkOracleProviderHandler is Test {
  ChainlinkOracleProvider public provider;

  bytes32[] public activeAssets;
  mapping(bytes32 => bool) public isActive;

  mapping(bytes32 => address) public expectedFeeds;
  mapping(bytes32 => uint32) public expectedHeartbeats;

  constructor(ChainlinkOracleProvider _provider) {
    provider = _provider;
  }

  function registerFeed(bytes32 assetId, uint8 decimals, int256 price, uint32 heartbeat) public {
    vm.assume(assetId != bytes32(0));
    vm.assume(heartbeat > 0);
    vm.assume(price > 0 && price < int256(type(uint256).max));
    vm.assume(decimals > 0 && decimals <= 24);

    if (isActive[assetId]) return;

    // Deploy mock aggregator
    MockChainlinkAggregator aggregator = new MockChainlinkAggregator(
      decimals,
      price,
      block.timestamp,
      1
    );

    provider.registerFeed(assetId, address(aggregator), heartbeat);

    activeAssets.push(assetId);
    isActive[assetId] = true;
    expectedFeeds[assetId] = address(aggregator);
    expectedHeartbeats[assetId] = heartbeat;
  }

  function updateFeed(uint256 assetIdx, uint8 decimals, int256 price, uint32 heartbeat) public {
    if (activeAssets.length == 0) return;
    bytes32 assetId = activeAssets[assetIdx % activeAssets.length];

    vm.assume(heartbeat > 0);
    vm.assume(price > 0 && price < int256(type(uint256).max));
    vm.assume(decimals > 0 && decimals <= 24);

    MockChainlinkAggregator aggregator = new MockChainlinkAggregator(
      decimals,
      price,
      block.timestamp,
      1
    );

    provider.updateFeed(assetId, address(aggregator), heartbeat);
    expectedFeeds[assetId] = address(aggregator);
    expectedHeartbeats[assetId] = heartbeat;
  }

  function removeFeed(uint256 assetIdx) public {
    if (activeAssets.length == 0) return;
    uint256 index = assetIdx % activeAssets.length;
    bytes32 assetId = activeAssets[index];

    provider.removeFeed(assetId);
    isActive[assetId] = false;

    activeAssets[index] = activeAssets[activeAssets.length - 1];
    activeAssets.pop();
  }

  function getActiveAssets() external view returns (bytes32[] memory) {
    return activeAssets;
  }
}

/**
 * @title ChainlinkOracleProviderInvariantTest
 * @notice Property-based invariant test suite for ChainlinkOracleProvider
 */
contract ChainlinkOracleProviderInvariantTest is Test {
  ChainlinkOracleProvider public provider;
  ChainlinkOracleProviderHandler public handler;
  address[] public targetContracts;

  function setUp() public {
    provider = new ChainlinkOracleProvider();
    handler = new ChainlinkOracleProviderHandler(provider);

    provider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(handler));

    targetContracts.push(address(handler));
  }

  // Invariant 1: Registered feeds are consistent with expected handlers
  function invariant_feedConsistency() public {
    bytes32[] memory assets = handler.getActiveAssets();
    for (uint256 i = 0; i < assets.length; i++) {
      bytes32 assetId = assets[i];
      ChainlinkOracleProvider.FeedConfig memory config = provider.getFeedConfig(assetId);
      assertEq(config.feedAddress, handler.expectedFeeds(assetId));
      assertEq(config.heartbeat, handler.expectedHeartbeats(assetId));
    }
  }

  // Invariant 2: Heartbeats must always be positive
  function invariant_heartbeatInvariants() public {
    bytes32[] memory assets = handler.getActiveAssets();
    for (uint256 i = 0; i < assets.length; i++) {
      bytes32 assetId = assets[i];
      ChainlinkOracleProvider.FeedConfig memory config = provider.getFeedConfig(assetId);
      assertTrue(config.heartbeat > 0);
    }
  }

  // Invariant 3: Unsupported assets remain unsupported (revert on price fetch)
  function invariant_unsupportedReverts() public {
    bytes32 unregistered = keccak256('UNSUPPORTED_INVARIANT');
    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, unregistered));
    provider.getLatestPrice(unregistered);
  }
}
