// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/treasury/PerformanceManager.sol';
import '../../src/treasury/CostBasisManager.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/libraries/AccessRoles.sol';

contract MockPortfolioManager {
  uint256 public mockTotalValueUSD = 1000 * 1e18;
  uint256 public mockNavPerShare = 1e18;

  function setNAV(uint256 totalValueUSD, uint256 navPerShare) external {
    mockTotalValueUSD = totalValueUSD;
    mockNavPerShare = navPerShare;
  }

  function calculateNAV() external view returns (uint256, uint256) {
    return (mockTotalValueUSD, mockNavPerShare);
  }
}

contract PerformanceManagerTest is Test {
  PerformanceManager public pm;
  CostBasisManager public cbm;
  MockPortfolioManager public mockPM;
  UVBTCETHToken public token;

  address public admin = address(1);
  address public user = address(2);

  function setUp() public {
    vm.startPrank(admin);
    token = new UVBTCETHToken();
    mockPM = new MockPortfolioManager();
    cbm = new CostBasisManager(admin, address(0x123456));
    pm = new PerformanceManager(admin, address(0x123456));

    cbm.setModules(address(mockPM), address(token));
    pm.setModules(address(mockPM), address(cbm), address(0x777), address(token));
    vm.stopPrank();
  }

  function test_MultipleDepositsAndHoldingPeriod() public {
    vm.startPrank(admin);
    uint256 depositTime = block.timestamp;
    cbm.recordDeposit(user, 1000 * 1e18, 1000 * 1e18);
    token.mint(user, 1000 * 1e18);
    vm.stopPrank();

    vm.warp(depositTime + 100);

    vm.startPrank(admin);
    cbm.recordDeposit(user, 500 * 1e18, 500 * 1e18);
    token.mint(user, 500 * 1e18);
    vm.stopPrank();

    vm.warp(block.timestamp + 500);

    IPerformanceManager.Performance memory perf = pm.performance(user);
    assertEq(perf.investedCapitalUSD, 1500 * 1e18);
    assertEq(perf.currentValueUSD, 1500 * 1e18);
    assertEq(perf.realizedPnL, 0);
    assertEq(perf.unrealizedPnL, 0);
    assertEq(perf.netPnL, 0);
    assertEq(perf.roiBps, 0);
    assertEq(perf.holdingPeriod, 600);

    assertEq(pm.currentValue(user), 1500 * 1e18);
    assertEq(pm.investedCapital(user), 1500 * 1e18);
    assertEq(pm.netProfit(user), 0);
    assertEq(pm.roi(user), 0);
  }

  function test_ProfitScenario() public {
    vm.startPrank(admin);
    cbm.recordDeposit(user, 1000 * 1e18, 1000 * 1e18);
    token.mint(user, 1000 * 1e18);
    vm.stopPrank();

    // Vault grows by 20%: NAV increases to $1.20 (1.2e18)
    mockPM.setNAV(1200 * 1e18, 1.2e18);

    IPerformanceManager.Performance memory perf = pm.performance(user);
    assertEq(perf.investedCapitalUSD, 1000 * 1e18);
    assertEq(perf.currentValueUSD, 1200 * 1e18);
    assertEq(perf.realizedPnL, 0);
    assertEq(perf.unrealizedPnL, 200 * 1e18);
    assertEq(perf.netPnL, 200 * 1e18);
    assertEq(perf.roiBps, 2000); // 20.00%
    assertEq(pm.roi(user), 2000);
    assertEq(pm.netProfit(user), 200 * 1e18);
  }

  function test_LossScenario() public {
    vm.startPrank(admin);
    cbm.recordDeposit(user, 1000 * 1e18, 1000 * 1e18);
    token.mint(user, 1000 * 1e18);
    vm.stopPrank();

    // Vault drops by 15%: NAV decreases to $0.85 (0.85e18)
    mockPM.setNAV(850 * 1e18, 0.85e18);

    IPerformanceManager.Performance memory perf = pm.performance(user);
    assertEq(perf.investedCapitalUSD, 1000 * 1e18);
    assertEq(perf.currentValueUSD, 850 * 1e18);
    assertEq(perf.realizedPnL, 0);
    assertEq(perf.unrealizedPnL, -150 * 1e18);
    assertEq(perf.netPnL, -150 * 1e18);
    assertEq(perf.roiBps, -1500); // -15.00%
  }

  function test_PartialExitWithRealizedProfit() public {
    vm.startPrank(admin);
    cbm.recordDeposit(user, 1000 * 1e18, 1000 * 1e18);
    token.mint(user, 1000 * 1e18);
    vm.stopPrank();

    // NAV rises to $1.20
    mockPM.setNAV(1200 * 1e18, 1.2e18);

    // User redeems 500 shares at $1.20 -> $600 USD payout
    // Cost basis reduction = $500, realized PnL = +$100
    vm.startPrank(admin);
    cbm.recordRedeem(user, 1000 * 1e18, 500 * 1e18, 600 * 1e18);
    token.burn(user, 500 * 1e18);
    vm.stopPrank();

    IPerformanceManager.Performance memory perf = pm.performance(user);
    assertEq(perf.investedCapitalUSD, 500 * 1e18);
    assertEq(perf.currentValueUSD, 600 * 1e18); // 500 shares * $1.20
    assertEq(perf.realizedPnL, 100 * 1e18);
    assertEq(perf.unrealizedPnL, 100 * 1e18);
    assertEq(perf.netPnL, 200 * 1e18);
    assertEq(perf.roiBps, 4000); // Net PnL ($200) / Active Invested ($500) = 40.00%
  }

  function test_MultipleRedeemsAndFullExit() public {
    vm.startPrank(admin);
    cbm.recordDeposit(user, 1000 * 1e18, 1000 * 1e18);
    token.mint(user, 1000 * 1e18);
    vm.stopPrank();

    // 1st partial redeem: 400 shares at $1.00 ($400 payout)
    vm.startPrank(admin);
    cbm.recordRedeem(user, 1000 * 1e18, 400 * 1e18, 400 * 1e18);
    token.burn(user, 400 * 1e18);
    vm.stopPrank();

    assertEq(cbm.costBasis(user), 600 * 1e18);

    // 2nd final redeem: remaining 600 shares at $1.10 ($660 payout)
    vm.startPrank(admin);
    cbm.recordRedeem(user, 600 * 1e18, 600 * 1e18, 660 * 1e18);
    token.burn(user, 600 * 1e18);
    vm.stopPrank();

    IPerformanceManager.Performance memory perf = pm.performance(user);
    assertEq(perf.investedCapitalUSD, 0);
    assertEq(perf.currentValueUSD, 0);
    assertEq(perf.realizedPnL, 60 * 1e18);
    assertEq(perf.unrealizedPnL, 0);
    assertEq(perf.netPnL, 60 * 1e18);
    assertEq(perf.roiBps, 0);
    assertEq(perf.holdingPeriod, 0);
  }
}
