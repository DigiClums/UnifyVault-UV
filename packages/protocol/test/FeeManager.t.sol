// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/treasury/FeeManager.sol';
import '../src/libraries/AccessRoles.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';

contract FeeManagerTest is Test {
  FeeManager public feeManager;

  address public treasury = address(0x111);
  address public newTreasury = address(0x222);
  address public gov = address(0xABC);
  address public rando = address(0x999);

  event DepositFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
  event RedeemFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
  event PerformanceFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
  event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

  function setUp() public {
    feeManager = new FeeManager(treasury);

    // Grant governance role to gov address
    feeManager.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
  }

  function testInitialization() public {
    assertEq(feeManager.depositFeeBps(), 25);
    assertEq(feeManager.redeemFeeBps(), 200);
    assertEq(feeManager.performanceFeeBps(), 500);
    assertEq(feeManager.treasury(), treasury);

    assertTrue(feeManager.hasRole(feeManager.DEFAULT_ADMIN_ROLE(), address(this)));
    assertTrue(feeManager.hasRole(AccessRoles.GOVERNANCE_ROLE, address(this)));
    assertTrue(feeManager.hasRole(AccessRoles.GOVERNANCE_ROLE, gov));
  }

  function testZeroAddressInitializationRevert() public {
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.ZeroAddressDetected.selector));
    new FeeManager(address(0));
  }

  // --- Deposit Fee Tests ---

  function testSetDepositFeeBpsSuccessAndEvent() public {
    uint256 newFee = 100; // 1.00%
    vm.startPrank(gov);
    vm.expectEmit(true, true, true, true);
    emit DepositFeeUpdated(25, newFee);

    feeManager.setDepositFeeBps(newFee);
    vm.stopPrank();

    assertEq(feeManager.depositFeeBps(), newFee);
  }

  function testSetDepositFeeBpsAtMaxCap() public {
    uint256 maxFee = feeManager.MAX_DEPOSIT_FEE_BPS(); // 500 = 5.00%
    vm.prank(gov);
    feeManager.setDepositFeeBps(maxFee);
    assertEq(feeManager.depositFeeBps(), maxFee);
  }

  function testSetDepositFeeBpsCapExceededRevert() public {
    uint256 capExceededFee = feeManager.MAX_DEPOSIT_FEE_BPS() + 1; // 501
    vm.startPrank(gov);
    vm.expectRevert(
      abi.encodeWithSelector(
        FeeManager.FeeExceedsMaxCap.selector,
        capExceededFee,
        feeManager.MAX_DEPOSIT_FEE_BPS()
      )
    );
    feeManager.setDepositFeeBps(capExceededFee);
    vm.stopPrank();
  }

  // --- Redeem Fee Tests ---

  function testSetRedeemFeeBpsSuccessAndEvent() public {
    uint256 newFee = 300; // 3.00%
    vm.startPrank(gov);
    vm.expectEmit(true, true, true, true);
    emit RedeemFeeUpdated(200, newFee);

    feeManager.setRedeemFeeBps(newFee);
    vm.stopPrank();

    assertEq(feeManager.redeemFeeBps(), newFee);
  }

  function testSetRedeemFeeBpsAtMaxCap() public {
    uint256 maxFee = feeManager.MAX_REDEEM_FEE_BPS(); // 500 = 5.00%
    vm.prank(gov);
    feeManager.setRedeemFeeBps(maxFee);
    assertEq(feeManager.redeemFeeBps(), maxFee);
  }

  function testSetRedeemFeeBpsCapExceededRevert() public {
    uint256 capExceededFee = feeManager.MAX_REDEEM_FEE_BPS() + 1; // 501
    vm.startPrank(gov);
    vm.expectRevert(
      abi.encodeWithSelector(
        FeeManager.FeeExceedsMaxCap.selector,
        capExceededFee,
        feeManager.MAX_REDEEM_FEE_BPS()
      )
    );
    feeManager.setRedeemFeeBps(capExceededFee);
    vm.stopPrank();
  }

  // --- Performance Fee Tests ---

  function testSetPerformanceFeeBpsSuccessAndEvent() public {
    uint256 newFee = 1000; // 10.00%
    vm.startPrank(gov);
    vm.expectEmit(true, true, true, true);
    emit PerformanceFeeUpdated(500, newFee);

    feeManager.setPerformanceFeeBps(newFee);
    vm.stopPrank();

    assertEq(feeManager.performanceFeeBps(), newFee);
  }

  function testSetPerformanceFeeBpsAtMaxCap() public {
    uint256 maxFee = feeManager.MAX_PERFORMANCE_FEE_BPS(); // 2000 = 20.00%
    vm.prank(gov);
    feeManager.setPerformanceFeeBps(maxFee);
    assertEq(feeManager.performanceFeeBps(), maxFee);
  }

  function testSetPerformanceFeeBpsCapExceededRevert() public {
    uint256 capExceededFee = feeManager.MAX_PERFORMANCE_FEE_BPS() + 1; // 2001
    vm.startPrank(gov);
    vm.expectRevert(
      abi.encodeWithSelector(
        FeeManager.FeeExceedsMaxCap.selector,
        capExceededFee,
        feeManager.MAX_PERFORMANCE_FEE_BPS()
      )
    );
    feeManager.setPerformanceFeeBps(capExceededFee);
    vm.stopPrank();
  }

  // --- Treasury Tests ---

  function testSetTreasurySuccessAndEvent() public {
    vm.startPrank(gov);
    vm.expectEmit(true, true, true, true);
    emit TreasuryUpdated(treasury, newTreasury);

    feeManager.setTreasury(newTreasury);
    vm.stopPrank();

    assertEq(feeManager.treasury(), newTreasury);
  }

  function testSetTreasuryZeroAddressRevert() public {
    vm.startPrank(gov);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.ZeroAddressDetected.selector));
    feeManager.setTreasury(address(0));
    vm.stopPrank();
  }

  // --- Permission Tests ---

  function testUnauthorizedSettersRevert() public {
    vm.startPrank(rando);

    bytes32 govRole = AccessRoles.GOVERNANCE_ROLE;

    vm.expectRevert(
      abi.encodeWithSignature('AccessControlUnauthorizedAccount(address,bytes32)', rando, govRole)
    );
    feeManager.setDepositFeeBps(50);

    vm.expectRevert(
      abi.encodeWithSignature('AccessControlUnauthorizedAccount(address,bytes32)', rando, govRole)
    );
    feeManager.setRedeemFeeBps(100);

    vm.expectRevert(
      abi.encodeWithSignature('AccessControlUnauthorizedAccount(address,bytes32)', rando, govRole)
    );
    feeManager.setPerformanceFeeBps(300);

    vm.expectRevert(
      abi.encodeWithSignature('AccessControlUnauthorizedAccount(address,bytes32)', rando, govRole)
    );
    feeManager.setTreasury(newTreasury);

    vm.stopPrank();
  }
}
