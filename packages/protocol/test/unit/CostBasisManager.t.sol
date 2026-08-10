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
  address public unauthorized = address(3);

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

  function test_RecordDepositRevertsForUnauthorizedAccount() public {
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        unauthorized,
        cbm.CONTROLLER_ROLE()
      )
    );
    vm.prank(unauthorized);
    cbm.recordDeposit(user, 100 * 1e18, 100 * 1e18);
  }

  function test_RecordRedeemRevertsForUnauthorizedAccount() public {
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        unauthorized,
        cbm.CONTROLLER_ROLE()
      )
    );
    vm.prank(unauthorized);
    cbm.recordRedeem(user, 100 * 1e18, 100 * 1e18, 100 * 1e18);
  }

  function test_MigrateAccountingPreservesHistoricalState() public {
    uint256 historicalCostBasis = 81162414845958829357;
    int256 historicalRealizedPnL = 0;
    uint256 historicalFirstDeposit = 1786161084;

    vm.prank(admin);
    cbm.migrateAccounting(user, historicalCostBasis, historicalRealizedPnL, historicalFirstDeposit);

    assertEq(cbm.costBasis(user), historicalCostBasis);
    assertEq(cbm.realizedPnL(user), historicalRealizedPnL);
    assertEq(cbm.firstDepositTimestamp(user), historicalFirstDeposit);
  }

  function test_MigrateAccountingRevertsForUnauthorizedAccount() public {
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        unauthorized,
        AccessRoles.GOVERNANCE_ROLE
      )
    );

    vm.prank(unauthorized);
    cbm.migrateAccounting(user, 81162414845958829357, 0, 1786161084);
  }

  function test_MigrateAccountingCannotRunTwice() public {
    vm.startPrank(admin);

    cbm.migrateAccounting(user, 81162414845958829357, 0, 1786161084);

    vm.expectRevert('Accounting already migrated');

    cbm.migrateAccounting(user, 999e18, 100e18, 123);

    vm.stopPrank();
  }
}
