// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/interfaces/IStrategyManager.sol';

contract StrategyManagerTest is Test {
  StrategyManager public strategyManager;

  address public admin = address(0x1);
  address public user = address(0x2);

  address public wbtc = address(0x10);
  address public weth = address(0x20);
  address public usdc = address(0x30);
  address public sol = address(0x40);

  function setUp() public {
    address[] memory assets = new address[](2);
    assets[0] = wbtc;
    assets[1] = weth;

    uint256[] memory weights = new uint256[](2);
    weights[0] = 5000; // 50.00%
    weights[1] = 5000; // 50.00%

    strategyManager = new StrategyManager(admin, assets, weights);
  }

  // --- Initial Deployment Tests ---

  function test_InitialState() public {
    assertTrue(strategyManager.hasRole(strategyManager.DEFAULT_ADMIN_ROLE(), admin));
    assertTrue(strategyManager.hasRole(AccessRoles.GOVERNANCE_ROLE, admin));

    assertEq(strategyManager.getAssetCount(), 2);
    assertEq(strategyManager.getTotalAllocationBps(), 10000);
    assertTrue(strategyManager.isSupportedAsset(wbtc));
    assertTrue(strategyManager.isSupportedAsset(weth));
    assertFalse(strategyManager.isSupportedAsset(usdc));

    assertEq(strategyManager.getAssetWeight(wbtc), 5000);
    assertEq(strategyManager.getAssetWeight(weth), 5000);
  }

  function test_ConstructorZeroAddressRevert() public {
    address[] memory assets = new address[](0);
    uint256[] memory weights = new uint256[](0);

    vm.expectRevert(IStrategyManager.ZeroAddressDetected.selector);
    new StrategyManager(address(0), assets, weights);
  }

  // --- setStrategy Tests ---

  function test_SetStrategySuccess() public {
    address[] memory assets = new address[](3);
    assets[0] = wbtc;
    assets[1] = weth;
    assets[2] = usdc;

    uint256[] memory weights = new uint256[](3);
    weights[0] = 4000; // 40%
    weights[1] = 4000; // 40%
    weights[2] = 2000; // 20%

    vm.startPrank(admin);
    vm.expectEmit(false, false, false, true);
    emit IStrategyManager.StrategyUpdated(assets, weights, admin);

    strategyManager.setStrategy(assets, weights);
    vm.stopPrank();

    assertEq(strategyManager.getAssetCount(), 3);
    assertEq(strategyManager.getTotalAllocationBps(), 10000);
    assertEq(strategyManager.getAssetWeight(wbtc), 4000);
    assertEq(strategyManager.getAssetWeight(weth), 4000);
    assertEq(strategyManager.getAssetWeight(usdc), 2000);
  }

  function test_SetStrategyLengthMismatchRevert() public {
    address[] memory assets = new address[](2);
    assets[0] = wbtc;
    assets[1] = weth;

    uint256[] memory weights = new uint256[](1);
    weights[0] = 10000;

    vm.prank(admin);
    vm.expectRevert(IStrategyManager.ArrayLengthMismatch.selector);
    strategyManager.setStrategy(assets, weights);
  }

  function test_SetStrategyInvalidTotalAllocationRevert() public {
    address[] memory assets = new address[](2);
    assets[0] = wbtc;
    assets[1] = weth;

    uint256[] memory weights = new uint256[](2);
    weights[0] = 5000;
    weights[1] = 4000; // Sum = 9000 BPS != 10000

    vm.prank(admin);
    vm.expectRevert(
      abi.encodeWithSelector(IStrategyManager.InvalidTotalAllocation.selector, 9000, 10000)
    );
    strategyManager.setStrategy(assets, weights);
  }

  function test_SetStrategyZeroWeightRevert() public {
    address[] memory assets = new address[](2);
    assets[0] = wbtc;
    assets[1] = weth;

    uint256[] memory weights = new uint256[](2);
    weights[0] = 10000;
    weights[1] = 0;

    vm.prank(admin);
    vm.expectRevert(IStrategyManager.ZeroWeightNotAllowed.selector);
    strategyManager.setStrategy(assets, weights);
  }

  function test_SetStrategyDuplicateAssetRevert() public {
    address[] memory assets = new address[](2);
    assets[0] = wbtc;
    assets[1] = wbtc;

    uint256[] memory weights = new uint256[](2);
    weights[0] = 5000;
    weights[1] = 5000;

    vm.prank(admin);
    vm.expectRevert(abi.encodeWithSelector(IStrategyManager.AssetAlreadySupported.selector, wbtc));
    strategyManager.setStrategy(assets, weights);
  }

  // --- addAsset & removeAsset Tests ---

  function test_AddAssetRevertsIfSumExceeds10000() public {
    vm.startPrank(admin);
    vm.expectRevert(
      abi.encodeWithSelector(IStrategyManager.InvalidTotalAllocation.selector, 12000, 10000)
    );
    strategyManager.addAsset(usdc, 2000);
    vm.stopPrank();
  }

  function test_AddAndRemoveAssetWorkflow() public {
    vm.startPrank(admin);
    // Set 3 asset strategy: WBTC (40%), WETH (40%), USDC (20%)
    address[] memory assets = new address[](3);
    assets[0] = wbtc;
    assets[1] = weth;
    assets[2] = usdc;
    uint256[] memory weights = new uint256[](3);
    weights[0] = 4000;
    weights[1] = 4000;
    weights[2] = 2000;

    strategyManager.setStrategy(assets, weights);
    assertEq(strategyManager.getAssetCount(), 3);

    // Update weights to give 50%/50% to WBTC/WETH before removing USDC
    address[] memory updateAssets = new address[](3);
    updateAssets[0] = wbtc;
    updateAssets[1] = weth;
    updateAssets[2] = usdc;

    uint256[] memory updateWeights = new uint256[](3);
    updateWeights[0] = 5000;
    updateWeights[1] = 5000;
    updateWeights[2] = 0; // Will revert ZeroWeightNotAllowed

    vm.expectRevert(IStrategyManager.ZeroWeightNotAllowed.selector);
    strategyManager.updateWeights(updateAssets, updateWeights);

    // Set 2 asset strategy directly
    address[] memory twoAssets = new address[](2);
    twoAssets[0] = wbtc;
    twoAssets[1] = weth;
    uint256[] memory twoWeights = new uint256[](2);
    twoWeights[0] = 5000;
    twoWeights[1] = 5000;

    strategyManager.setStrategy(twoAssets, twoWeights);
    assertFalse(strategyManager.isSupportedAsset(usdc));
    assertEq(strategyManager.getAssetCount(), 2);
    vm.stopPrank();
  }

  // --- updateWeights Tests ---

  function test_UpdateWeightsSuccess() public {
    address[] memory assets = new address[](2);
    assets[0] = wbtc;
    assets[1] = weth;

    uint256[] memory newWeights = new uint256[](2);
    newWeights[0] = 7000; // 70%
    newWeights[1] = 3000; // 30%

    vm.prank(admin);
    strategyManager.updateWeights(assets, newWeights);

    assertEq(strategyManager.getAssetWeight(wbtc), 7000);
    assertEq(strategyManager.getAssetWeight(weth), 3000);
    assertEq(strategyManager.getTotalAllocationBps(), 10000);
  }

  function test_UpdateWeightsUnsupportedAssetRevert() public {
    address[] memory assets = new address[](1);
    assets[0] = sol; // Not in strategy

    uint256[] memory weights = new uint256[](1);
    weights[0] = 10000;

    vm.prank(admin);
    vm.expectRevert(
      abi.encodeWithSelector(IStrategyManager.AssetNotSupportedByStrategy.selector, sol)
    );
    strategyManager.updateWeights(assets, weights);
  }

  // --- Access Control Tests ---

  function test_UnauthorizedCallerRevert() public {
    address[] memory assets = new address[](2);
    assets[0] = wbtc;
    assets[1] = weth;
    uint256[] memory weights = new uint256[](2);
    weights[0] = 5000;
    weights[1] = 5000;

    vm.startPrank(user);
    vm.expectRevert(
      abi.encodeWithSelector(
        bytes4(keccak256('AccessControlUnauthorizedAccount(address,bytes32)')),
        user,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    strategyManager.setStrategy(assets, weights);

    vm.expectRevert(
      abi.encodeWithSelector(
        bytes4(keccak256('AccessControlUnauthorizedAccount(address,bytes32)')),
        user,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    strategyManager.addAsset(usdc, 1000);
    vm.stopPrank();
  }

  // --- View Function Tests ---

  function test_GetTargetWeights() public {
    (address[] memory assets, uint256[] memory weights) = strategyManager.getTargetWeights();
    assertEq(assets.length, 2);
    assertEq(weights.length, 2);
    assertEq(assets[0], wbtc);
    assertEq(assets[1], weth);
    assertEq(weights[0], 5000);
    assertEq(weights[1], 5000);
  }

  function test_GetAssetWeightNonExistentRevert() public {
    vm.expectRevert(
      abi.encodeWithSelector(IStrategyManager.AssetNotSupportedByStrategy.selector, usdc)
    );
    strategyManager.getAssetWeight(usdc);
  }
}
