// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';

contract MockTreasury {}

contract RateLimitsTest is Test {
  UnifyVaultController public controller;
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  CustodyVault public vault;
  address public treasury;
  UVBTCETHToken public token;

  address public user = address(0xABCD);

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    vault = new CustodyVault();
    treasury = address(new MockTreasury());
    token = new UVBTCETHToken();

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );
  }

  function test_GovernanceCanConfigureRateLimits() public {
    controller.setDepositLimits(5000e6, 20000e6);
    controller.setRedeemLimits(10000e18, 50000e18);

    assertEq(controller.maxDepositPerTx(), 5000e6);
    assertEq(controller.dailyDepositCap(), 20000e6);
    assertEq(controller.maxRedeemPerTx(), 10000e18);
    assertEq(controller.dailyRedeemCap(), 50000e18);
  }

  function test_DepositExceedsTxLimitReverts() public {
    controller.setDepositLimits(1000e6, 10000e6);

    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.DepositExceedsTxLimit.selector, 1001e6, 1000e6));
    controller.deposit(address(0x11), 1001e6, 0, user);
  }

  function test_RedeemExceedsTxLimitReverts() public {
    controller.setRedeemLimits(500e18, 5000e18);

    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.RedeemExceedsTxLimit.selector, 501e18, 500e18));
    controller.redeem(address(0x11), 501e18, 0, user, block.timestamp + 100);
  }
}
