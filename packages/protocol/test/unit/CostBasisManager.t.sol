// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/treasury/CostBasisManager.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/libraries/AccessRoles.sol';

contract CostBasisManagerTest is Test {
  CostBasisManager public cbm;
  UVBTCETHToken public token;
  address public admin = address(1);
  address public user = address(2);

  function setUp() public {
    vm.startPrank(admin);
    token = new UVBTCETHToken();
    cbm = new CostBasisManager(admin, address(0x123456));
    cbm.setModules(address(0x999), address(token));
    vm.stopPrank();
  }

  function test_DepositAndCostBasisTracking() public {
    vm.startPrank(admin);
    cbm.recordDeposit(user, 100 * 1e18, 100 * 1e18);
    token.mint(user, 100 * 1e18);
    vm.stopPrank();

    assertEq(cbm.costBasis(user), 100 * 1e18);
    assertEq(cbm.averageEntryPrice(user), 1e18); // $1.00

    vm.startPrank(admin);
    cbm.recordDeposit(user, 500 * 1e18, 500 * 1e18);
    token.mint(user, 500 * 1e18);
    vm.stopPrank();

    assertEq(cbm.costBasis(user), 600 * 1e18);
    assertEq(cbm.averageEntryPrice(user), 1e18);
  }

  function test_PartialRedeemCostBasisAndRealizedPnL() public {
    vm.startPrank(admin);
    cbm.recordDeposit(user, 1000 * 1e18, 1000 * 1e18);
    token.mint(user, 1000 * 1e18);

    // Partial Redeem 25% (250 shares) at 1.10 USD payout ($275 USD received)
    uint256 sharesBefore = 1000 * 1e18;
    uint256 sharesToBurn = 250 * 1e18;
    uint256 payoutUSD = 275 * 1e18;

    cbm.recordRedeem(user, sharesBefore, sharesToBurn, payoutUSD);
    token.burn(user, sharesToBurn);
    vm.stopPrank();

    // Cost basis reduced by 25% (from $1000 to $750)
    assertEq(cbm.costBasis(user), 750 * 1e18);

    // Realized gain = $275 - $250 = +$25 USD
    assertEq(cbm.realizedPnL(user), 25 * 1e18);

    // Average entry price remains $1.00 USD per share
    assertEq(cbm.averageEntryPrice(user), 1e18);
  }

  function test_FullRedemptionResetsCostBasis() public {
    vm.startPrank(admin);
    cbm.recordDeposit(user, 500 * 1e18, 500 * 1e18);
    token.mint(user, 500 * 1e18);

    cbm.recordRedeem(user, 500 * 1e18, 500 * 1e18, 550 * 1e18);
    token.burn(user, 500 * 1e18);
    vm.stopPrank();

    assertEq(cbm.costBasis(user), 0);
    assertEq(cbm.realizedPnL(user), 50 * 1e18);
    assertEq(cbm.averageEntryPrice(user), 0);
  }
}
