// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/vault/CostBasisManager.sol';
import '../src/libraries/AccessRoles.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';

contract CostBasisManagerTest is Test {
  CostBasisManager public costBasisManager;

  address public admin = address(0x111);
  address public controller = address(0x222);
  address public user = address(0x333);
  address public rando = address(0x999);

  event DepositRecorded(address indexed user, uint256 assets, uint256 shares);
  event RedemptionRecorded(address indexed user, uint256 assetsRemoved, uint256 sharesRemoved);

  function setUp() public {
    costBasisManager = new CostBasisManager(admin);

    vm.startPrank(admin);
    costBasisManager.grantRole(AccessRoles.CONTROLLER_ROLE, controller);
    vm.stopPrank();
  }

  // 1. Initial State
  function testInitialState() public {
    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(costBasisManager.sharesOwned(user), 0);

    (uint256 assets, uint256 shares) = costBasisManager.costBasis(user);
    assertEq(assets, 0);
    assertEq(shares, 0);
  }

  // 2. Single Deposit
  function testSingleDeposit() public {
    uint256 depositAssets = 1000e18;
    uint256 depositShares = 500e18;

    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, depositAssets, depositShares);
    vm.stopPrank();

    assertEq(costBasisManager.investedAssets(user), depositAssets);
    assertEq(costBasisManager.sharesOwned(user), depositShares);

    (uint256 assets, uint256 shares) = costBasisManager.costBasis(user);
    assertEq(assets, depositAssets);
    assertEq(shares, depositShares);
  }

  // 3. Multiple Deposits
  function testMultipleDeposits() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);
    costBasisManager.recordDeposit(user, 500e18, 250e18);
    costBasisManager.recordDeposit(user, 2000e18, 800e18);
    vm.stopPrank();

    assertEq(costBasisManager.investedAssets(user), 3500e18);
    assertEq(costBasisManager.sharesOwned(user), 1550e18);
  }

  // 4. Full Redemption
  function testFullRedemption() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);

    uint256 costRemoved = costBasisManager.recordRedemption(user, 500e18);
    vm.stopPrank();

    assertEq(costRemoved, 1000e18);
    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(costBasisManager.sharesOwned(user), 0);
  }

  // 5. Partial Redemption
  function testPartialRedemption() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);

    // Redeem 200 shares (40%)
    uint256 costRemoved = costBasisManager.recordRedemption(user, 200e18);
    vm.stopPrank();

    // 1000 * 200 / 500 = 400
    assertEq(costRemoved, 400e18);
    assertEq(costBasisManager.investedAssets(user), 600e18);
    assertEq(costBasisManager.sharesOwned(user), 300e18);
  }

  // 6. Sequential Redemptions
  function testSequentialRedemptions() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);

    // Redemption 1: 100 shares -> 200 assets cost removed
    uint256 costRemoved1 = costBasisManager.recordRedemption(user, 100e18);
    assertEq(costRemoved1, 200e18);
    assertEq(costBasisManager.investedAssets(user), 800e18);
    assertEq(costBasisManager.sharesOwned(user), 400e18);

    // Redemption 2: 200 shares -> 400 assets cost removed
    uint256 costRemoved2 = costBasisManager.recordRedemption(user, 200e18);
    assertEq(costRemoved2, 400e18);
    assertEq(costBasisManager.investedAssets(user), 400e18);
    assertEq(costBasisManager.sharesOwned(user), 200e18);

    // Redemption 3: Full remaining 200 shares -> 400 assets cost removed
    uint256 costRemoved3 = costBasisManager.recordRedemption(user, 200e18);
    assertEq(costRemoved3, 400e18);
    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(costBasisManager.sharesOwned(user), 0);
    vm.stopPrank();
  }

  // 7. Unauthorized Updates
  function testUnauthorizedDepositRevert() public {
    vm.startPrank(rando);
    vm.expectRevert();
    costBasisManager.recordDeposit(user, 1000e18, 500e18);
    vm.stopPrank();
  }

  function testUnauthorizedRedemptionRevert() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);
    vm.stopPrank();

    vm.startPrank(rando);
    vm.expectRevert();
    costBasisManager.recordRedemption(user, 200e18);
    vm.stopPrank();
  }

  // 8. Zero Amount Protection & Validations
  function testRecordDepositZeroUserRevert() public {
    vm.startPrank(controller);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.ZeroAddressDetected.selector));
    costBasisManager.recordDeposit(address(0), 1000e18, 500e18);
    vm.stopPrank();
  }

  function testRecordDepositZeroAssetsRevert() public {
    vm.startPrank(controller);
    vm.expectRevert(abi.encodeWithSelector(CostBasisManager.ZeroAmount.selector));
    costBasisManager.recordDeposit(user, 0, 500e18);
    vm.stopPrank();
  }

  function testRecordDepositZeroSharesRevert() public {
    vm.startPrank(controller);
    vm.expectRevert(abi.encodeWithSelector(CostBasisManager.ZeroAmount.selector));
    costBasisManager.recordDeposit(user, 1000e18, 0);
    vm.stopPrank();
  }

  function testRecordRedemptionZeroUserRevert() public {
    vm.startPrank(controller);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.ZeroAddressDetected.selector));
    costBasisManager.recordRedemption(address(0), 100e18);
    vm.stopPrank();
  }

  function testRecordRedemptionZeroSharesRevert() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);

    vm.expectRevert(abi.encodeWithSelector(CostBasisManager.ZeroAmount.selector));
    costBasisManager.recordRedemption(user, 0);
    vm.stopPrank();
  }

  function testRecordRedemptionExceedsOwnedSharesRevert() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);

    vm.expectRevert(
      abi.encodeWithSelector(CostBasisManager.InsufficientShares.selector, 501e18, 500e18)
    );
    costBasisManager.recordRedemption(user, 501e18);
    vm.stopPrank();
  }

  function testRecordRedemptionWithZeroOwnedSharesRevert() public {
    vm.startPrank(controller);
    vm.expectRevert(
      abi.encodeWithSelector(CostBasisManager.InsufficientShares.selector, 100e18, 0)
    );
    costBasisManager.recordRedemption(user, 100e18);
    vm.stopPrank();
  }

  // 9. Event Emission
  function testDepositRecordedEvent() public {
    vm.startPrank(controller);
    vm.expectEmit(true, false, false, true);
    emit DepositRecorded(user, 1000e18, 500e18);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);
    vm.stopPrank();
  }

  function testRedemptionRecordedEvent() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18);

    vm.expectEmit(true, false, false, true);
    emit RedemptionRecorded(user, 400e18, 200e18);
    costBasisManager.recordRedemption(user, 200e18);
    vm.stopPrank();
  }

  // 10. Accounting Invariants & Fuzzing
  function testFuzzDepositAndFullRedemption(uint256 assets, uint256 shares) public {
    assets = bound(assets, 1, 1e30);
    shares = bound(shares, 1, 1e30);

    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, assets, shares);
    uint256 costRemoved = costBasisManager.recordRedemption(user, shares);
    vm.stopPrank();

    assertEq(costRemoved, assets);
    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(costBasisManager.sharesOwned(user), 0);
  }

  function testFuzzPartialRedemptionInvariant(
    uint256 assets,
    uint256 shares,
    uint256 redeemShares
  ) public {
    assets = bound(assets, 1e6, 1e30);
    shares = bound(shares, 1e6, 1e30);
    redeemShares = bound(redeemShares, 1, shares);

    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, assets, shares);
    uint256 costRemoved = costBasisManager.recordRedemption(user, redeemShares);
    vm.stopPrank();

    uint256 remainingAssets = costBasisManager.investedAssets(user);
    uint256 remainingShares = costBasisManager.sharesOwned(user);

    // Invariant: total initial assets == costRemoved + remainingAssets
    assertEq(assets, costRemoved + remainingAssets);
    // Invariant: remaining shares == initial shares - redeemShares
    assertEq(shares - redeemShares, remainingShares);
    // Invariant: costRemoved <= assets
    assertTrue(costRemoved <= assets);
  }
}
