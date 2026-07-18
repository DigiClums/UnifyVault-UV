// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

contract OracleManagerTest is Test {
  OracleManager public manager;
  MockOracleProvider public primaryMock;
  MockOracleProvider public fallbackMock;

  address public gov = address(0xABC);
  address public operator = address(0xDEF);

  bytes32 public constant TEST_BTC = keccak256('BTC');
  bytes32 public constant TEST_ETH = keccak256('ETH');
  bytes32 public constant TEST_USDC = keccak256('USDC');
  bytes32 public constant UNSUPPORTED = keccak256('UNSUPPORTED');

  event PrimaryProviderUpdated(
    bytes32 indexed assetId,
    address oldProvider,
    address newProvider,
    address indexed caller
  );
  event FallbackProviderUpdated(
    bytes32 indexed assetId,
    address oldProvider,
    address newProvider,
    address indexed caller
  );
  event ProviderEnabled(bytes32 indexed assetId, address indexed caller);
  event ProviderDisabled(bytes32 indexed assetId, address indexed caller);

  function setUp() public {
    manager = new OracleManager();
    manager.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);

    primaryMock = new MockOracleProvider();
    fallbackMock = new MockOracleProvider();

    // Register default assets in mocks
    // BTC has 8 decimals in primary
    primaryMock.registerAsset(TEST_BTC, 60000 * 10 ** 8, 8, block.timestamp, 1);
    // ETH has 18 decimals in primary
    primaryMock.registerAsset(TEST_ETH, 3000 * 10 ** 18, 18, block.timestamp, 1);
    // USDC has 6 decimals in fallback
    fallbackMock.registerAsset(TEST_USDC, 1 * 10 ** 6, 6, block.timestamp, 1);

    // Register in manager
    vm.startPrank(gov);
    manager.configureAsset(TEST_BTC, address(primaryMock), address(fallbackMock), 3600, true);
    manager.configureAsset(TEST_ETH, address(primaryMock), address(0), 3600, true);
    manager.configureAsset(TEST_USDC, address(primaryMock), address(fallbackMock), 3600, true);
    vm.stopPrank();
  }

  function testPrimaryProviderSuccess() public {
    // BTC has 8 decimals, should normalize to 18 decimals
    uint256 btcPrice = manager.getNormalizedPrice(TEST_BTC);
    assertEq(btcPrice, 60000 * 10 ** 18);

    ProviderPrice memory round = manager.getPrice(TEST_BTC);
    assertEq(round.price, 60000 * 10 ** 18);
    assertEq(round.decimals, 18);
    assertEq(round.updatedAt, block.timestamp);
  }

  function testFallbackProviderSuccess() public {
    // Mock primary provider fails (e.g. by setting USDC offline or negative price)
    primaryMock.registerAsset(TEST_USDC, 0, 6, block.timestamp, 1); // price <= 0

    // Fetching USDC price should hit fallbackMock successfully
    uint256 usdcPrice = manager.getNormalizedPrice(TEST_USDC);
    assertEq(usdcPrice, 1 * 10 ** 18); // 6 decimals normalized to 18 decimals
  }

  function testBothProvidersFailReverts() public {
    // Set primary USDC to negative
    primaryMock.registerAsset(TEST_USDC, 0, 6, block.timestamp, 1);
    // Set fallback USDC to offline
    fallbackMock.setOffline(TEST_USDC, true);

    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, TEST_USDC));
    manager.getPrice(TEST_USDC);
  }

  function testUnsupportedAssetRevert() public {
    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, UNSUPPORTED));
    manager.getPrice(UNSUPPORTED);
  }

  function testStaleProviderWarpRevert() public {
    // Warp block timestamp past heartbeat limit
    vm.warp(block.timestamp + 3601);

    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, TEST_BTC));
    manager.getPrice(TEST_BTC);
  }

  function testUnhealthyProviderRevert() public {
    // Price <= 0 is unhealthy
    primaryMock.setPrice(TEST_BTC, 0);

    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, TEST_BTC));
    manager.getPrice(TEST_BTC);
  }

  function testNormalizationCorrectness() public {
    // Test different decimals
    // 6 decimals
    primaryMock.setPrice(TEST_BTC, 60000 * 10 ** 6);
    primaryMock.setDecimals(TEST_BTC, 6);
    assertEq(manager.getNormalizedPrice(TEST_BTC), 60000 * 10 ** 18);

    // 8 decimals
    primaryMock.setPrice(TEST_BTC, 60000 * 10 ** 8);
    primaryMock.setDecimals(TEST_BTC, 8);
    assertEq(manager.getNormalizedPrice(TEST_BTC), 60000 * 10 ** 18);

    // 18 decimals
    primaryMock.setPrice(TEST_BTC, 60000 * 10 ** 18);
    primaryMock.setDecimals(TEST_BTC, 18);
    assertEq(manager.getNormalizedPrice(TEST_BTC), 60000 * 10 ** 18);
  }

  function testGovernanceConfigurePermissions() public {
    address rando = address(0x999);
    vm.prank(rando);
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        rando,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    manager.configureAsset(TEST_BTC, address(primaryMock), address(0), 1800, true);

    // Gov updates successfully
    vm.startPrank(gov);
    vm.expectEmit(true, false, false, true);
    emit PrimaryProviderUpdated(TEST_BTC, address(primaryMock), address(fallbackMock), gov);
    manager.configureAsset(TEST_BTC, address(fallbackMock), address(0), 1800, true);
    vm.stopPrank();

    assertEq(manager.getProvider(TEST_BTC), address(fallbackMock));
  }

  function testIOracleAddressCompatibility() public {
    address mockCollateral = address(0x555);
    bytes32 assetId = bytes32(uint256(uint160(mockCollateral)));

    primaryMock.registerAsset(assetId, 60000 * 10 ** 8, 8, block.timestamp, 1);

    // Configure manager
    vm.startPrank(gov);
    manager.configureAsset(assetId, address(primaryMock), address(0), 3600, true);
    vm.stopPrank();

    uint256 price = manager.getAssetPrice(mockCollateral);
    assertEq(price, 60000 * 10 ** 18);

    assertTrue(manager.isPriceFresh(mockCollateral));

    (address prov, uint256 hb) = manager.getFeedMetadata(mockCollateral);
    assertEq(prov, address(primaryMock));
    assertEq(hb, 3600);
  }

  // --- Fuzz Tests ---

  function testFuzzPriceNormalization(bytes32 assetId, uint256 rawPrice, uint8 decimals) public {
    vm.assume(
      assetId != bytes32(0) && assetId != TEST_BTC && assetId != TEST_ETH && assetId != TEST_USDC
    );
    vm.assume(decimals > 0 && decimals <= 24);
    // Restrict rawPrice so it doesn't cause overflow on conversion
    vm.assume(rawPrice > 0 && rawPrice < type(uint256).max / 10 ** 18);

    primaryMock.registerAsset(assetId, rawPrice, decimals, block.timestamp, 1);

    vm.startPrank(gov);
    manager.configureAsset(assetId, address(primaryMock), address(0), 3600, true);
    vm.stopPrank();

    uint256 normalizedPrice = manager.getNormalizedPrice(assetId);

    if (decimals == 18) {
      assertEq(normalizedPrice, rawPrice);
    } else if (decimals < 18) {
      assertEq(normalizedPrice, rawPrice * (10 ** (18 - decimals)));
    } else {
      assertEq(normalizedPrice, rawPrice / (10 ** (decimals - 18)));
    }
  }
}
