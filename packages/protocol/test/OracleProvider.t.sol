// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

/**
 * @title OracleProviderTest
 * @notice Validates MockOracleProvider unit behaviors and fuzz parameters
 */
contract OracleProviderTest is Test {
  MockOracleProvider public provider;
  address public gov = address(0xABC);
  address public operator = address(0xDEF);
  address public rando = address(0x777);

  bytes32 public constant TEST_BTC = keccak256('BTC');
  bytes32 public constant TEST_ETH = keccak256('ETH');
  bytes32 public constant UNSUPPORTED = keccak256('UNSUPPORTED');

  event PriceSet(
    bytes32 indexed assetId,
    uint256 oldPrice,
    uint256 newPrice,
    address indexed caller
  );
  event TimestampSet(
    bytes32 indexed assetId,
    uint256 oldTimestamp,
    uint256 newTimestamp,
    address indexed caller
  );
  event RoundIdSet(
    bytes32 indexed assetId,
    uint256 oldRoundId,
    uint256 newRoundId,
    address indexed caller
  );
  event HealthSet(bytes32 indexed assetId, bool oldHealth, bool newHealth, address indexed caller);
  event DecimalsSet(
    bytes32 indexed assetId,
    uint8 oldDecimals,
    uint8 newDecimals,
    address indexed caller
  );
  event OfflineStatusSet(
    bytes32 indexed assetId,
    bool oldStatus,
    bool newStatus,
    address indexed caller
  );
  event AssetRegistered(
    bytes32 indexed assetId,
    uint256 price,
    uint8 decimals,
    uint256 updatedAt,
    uint256 roundId,
    address indexed caller
  );
  event AssetRemoved(bytes32 indexed assetId, address indexed caller);

  function setUp() public {
    provider = new MockOracleProvider();

    // Setup access roles
    provider.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    provider.grantRole(provider.TEST_OPERATOR_ROLE(), operator);

    // Warp block.timestamp away from 0
    vm.warp(100000);
  }

  // --- Unit Tests ---

  function testRegisterAssetSuccess() public {
    vm.prank(operator);
    vm.expectEmit(true, false, false, true);
    emit AssetRegistered(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1, operator);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    MockOracleProvider.MockFeed memory feed = provider.getMockFeed(TEST_BTC);
    assertTrue(feed.isRegistered);
    assertTrue(feed.isHealthy);
    assertFalse(feed.isOffline);
    assertEq(feed.priceData.price, 60000 * 10 ** 8);
    assertEq(feed.priceData.decimals, 8);
    assertEq(feed.priceData.updatedAt, block.timestamp);
    assertEq(feed.priceData.roundId, 1);
    assertEq(feed.priceData.providerId, provider.PROVIDER_ID());
  }

  function testRegisterDuplicateRevert() public {
    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectRevert(abi.encodeWithSelector(Errors.EntryAlreadyExists.selector, TEST_BTC));
    provider.registerAsset(TEST_BTC, 61000 * 10 ** 8, 8, block.timestamp, 2);
    vm.stopPrank();
  }

  function testSetPrice() public {
    vm.startPrank(operator);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectEmit(true, false, false, true);
    emit PriceSet(TEST_BTC, 60000 * 10 ** 8, 65000 * 10 ** 8, operator);
    provider.setPrice(TEST_BTC, 65000 * 10 ** 8);
    vm.stopPrank();

    assertEq(provider.getLatestPrice(TEST_BTC), 65000 * 10 ** 8);
  }

  function testSetTimestamp() public {
    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectEmit(true, false, false, true);
    emit TimestampSet(TEST_BTC, block.timestamp, block.timestamp - 100, gov);
    provider.setTimestamp(TEST_BTC, block.timestamp - 100);
    vm.stopPrank();

    assertEq(provider.getUpdatedAt(TEST_BTC), block.timestamp - 100);
  }

  function testSetDecimals() public {
    vm.startPrank(operator);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectEmit(true, false, false, true);
    emit DecimalsSet(TEST_BTC, 8, 18, operator);
    provider.setDecimals(TEST_BTC, 18);
    vm.stopPrank();

    assertEq(provider.getDecimals(TEST_BTC), 18);
  }

  function testSetRoundId() public {
    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectEmit(true, false, false, true);
    emit RoundIdSet(TEST_BTC, 1, 99, gov);
    provider.setRoundId(TEST_BTC, 99);
    vm.stopPrank();

    assertEq(provider.getLatestRound(TEST_BTC).roundId, 99);
  }

  function testSetHealth() public {
    vm.startPrank(operator);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectEmit(true, false, false, true);
    emit HealthSet(TEST_BTC, true, false, operator);
    provider.setHealth(TEST_BTC, false);
    vm.stopPrank();

    assertFalse(provider.isHealthy(TEST_BTC));
  }

  function testSetOffline() public {
    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectEmit(true, false, false, true);
    emit OfflineStatusSet(TEST_BTC, false, true, gov);
    provider.setOffline(TEST_BTC, true);
    vm.stopPrank();

    assertFalse(provider.isHealthy(TEST_BTC));
    vm.expectRevert(abi.encodeWithSelector(Errors.EntryDoesNotExist.selector, TEST_BTC));
    provider.getLatestPrice(TEST_BTC);
  }

  function testRemoveAsset() public {
    vm.startPrank(operator);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectEmit(true, false, false, true);
    emit AssetRemoved(TEST_BTC, operator);
    provider.removeAsset(TEST_BTC);
    vm.stopPrank();

    assertFalse(provider.isHealthy(TEST_BTC));
    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, TEST_BTC));
    provider.getLatestPrice(TEST_BTC);
  }

  function testUnsupportedAsset() public {
    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, UNSUPPORTED));
    provider.getLatestPrice(UNSUPPORTED);

    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, UNSUPPORTED));
    provider.getLatestRound(UNSUPPORTED);
  }

  function testStaleAsset() public {
    vm.startPrank(gov);
    // Stale timestamp (more than 1 hour ago)
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp - 3601, 1);
    vm.stopPrank();

    // Healthy should return false due to staleness logic inside mock
    assertFalse(provider.isHealthy(TEST_BTC));
  }

  function testUnhealthyAsset() public {
    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);
    provider.setHealth(TEST_BTC, false);
    vm.stopPrank();

    assertFalse(provider.isHealthy(TEST_BTC));
  }

  function testRevertNegativePrice() public {
    vm.startPrank(operator);
    provider.registerAsset(TEST_BTC, uint256(int256(-1)), 8, block.timestamp, 1);
    vm.stopPrank();

    vm.expectRevert(
      abi.encodeWithSelector(Errors.OracleProviderPriceNegative.selector, TEST_BTC, int256(-1))
    );
    provider.getLatestPrice(TEST_BTC);
  }

  function testUnauthorizedRoleRevert() public {
    vm.startPrank(rando);
    bytes32 testOperatorRole = provider.TEST_OPERATOR_ROLE();

    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        rando,
        testOperatorRole
      )
    );
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);

    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        rando,
        testOperatorRole
      )
    );
    provider.removeAsset(TEST_BTC);
    vm.stopPrank();
  }

  // --- Fuzz Tests ---

  function testFuzzPriceRaw(uint256 price, uint8 decimals) public {
    // Restrict decimals to avoid overflow during scaling
    vm.assume(decimals > 0 && decimals <= 24);
    // Restrict price to ensure it doesn't cause overflow on multiply and fits signed bounds
    vm.assume(price > 0 && price < type(uint256).max / 10 ** 18 && int256(price) > 0);

    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, price, decimals, block.timestamp, 1);
    vm.stopPrank();

    uint256 latestPrice = provider.getLatestPrice(TEST_BTC);
    assertEq(latestPrice, price);

    vm.startPrank(gov);
    provider.removeAsset(TEST_BTC);
    vm.stopPrank();
  }

  function testFuzzTimestamp(uint256 timestamp) public {
    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);
    provider.setTimestamp(TEST_BTC, timestamp);
    vm.stopPrank();

    assertEq(provider.getUpdatedAt(TEST_BTC), timestamp);

    vm.startPrank(gov);
    provider.removeAsset(TEST_BTC);
    vm.stopPrank();
  }

  function testFuzzDecimals(uint8 decimals) public {
    vm.assume(decimals > 0 && decimals <= 24);

    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);
    provider.setDecimals(TEST_BTC, decimals);
    vm.stopPrank();

    assertEq(provider.getDecimals(TEST_BTC), decimals);

    vm.startPrank(gov);
    provider.removeAsset(TEST_BTC);
    vm.stopPrank();
  }

  function testFuzzRoundId(uint256 roundId) public {
    vm.startPrank(gov);
    provider.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);
    provider.setRoundId(TEST_BTC, roundId);
    vm.stopPrank();

    assertEq(provider.getLatestRound(TEST_BTC).roundId, roundId);

    vm.startPrank(gov);
    provider.removeAsset(TEST_BTC);
    vm.stopPrank();
  }

  function testFuzzAssetId(bytes32 assetId) public {
    vm.assume(assetId != bytes32(0));

    vm.startPrank(gov);
    provider.registerAsset(assetId, 60000 * 10 ** 8, 8, block.timestamp, 1);
    vm.stopPrank();

    assertTrue(provider.isHealthy(assetId));

    vm.startPrank(gov);
    provider.removeAsset(assetId);
    vm.stopPrank();
  }
}
