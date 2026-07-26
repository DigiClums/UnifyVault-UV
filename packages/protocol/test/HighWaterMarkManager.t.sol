// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/vault/HighWaterMarkManager.sol';
import '../src/libraries/AccessRoles.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';

contract HighWaterMarkManagerTest is Test {
  HighWaterMarkManager public hwmManager;

  address public admin = address(0x111);
  address public controller = address(0x222);
  address public user = address(0x333);
  address public rando = address(0x999);

  event HighWaterMarkUpdated(address indexed user, uint256 previousValue, uint256 newValue);
  event HighWaterMarkReset(address indexed user);

  function setUp() public {
    hwmManager = new HighWaterMarkManager(admin);

    vm.startPrank(admin);
    hwmManager.grantRole(AccessRoles.CONTROLLER_ROLE, controller);
    vm.stopPrank();
  }

  // 1. Initial State
  function testInitialHWMIsZero() public {
    assertEq(hwmManager.highWaterMark(user), 0);

    (uint256 hwm, uint256 lastSettledCost) = hwmManager.performanceState(user);
    assertEq(hwm, 0);
    assertEq(lastSettledCost, 0);
  }

  // 2. First Update
  function testFirstUpdateSucceeds() public {
    uint256 firstValue = 1000e18;

    vm.startPrank(controller);
    hwmManager.updateHighWaterMark(user, firstValue);
    vm.stopPrank();

    assertEq(hwmManager.highWaterMark(user), firstValue);
  }

  // 3. Higher Update
  function testHigherUpdateSucceeds() public {
    vm.startPrank(controller);
    hwmManager.updateHighWaterMark(user, 1000e18);
    hwmManager.updateHighWaterMark(user, 1500e18);
    hwmManager.updateHighWaterMark(user, 2500e18);
    vm.stopPrank();

    assertEq(hwmManager.highWaterMark(user), 2500e18);
  }

  // 4. Lower Update Rejected
  function testLowerUpdateReverts() public {
    vm.startPrank(controller);
    hwmManager.updateHighWaterMark(user, 1000e18);

    vm.expectRevert(
      abi.encodeWithSelector(
        HighWaterMarkManager.HighWaterMarkNotIncreased.selector,
        1000e18,
        800e18
      )
    );
    hwmManager.updateHighWaterMark(user, 800e18);
    vm.stopPrank();

    assertEq(hwmManager.highWaterMark(user), 1000e18);
  }

  // 5. Equal Update Rejected
  function testEqualUpdateReverts() public {
    vm.startPrank(controller);
    hwmManager.updateHighWaterMark(user, 1000e18);

    vm.expectRevert(
      abi.encodeWithSelector(
        HighWaterMarkManager.HighWaterMarkNotIncreased.selector,
        1000e18,
        1000e18
      )
    );
    hwmManager.updateHighWaterMark(user, 1000e18);
    vm.stopPrank();

    assertEq(hwmManager.highWaterMark(user), 1000e18);
  }

  // 6. Reset Works
  function testResetWorks() public {
    vm.startPrank(controller);
    hwmManager.updateHighWaterMark(user, 1000e18);
    assertEq(hwmManager.highWaterMark(user), 1000e18);

    hwmManager.resetHighWaterMark(user);
    assertEq(hwmManager.highWaterMark(user), 0);

    // After reset, a new update (>0) succeeds
    hwmManager.updateHighWaterMark(user, 500e18);
    assertEq(hwmManager.highWaterMark(user), 500e18);
    vm.stopPrank();
  }

  // 7. Unauthorized Caller Reverts
  function testUnauthorizedUpdateReverts() public {
    vm.startPrank(rando);
    vm.expectRevert();
    hwmManager.updateHighWaterMark(user, 1000e18);
    vm.stopPrank();
  }

  function testUnauthorizedResetReverts() public {
    vm.startPrank(controller);
    hwmManager.updateHighWaterMark(user, 1000e18);
    vm.stopPrank();

    vm.startPrank(rando);
    vm.expectRevert();
    hwmManager.resetHighWaterMark(user);
    vm.stopPrank();
  }

  // 8. Event Emission
  function testUpdateHighWaterMarkEvent() public {
    vm.startPrank(controller);
    vm.expectEmit(true, false, false, true);
    emit HighWaterMarkUpdated(user, 0, 1000e18);
    hwmManager.updateHighWaterMark(user, 1000e18);

    vm.expectEmit(true, false, false, true);
    emit HighWaterMarkUpdated(user, 1000e18, 1500e18);
    hwmManager.updateHighWaterMark(user, 1500e18);
    vm.stopPrank();
  }

  function testResetHighWaterMarkEvent() public {
    vm.startPrank(controller);
    hwmManager.updateHighWaterMark(user, 1000e18);

    vm.expectEmit(true, false, false, true);
    emit HighWaterMarkReset(user);
    hwmManager.resetHighWaterMark(user);
    vm.stopPrank();
  }

  // 9. Zero Address Safety Validations
  function testUpdateZeroUserReverts() public {
    vm.startPrank(controller);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.ZeroAddressDetected.selector));
    hwmManager.updateHighWaterMark(address(0), 1000e18);
    vm.stopPrank();
  }

  function testResetZeroUserReverts() public {
    vm.startPrank(controller);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.ZeroAddressDetected.selector));
    hwmManager.resetHighWaterMark(address(0));
    vm.stopPrank();
  }

  // 10. Fuzz Tests for Monotonic Growth
  function testFuzzMonotonicHWMGrowth(uint256 val1, uint256 val2) public {
    val1 = bound(val1, 1, type(uint128).max);
    val2 = bound(val2, 1, type(uint128).max);

    vm.startPrank(controller);
    hwmManager.updateHighWaterMark(user, val1);

    if (val2 > val1) {
      hwmManager.updateHighWaterMark(user, val2);
      assertEq(hwmManager.highWaterMark(user), val2);
    } else {
      vm.expectRevert(
        abi.encodeWithSelector(HighWaterMarkManager.HighWaterMarkNotIncreased.selector, val1, val2)
      );
      hwmManager.updateHighWaterMark(user, val2);
      assertEq(hwmManager.highWaterMark(user), val1);
    }
    vm.stopPrank();
  }

  function testFuzzSequentialUpdatesMonotonic(uint256[5] memory values) public {
    vm.startPrank(controller);
    uint256 currentHWM = 0;

    for (uint256 i = 0; i < values.length; i++) {
      uint256 val = bound(values[i], 1, type(uint128).max);
      if (val > currentHWM) {
        hwmManager.updateHighWaterMark(user, val);
        currentHWM = val;
        assertEq(hwmManager.highWaterMark(user), currentHWM);
      } else {
        vm.expectRevert();
        hwmManager.updateHighWaterMark(user, val);
        assertEq(hwmManager.highWaterMark(user), currentHWM);
      }
    }
    vm.stopPrank();
  }
}
