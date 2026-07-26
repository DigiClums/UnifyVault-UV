// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/vault/CostBasisManager.sol';
import '../src/vault/HighWaterMarkManager.sol';
import '../src/vault/RealizedProfitEngine.sol';
import '../src/vault/PerformanceFeeSettler.sol';
import '../src/treasury/FeeManager.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/interfaces/IPerformanceFeeSettler.sol';

contract PerformanceFeeSettlementTest is Test {
  CostBasisManager public costBasisManager;
  HighWaterMarkManager public hwmManager;
  RealizedProfitEngine public profitEngine;
  FeeManager public feeManager;
  PerformanceFeeSettler public settler;

  address public admin = address(0x111);
  address public controller = address(0x222);
  address public treasury = address(0x333);
  address public user = address(0x444);
  address public rando = address(0x999);

  event PerformanceFeeSettled(
    address indexed user,
    uint256 grossAssets,
    uint256 costRemoved,
    uint256 realizedProfit,
    uint256 chargeableProfit,
    uint256 performanceFee,
    uint256 netAssetsToUser
  );

  function setUp() public {
    vm.startPrank(admin);
    costBasisManager = new CostBasisManager(admin);
    hwmManager = new HighWaterMarkManager(admin);
    profitEngine = new RealizedProfitEngine();
    feeManager = new FeeManager(treasury);

    settler = new PerformanceFeeSettler(
      admin,
      address(costBasisManager),
      address(hwmManager),
      address(profitEngine),
      address(feeManager)
    );

    // Grant controller role to controller address and settler contract
    costBasisManager.grantRole(AccessRoles.CONTROLLER_ROLE, controller);
    costBasisManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(settler));

    hwmManager.grantRole(AccessRoles.CONTROLLER_ROLE, controller);
    hwmManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(settler));

    settler.grantRole(AccessRoles.CONTROLLER_ROLE, controller);
    vm.stopPrank();
  }

  // 1. Scenario 1: Deposit -> Gain -> Redeem -> Fee
  function testDepositGainRedeemFee() public {
    // Deposit: User deposits 1000 assets, receives 1000 shares
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 1000e18);
    vm.stopPrank();

    // Value grows to 1300 assets (300 profit)
    // Full redemption of 1000 shares
    vm.startPrank(controller);
    IPerformanceFeeSettler.SettlementResult memory res = settler.executeSettlement(
      user,
      1000e18,
      1300e18
    );
    vm.stopPrank();

    assertEq(res.costRemoved, 1000e18);
    assertEq(res.realizedProfit, 300e18);
    assertEq(res.chargeableProfit, 300e18);
    assertEq(res.performanceFee, 15e18); // 5% of 300 = 15
    assertEq(res.netAssetsToUser, 1285e18); // 1300 - 15 = 1285
    assertEq(res.newHighWaterMark, 0); // Full redemption clears HWM

    // Verify Accounting State
    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(costBasisManager.sharesOwned(user), 0);
    assertEq(hwmManager.highWaterMark(user), 0);
  }

  // 2. Scenario 2: Deposit -> Gain -> Partial Redeem -> Partial Redeem (Verify No Double Fee)
  function testDepositGainPartialRedeemNoDoubleFee() public {
    // Deposit: 1000 assets, 1000 shares
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 1000e18);
    vm.stopPrank();

    // Partial Redemption 1: Redeem 500 shares (50%), receive 700 assets (costRemoved = 500, profit = 200)
    vm.startPrank(controller);
    IPerformanceFeeSettler.SettlementResult memory res1 = settler.executeSettlement(
      user,
      500e18,
      700e18
    );
    vm.stopPrank();

    assertEq(res1.costRemoved, 500e18);
    assertEq(res1.realizedProfit, 200e18);
    assertEq(res1.chargeableProfit, 200e18);
    assertEq(res1.performanceFee, 10e18); // 5% of 200 = 10
    assertEq(res1.netAssetsToUser, 690e18);
    assertEq(hwmManager.highWaterMark(user), 200e18);

    // Remaining accounting: investedAssets = 500, sharesOwned = 500
    assertEq(costBasisManager.investedAssets(user), 500e18);
    assertEq(costBasisManager.sharesOwned(user), 500e18);

    // Partial Redemption 2: Redeem remaining 500 shares, receive 650 assets
    // CostRemoved = 500. RealizedProfit = 650 - 500 = 150.
    // HWM is 200. ChargeableProfit = max(150 - 200, 0) = 0! (No double fee!)
    vm.startPrank(controller);
    IPerformanceFeeSettler.SettlementResult memory res2 = settler.executeSettlement(
      user,
      500e18,
      650e18
    );
    vm.stopPrank();

    assertEq(res2.costRemoved, 500e18);
    assertEq(res2.realizedProfit, 150e18);
    assertEq(res2.chargeableProfit, 0);
    assertEq(res2.performanceFee, 0); // Zero fee!
    assertEq(res2.netAssetsToUser, 650e18);
    assertEq(res2.newHighWaterMark, 0); // Reset on full exit

    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(costBasisManager.sharesOwned(user), 0);
    assertEq(hwmManager.highWaterMark(user), 0);
  }

  // 3. Scenario 3: Deposit -> Loss -> Redeem (Verify Fee = 0)
  function testDepositLossRedeemFeeZero() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 1000e18);

    // Value dropped to 800 assets
    IPerformanceFeeSettler.SettlementResult memory res = settler.executeSettlement(
      user,
      1000e18,
      800e18
    );
    vm.stopPrank();

    assertEq(res.costRemoved, 1000e18);
    assertEq(res.realizedProfit, 0);
    assertEq(res.chargeableProfit, 0);
    assertEq(res.performanceFee, 0);
    assertEq(res.netAssetsToUser, 800e18);

    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(costBasisManager.sharesOwned(user), 0);
    assertEq(hwmManager.highWaterMark(user), 0);
  }

  // 4. Scenario 4: Deposit -> Gain -> Full Exit -> Redeploy -> Gain (Fresh Accounting)
  function testFullExitRedeployFreshAccounting() public {
    // Position 1
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 1000e18);
    settler.executeSettlement(user, 1000e18, 1200e18); // Profit 200, Fee 10
    vm.stopPrank();

    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(hwmManager.highWaterMark(user), 0);

    // Position 2 (Fresh Deposit)
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 1000e18);
    IPerformanceFeeSettler.SettlementResult memory res = settler.executeSettlement(
      user,
      1000e18,
      1100e18
    ); // Profit 100
    vm.stopPrank();

    assertEq(res.costRemoved, 1000e18);
    assertEq(res.realizedProfit, 100e18);
    assertEq(res.chargeableProfit, 100e18); // Fresh HWM was 0, so 100 chargeable!
    assertEq(res.performanceFee, 5e18); // 5% of 100 = 5
    assertEq(res.netAssetsToUser, 1095e18);
  }

  // 5. Scenario 5: Multiple deposits -> Partial redemption -> Gain -> Settlement
  function testMultipleDepositsPartialRedemptionSettlement() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 500e18); // Dep 1: 1000 assets for 500 shares
    costBasisManager.recordDeposit(user, 2000e18, 1000e18); // Dep 2: 2000 assets for 1000 shares
    // Total investedAssets = 3000, sharesOwned = 1500

    // Redeem 500 shares (1/3 of total shares)
    // Proportional costRemoved = 1000
    // Received assets = 1500 (Profit = 500)
    IPerformanceFeeSettler.SettlementResult memory res = settler.executeSettlement(
      user,
      500e18,
      1500e18
    );
    vm.stopPrank();

    assertEq(res.costRemoved, 1000e18);
    assertEq(res.realizedProfit, 500e18);
    assertEq(res.chargeableProfit, 500e18);
    assertEq(res.performanceFee, 25e18); // 5% of 500 = 25
    assertEq(res.netAssetsToUser, 1475e18);
    assertEq(hwmManager.highWaterMark(user), 500e18);

    assertEq(costBasisManager.investedAssets(user), 2000e18);
    assertEq(costBasisManager.sharesOwned(user), 1000e18);
  }

  // 6. Access Control Test
  function testUnauthorizedSettlementReverts() public {
    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, 1000e18, 1000e18);
    vm.stopPrank();

    vm.startPrank(rando);
    vm.expectRevert();
    settler.executeSettlement(user, 1000e18, 1200e18);
    vm.stopPrank();
  }

  // 7. Fuzz Invariant Test
  function testFuzzSettlementInvariants(
    uint256 invested,
    uint256 shares,
    uint256 redeemShares,
    uint256 grossReceived
  ) public {
    shares = bound(shares, 100, 1e30);
    redeemShares = bound(redeemShares, 1, shares);
    invested = bound(invested, 100, 1e30);
    grossReceived = bound(grossReceived, 0, 1e30);

    vm.startPrank(controller);
    costBasisManager.recordDeposit(user, invested, shares);

    IPerformanceFeeSettler.SettlementResult memory res = settler.executeSettlement(
      user,
      redeemShares,
      grossReceived
    );
    vm.stopPrank();

    // Invariant 1: Performance Fee >= 0
    assertTrue(res.performanceFee >= 0);

    // Invariant 2: Performance Fee <= realizedProfit
    assertTrue(res.performanceFee <= res.realizedProfit);

    // Invariant 3: User receives grossAssets - performanceFee
    assertEq(res.netAssetsToUser, grossReceived - res.performanceFee);

    // Invariant 4: Cost basis removed <= total invested
    assertTrue(res.costRemoved <= invested);

    // Invariant 5: Full redemption clears accounting state
    if (redeemShares == shares) {
      assertEq(costBasisManager.investedAssets(user), 0);
      assertEq(costBasisManager.sharesOwned(user), 0);
      assertEq(hwmManager.highWaterMark(user), 0);
    }
  }
}
