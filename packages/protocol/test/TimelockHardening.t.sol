// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/governance/UnifyVaultTimelock.sol';

contract TimelockHardeningTest is Test {
  UnifyVaultTimelock public timelock;
  address public gnosisSafe = address(0x9999);
  address public executorUser = address(0x8888);
  address public targetContract = address(0x7777);

  function setUp() public {
    address[] memory proposers = new address[](1);
    proposers[0] = gnosisSafe;
    address[] memory executors = new address[](1);
    executors[0] = address(0); // open execution

    timelock = new UnifyVaultTimelock(48 hours, proposers, executors, address(this));
  }

  function test_TimelockDelayRequirements() public {
    assertEq(timelock.getMinDelay(), 48 hours);
    assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), gnosisSafe));
  }

  function test_TimelockScheduleAndExecuteWith48HourDelay() public {
    bytes memory payload = abi.encodeWithSignature('dummyFunction()');
    bytes32 predecessor = bytes32(0);
    bytes32 salt = keccak256('test');

    bytes32 id = timelock.hashOperation(targetContract, 0, payload, predecessor, salt);
    vm.expectEmit(true, true, true, true);
    emit UnifyVaultTimelock.TimelockQueued(
      id,
      targetContract,
      0,
      payload,
      block.timestamp + 48 hours
    );
    vm.prank(gnosisSafe);
    timelock.schedule(targetContract, 0, payload, predecessor, salt, 48 hours);

    // Attempt premature execution before 48h
    vm.expectRevert();
    timelock.execute(targetContract, 0, payload, predecessor, salt);

    // Fast-forward 48 hours
    vm.warp(block.timestamp + 48 hours + 1);

    // Execute successfully after 48 hours
    vm.expectEmit(true, true, true, true);
    emit UnifyVaultTimelock.TimelockExecuted(
      timelock.hashOperation(targetContract, 0, payload, predecessor, salt),
      targetContract,
      0,
      payload
    );
    timelock.execute(targetContract, 0, payload, predecessor, salt);
  }
}
