// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/constants/ModuleIds.sol';
import '../src/errors/Errors.sol';
import '../src/events/Events.sol';
import '../src/libraries/AccessRoles.sol';

/**
 * @title ProtocolDirectoryTest
 * @notice Tests the address registration directory logic using unit and fuzz scenarios
 */
contract ProtocolDirectoryTest is Test {
  ProtocolDirectory public directory;
  address public govAdmin = address(0x99);
  address public secondGov = address(0x88);
  address public attacker = address(0x666);
  address public testModuleAddr = address(0x111);

  bytes32 public constant TEST_ID = ModuleIds.ORACLE;

  event AddressRegistered(bytes32 indexed id, address indexed target, address indexed caller);
  event AddressUpdated(
    bytes32 indexed id,
    address indexed oldTarget,
    address newTarget,
    address indexed caller
  );
  event AddressRemoved(bytes32 indexed id, address indexed oldTarget, address indexed caller);
  event RegistryFrozen(address indexed caller);

  function setUp() public {
    directory = new ProtocolDirectory();
    directory.grantRole(AccessRoles.GOVERNANCE_ROLE, govAdmin);
    directory.grantRole(AccessRoles.GOVERNANCE_ROLE, secondGov);
  }

  function testRegisterSuccess() public {
    vm.prank(govAdmin);
    vm.expectEmit(true, true, false, true);
    emit AddressRegistered(TEST_ID, testModuleAddr, govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);

    assertEq(directory.getAddress(TEST_ID), testModuleAddr);
    assertTrue(directory.exists(TEST_ID));
  }

  function testRegisterDuplicateRevert() public {
    vm.startPrank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);

    vm.expectRevert(abi.encodeWithSelector(Errors.EntryAlreadyExists.selector, TEST_ID));
    directory.registerAddress(TEST_ID, address(0x222));
    vm.stopPrank();
  }

  function testRegisterZeroAddressRevert() public {
    vm.prank(govAdmin);
    vm.expectRevert(Errors.ZeroAddressDetected.selector);
    directory.registerAddress(TEST_ID, address(0));
  }

  function testUpdateSuccess() public {
    vm.startPrank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);

    address newAddr = address(0x222);
    vm.expectEmit(true, true, false, true);
    emit AddressUpdated(TEST_ID, testModuleAddr, newAddr, govAdmin);
    directory.updateAddress(TEST_ID, newAddr);
    vm.stopPrank();

    assertEq(directory.getAddress(TEST_ID), newAddr);
  }

  function testUpdateToSameAddressRevert() public {
    vm.startPrank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);

    vm.expectRevert(Errors.IdenticalAddressSubmitted.selector);
    directory.updateAddress(TEST_ID, testModuleAddr);
    vm.stopPrank();
  }

  function testUpdateMissingRevert() public {
    vm.prank(govAdmin);
    vm.expectRevert(abi.encodeWithSelector(Errors.EntryDoesNotExist.selector, TEST_ID));
    directory.updateAddress(TEST_ID, testModuleAddr);
  }

  function testUpdateZeroAddressRevert() public {
    vm.startPrank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);

    vm.expectRevert(Errors.ZeroAddressDetected.selector);
    directory.updateAddress(TEST_ID, address(0));
    vm.stopPrank();
  }

  function testRemoveSuccess() public {
    vm.startPrank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);

    vm.expectEmit(true, true, false, true);
    emit AddressRemoved(TEST_ID, testModuleAddr, govAdmin);
    directory.removeAddress(TEST_ID);
    vm.stopPrank();

    assertFalse(directory.exists(TEST_ID));
    vm.expectRevert(abi.encodeWithSelector(Errors.EntryDoesNotExist.selector, TEST_ID));
    directory.getAddress(TEST_ID);
  }

  function testRemoveMissingRevert() public {
    vm.prank(govAdmin);
    vm.expectRevert(abi.encodeWithSelector(Errors.EntryDoesNotExist.selector, TEST_ID));
    directory.removeAddress(TEST_ID);
  }

  function testRegisterRemoveRegisterAgain() public {
    vm.startPrank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);
    directory.removeAddress(TEST_ID);
    directory.registerAddress(TEST_ID, address(0x222));
    vm.stopPrank();

    assertEq(directory.getAddress(TEST_ID), address(0x222));
  }

  function testMultipleGovernanceAccounts() public {
    vm.prank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);

    address newAddr = address(0x222);
    vm.prank(secondGov);
    directory.updateAddress(TEST_ID, newAddr);

    assertEq(directory.getAddress(TEST_ID), newAddr);
  }

  function testRoleRevocationAndRegrant() public {
    // Revoke role
    directory.revokeRole(AccessRoles.GOVERNANCE_ROLE, govAdmin);

    vm.prank(govAdmin);
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        govAdmin,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    directory.registerAddress(TEST_ID, testModuleAddr);

    // Regrant role
    directory.grantRole(AccessRoles.GOVERNANCE_ROLE, govAdmin);

    vm.prank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);
    assertEq(directory.getAddress(TEST_ID), testModuleAddr);
  }

  function testFreezeBehavior() public {
    vm.startPrank(govAdmin);
    directory.registerAddress(TEST_ID, testModuleAddr);

    vm.expectEmit(true, false, false, false);
    emit RegistryFrozen(govAdmin);
    directory.freeze();

    assertTrue(directory.isFrozen());

    // Any write operation should revert now
    vm.expectRevert(Errors.RegistryIsFrozen.selector);
    directory.updateAddress(TEST_ID, address(0x222));

    vm.expectRevert(Errors.RegistryIsFrozen.selector);
    directory.removeAddress(TEST_ID);

    vm.expectRevert(Errors.RegistryIsFrozen.selector);
    directory.registerAddress(ModuleIds.VAULT, address(0x333));

    vm.expectRevert(Errors.RegistryIsFrozen.selector);
    directory.freeze();
    vm.stopPrank();

    // View/read actions must still operate correctly after freezing
    assertEq(directory.getAddress(TEST_ID), testModuleAddr);
  }

  function testUnauthorizedCallerRevert() public {
    vm.prank(attacker);
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        attacker,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    directory.registerAddress(TEST_ID, testModuleAddr);
  }

  // Fuzz Tests
  function testFuzzRegister(bytes32 id, address target) public {
    vm.assume(target != address(0));
    vm.prank(govAdmin);
    directory.registerAddress(id, target);

    assertEq(directory.getAddress(id), target);
  }

  function testFuzzUpdate(bytes32 id, address target1, address target2) public {
    vm.assume(target1 != address(0));
    vm.assume(target2 != address(0));
    vm.assume(target1 != target2);

    vm.startPrank(govAdmin);
    directory.registerAddress(id, target1);
    directory.updateAddress(id, target2);
    vm.stopPrank();

    assertEq(directory.getAddress(id), target2);
  }
}
