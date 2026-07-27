// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/vault/RealizedProfitEngine.sol';
import '../src/interfaces/IRealizedProfitEngine.sol';

contract RealizedProfitEngineTest is Test {
  RealizedProfitEngine public engine;

  function setUp() public {
    engine = new RealizedProfitEngine();
  }

  // 1. Zero Profit
  function testZeroProfitBreakEven() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1000e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 0
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 0);
    assertEq(result.chargeableProfit, 0);
  }

  // 2. Positive Profit
  function testPositiveProfitNoHWM() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1500e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 0
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 500e18);
    assertEq(result.chargeableProfit, 500e18);
  }

  // 3. Loss Scenario
  function testLossScenario() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 800e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 0
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 0);
    assertEq(result.chargeableProfit, 0);
  }

  // 4. Full Redemption
  function testFullRedemptionCostRemoval() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1200e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 0
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 200e18);
    assertEq(result.chargeableProfit, 200e18);
  }

  // 5. Partial Redemption
  function testPartialRedemptionProportionalCost() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 700e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 200e18,
      highWaterMark: 0
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 400e18);
    assertEq(result.realizedProfit, 300e18);
    assertEq(result.chargeableProfit, 300e18);
  }

  // 6. Multiple Deposit Accounting Scenarios
  function testMultipleDepositsHighCostBasis() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1200e18,
      investedAssets: 3000e18,
      sharesOwned: 1500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 0
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 200e18);
    assertEq(result.chargeableProfit, 200e18);
  }

  // 7. HWM Below Profit
  function testHWMBelowProfit() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1500e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 200e18
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 500e18);
    assertEq(result.chargeableProfit, 300e18);
  }

  // 8. HWM Equal Profit
  function testHWMEqualProfit() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1500e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 500e18
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 500e18);
    assertEq(result.chargeableProfit, 0);
  }

  // 9. HWM Above Profit
  function testHWMAboveProfit() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1500e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 700e18
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 500e18);
    assertEq(result.chargeableProfit, 0);
  }

  // 10. External Interface Function Verification
  function testCalculateRealizedProfitCalldata() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1500e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 500e18,
      highWaterMark: 100e18
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculateRealizedProfit(ctx);

    assertEq(result.costRemoved, 1000e18);
    assertEq(result.realizedProfit, 500e18);
    assertEq(result.chargeableProfit, 400e18);
  }

  // 11. Boundary Tests & Invalid Inputs
  function testZeroSharesOwnedAndRedeemed() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 0,
      investedAssets: 0,
      sharesOwned: 0,
      sharesRedeemed: 0,
      highWaterMark: 0
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 0);
    assertEq(result.realizedProfit, 0);
    assertEq(result.chargeableProfit, 0);
  }

  function testRedeemExceedsOwnedSharesReverts() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 1000e18,
      investedAssets: 1000e18,
      sharesOwned: 500e18,
      sharesRedeemed: 501e18,
      highWaterMark: 0
    });

    vm.expectRevert(
      abi.encodeWithSelector(RealizedProfitEngine.InsufficientSharesOwned.selector, 501e18, 500e18)
    );
    engine.calculate(ctx);
  }

  // 12. Rounding Behavior Tests
  function testRoundingBehaviorPartialRedemption() public {
    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: 40,
      investedAssets: 100,
      sharesOwned: 3,
      sharesRedeemed: 1,
      highWaterMark: 0
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertEq(result.costRemoved, 33);
    assertEq(result.realizedProfit, 7);
    assertEq(result.chargeableProfit, 7);
  }

  // 13. Fuzz Tests
  function testFuzzRealizedProfitEngine(
    uint256 investedAssets,
    uint256 sharesOwned,
    uint256 sharesRedeemed,
    uint256 assetsReceived,
    uint256 hwm
  ) public {
    sharesOwned = bound(sharesOwned, 1, 1e30);
    sharesRedeemed = bound(sharesRedeemed, 1, sharesOwned);
    investedAssets = bound(investedAssets, 0, 1e30);
    assetsReceived = bound(assetsReceived, 0, 1e30);
    hwm = bound(hwm, 0, 1e30);

    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: assetsReceived,
      investedAssets: investedAssets,
      sharesOwned: sharesOwned,
      sharesRedeemed: sharesRedeemed,
      highWaterMark: hwm
    });

    IRealizedProfitEngine.ProfitResult memory result = engine.calculate(ctx);

    assertTrue(result.costRemoved <= investedAssets);
    assertTrue(result.realizedProfit <= assetsReceived);
    assertTrue(result.chargeableProfit <= result.realizedProfit);

    if (result.realizedProfit > hwm) {
      assertEq(result.chargeableProfit, result.realizedProfit - hwm);
    } else {
      assertEq(result.chargeableProfit, 0);
    }
  }
}
