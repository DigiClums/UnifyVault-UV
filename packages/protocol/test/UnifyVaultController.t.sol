// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/libraries/AccessRoles.sol';

contract MockDirectory {}
contract MockOracle {}
contract MockVault {}
contract MockTreasury {}
contract MockToken {}

contract UnifyVaultControllerTest is Test {
  UnifyVaultController public controller;

  MockDirectory public directory;
  MockOracle public oracle;
  MockVault public vault;
  MockTreasury public treasury;
  MockToken public token;

  address public gov = address(0xABC);
  address public guardian = address(0x111);
  address public bot = address(0x222);

  event EmergencyPaused(address indexed caller);
  event EmergencyResumed(address indexed caller);

  function setUp() public {
    directory = new MockDirectory();
    oracle = new MockOracle();
    vault = new MockVault();
    treasury = new MockTreasury();
    token = new MockToken();

    controller = new UnifyVaultController(
      address(directory),
      address(oracle),
      address(vault),
      address(treasury),
      address(token)
    );

    // Grant Roles
    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    controller.grantRole(controller.GUARDIAN_ROLE(), guardian);
    controller.grantRole(controller.BOT_ROLE(), bot);

    // Renounce deployer rights
    controller.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    controller.renounceRole(controller.GUARDIAN_ROLE(), address(this));
    controller.renounceRole(controller.BOT_ROLE(), address(this));
  }

  function testDeploymentAndViews() public {
    assertEq(controller.directory(), address(directory));
    assertEq(controller.oracle(), address(oracle));
    assertEq(controller.vault(), address(vault));
    assertEq(controller.treasury(), address(treasury));
    assertEq(controller.token(), address(token));
  }

  function testConstructorZeroAddressRevert() public {
    vm.expectRevert(abi.encodeWithSignature('ZeroAddressDetected()'));
    new UnifyVaultController(
      address(0),
      address(oracle),
      address(vault),
      address(treasury),
      address(token)
    );
  }

  function testConstructorNotAContractRevert() public {
    address notAContract = address(0x555);
    vm.expectRevert(
      abi.encodeWithSelector(UnifyVaultController.NotAContract.selector, notAContract)
    );
    new UnifyVaultController(
      notAContract,
      address(oracle),
      address(vault),
      address(treasury),
      address(token)
    );
  }

  function testPauseEmergencySuccess() public {
    vm.expectEmit(true, false, false, true);
    emit EmergencyPaused(guardian);

    vm.prank(guardian);
    controller.emergencyPause();

    assertTrue(controller.paused());
  }

  function testResumeGovSuccess() public {
    vm.prank(guardian);
    controller.emergencyPause();

    vm.expectEmit(true, false, false, true);
    emit EmergencyResumed(gov);

    vm.prank(gov);
    controller.resume();

    assertFalse(controller.paused());
  }

  function testPauseUnauthorizedRevert() public {
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        bot,
        controller.GUARDIAN_ROLE()
      )
    );
    vm.prank(bot);
    controller.emergencyPause();
  }

  function testResumeUnauthorizedRevert() public {
    vm.prank(guardian);
    controller.emergencyPause();

    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        guardian,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    vm.prank(guardian);
    controller.resume();
  }

  function testSkeletonMethodsRevert() public {
    vm.expectRevert(UnifyVaultController.NotImplemented.selector);
    controller.collectProtocolFee(address(0x888), 100);

    vm.expectRevert(UnifyVaultController.NotImplemented.selector);
    controller.rebalance();
  }
}
