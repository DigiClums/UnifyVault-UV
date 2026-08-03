// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/errors/Errors.sol';

contract OracleCircuitBreakerTest is Test {
  OracleManager public oracleManager;
  MockOracleProvider public primaryProvider;
  MockOracleProvider public fallbackProvider;

  bytes32 public assetId = bytes32(uint256(uint160(address(0x1234))));
  address public assetAddress = address(0x1234);

  function setUp() public {
    vm.warp(100000);
    oracleManager = new OracleManager();
    primaryProvider = new MockOracleProvider();
    fallbackProvider = new MockOracleProvider();

    primaryProvider.registerAsset(assetId, 1000e18, 18, block.timestamp, 1);
    fallbackProvider.registerAsset(assetId, 1010e18, 18, block.timestamp, 1);

    oracleManager.configureAsset(
      assetId,
      address(primaryProvider),
      address(fallbackProvider),
      3600,
      true
    );
  }

  function test_PrimaryOracleNormalPrice() public {
    uint256 price = oracleManager.getAssetPrice(assetAddress);
    assertEq(price, 1000e18);
  }

  function test_StalePriceTriggersFallbackOrRevert() public {
    // Set timestamp of both primary and fallback to old timestamp
    primaryProvider.setTimestamp(assetId, block.timestamp - 7200);
    fallbackProvider.setTimestamp(assetId, block.timestamp - 7200);

    // Both primary and fallback are stale -> revert UnsafePricing
    vm.expectRevert(abi.encodeWithSelector(Errors.UnsafePricing.selector, assetAddress));
    oracleManager.getAssetPrice(assetAddress);

    // Make fallback fresh
    fallbackProvider.setTimestamp(assetId, block.timestamp);
    fallbackProvider.setPrice(assetId, 1005e18);
    uint256 fallbackPrice = oracleManager.getAssetPrice(assetAddress);
    assertEq(fallbackPrice, 1005e18);
  }

  function test_InvalidPriceProtection() public {
    // Primary returns 0 price
    primaryProvider.setPrice(assetId, 0);

    // Fallback is valid -> returns fallback price
    uint256 price = oracleManager.getAssetPrice(assetAddress);
    assertEq(price, 1010e18);

    // Fallback returns 0 price -> revert UnsafePricing
    fallbackProvider.setPrice(assetId, 0);
    vm.expectRevert(abi.encodeWithSelector(Errors.UnsafePricing.selector, assetAddress));
    oracleManager.getAssetPrice(assetAddress);
  }

  function test_MaxDeviationCircuitBreaker() public {
    // Initialize lastValidPrice = 1000e18
    oracleManager.getValidatedPrice(assetId);

    // Primary jumps by 20% (from 1000 to 1200), max deviation is 10% (1000 BPS)
    primaryProvider.setPrice(assetId, 1200e18);

    // Fallback stays at 1010e18 (within 10% deviation)
    vm.expectEmit(true, true, false, true);
    emit OracleManager.OracleFallback(assetAddress, address(fallbackProvider), 1010e18);
    uint256 price = oracleManager.getValidatedPrice(assetId);
    assertEq(price, 1010e18);
  }

  function test_RevertOnUnsafePricingWhenAllProvidersFail() public {
    // Make primary stale and fallback invalid
    primaryProvider.setTimestamp(assetId, block.timestamp - 7200);
    fallbackProvider.setPrice(assetId, 0);

    vm.expectRevert(abi.encodeWithSelector(Errors.UnsafePricing.selector, assetAddress));
    oracleManager.getAssetPrice(assetAddress);
  }
}
