// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

contract OracleManagerHandler is Test {
  OracleManager public manager;
  MockOracleProvider public primaryMock;
  MockOracleProvider public fallbackMock;

  bytes32[] public activeAssets;
  mapping(bytes32 => bool) public isActive;

  mapping(bytes32 => address) public expectedPrimary;
  mapping(bytes32 => address) public expectedFallback;
  mapping(bytes32 => uint32) public expectedHeartbeat;
  mapping(bytes32 => bool) public expectedEnabled;

  constructor(OracleManager _manager, MockOracleProvider _primary, MockOracleProvider _fallback) {
    manager = _manager;
    primaryMock = _primary;
    fallbackMock = _fallback;
  }

  function configureAsset(
    bytes32 assetId,
    uint256 price,
    uint8 decimals,
    uint32 heartbeat,
    bool enabled
  ) public {
    vm.assume(assetId != bytes32(0));
    vm.assume(heartbeat > 0);
    vm.assume(price > 0 && price < type(uint256).max / 10 ** 18 && int256(price) > 0);
    vm.assume(decimals > 0 && decimals <= 24);

    primaryMock.registerAsset(assetId, price, decimals, block.timestamp, 1);
    fallbackMock.registerAsset(assetId, price, decimals, block.timestamp, 1);

    manager.configureAsset(
      assetId,
      address(primaryMock),
      address(fallbackMock),
      heartbeat,
      enabled
    );

    if (!isActive[assetId]) {
      activeAssets.push(assetId);
      isActive[assetId] = true;
    }

    expectedPrimary[assetId] = address(primaryMock);
    expectedFallback[assetId] = address(fallbackMock);
    expectedHeartbeat[assetId] = heartbeat;
    expectedEnabled[assetId] = enabled;
  }

  function setProviderState(
    uint256 assetIdx,
    bool primaryOffline,
    bool fallbackOffline,
    uint256 primaryPrice
  ) public {
    if (activeAssets.length == 0) return;
    bytes32 assetId = activeAssets[assetIdx % activeAssets.length];

    primaryMock.setOffline(assetId, primaryOffline);
    fallbackMock.setOffline(assetId, fallbackOffline);

    if (primaryPrice == 0) {
      primaryMock.setPrice(assetId, 0); // make primary unhealthy
    }
  }

  function getActiveAssets() external view returns (bytes32[] memory) {
    return activeAssets;
  }
}

contract OracleManagerInvariantTest is Test {
  OracleManager public manager;
  MockOracleProvider public primaryMock;
  MockOracleProvider public fallbackMock;
  OracleManagerHandler public handler;

  address[] public targetContracts;

  function setUp() public {
    manager = new OracleManager();
    primaryMock = new MockOracleProvider();
    fallbackMock = new MockOracleProvider();

    handler = new OracleManagerHandler(manager, primaryMock, fallbackMock);
    manager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(handler));

    targetContracts.push(address(handler));
  }

  // Invariant 1: Any successful price read from OracleManager MUST be normalized to 18 decimals
  function invariant_normalizationCorrectness() public {
    bytes32[] memory assets = handler.getActiveAssets();
    for (uint256 i = 0; i < assets.length; i++) {
      bytes32 assetId = assets[i];
      if (handler.expectedEnabled(assetId) && manager.isHealthy(assetId)) {
        ProviderPrice memory round = manager.getPrice(assetId);
        assertEq(round.decimals, 18);
      }
    }
  }

  // Invariant 2: If asset is disabled in coordinator config, it MUST revert on price fetch
  function invariant_disabledProvidersNeverUsed() public {
    bytes32[] memory assets = handler.getActiveAssets();
    for (uint256 i = 0; i < assets.length; i++) {
      bytes32 assetId = assets[i];
      if (!handler.expectedEnabled(assetId)) {
        assertFalse(manager.isHealthy(assetId));
        vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, assetId));
        manager.getPrice(assetId);
      }
    }
  }

  // Invariant 3: Unsupported assets are always unsupported
  function invariant_unsupportedAssetIsolated() public {
    bytes32 unregistered = keccak256('UNREGISTERED_INVARIANT_KEY');
    assertFalse(manager.isHealthy(unregistered));
    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, unregistered));
    manager.getPrice(unregistered);
  }
}
