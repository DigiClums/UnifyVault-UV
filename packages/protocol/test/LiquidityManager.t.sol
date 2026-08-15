// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/vault/LiquidityManager.sol';
import '../src/interfaces/ILiquidityManager.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';

contract LiquidityManagerTest is Test {
  ProtocolDirectory public directory;
  LiquidityManager public liquidityManager;

  address public gov = address(0x11);
  address public controller = address(0x22);
  address public user = address(0x33);
  address public vaultMock = address(0x44);

  address public usdc = address(0x101);
  address public wbtc = address(0x102);
  address public weth = address(0x103);

  // Event declarations for vm.expectEmit
  event RefillRequired(
    address indexed asset,
    uint256 currentOperationalBalance,
    uint256 targetOperationalBalance,
    uint256 requiredRefillAmount
  );

  event ReserveSweepRequired(
    address indexed asset,
    uint256 currentOperationalBalance,
    uint256 targetOperationalBalance,
    uint256 excessSweepAmount
  );

  event OperationalLiquidityRefilled(
    address indexed asset,
    uint256 amount,
    uint256 newOperationalBalance,
    uint256 newReserveBalance,
    address indexed caller
  );

  event ReserveLiquiditySwept(
    address indexed asset,
    uint256 amount,
    uint256 newOperationalBalance,
    uint256 newReserveBalance,
    address indexed caller
  );

  event ThresholdsConfigured(
    address indexed asset,
    uint256 operationalTargetBps,
    uint256 refillThresholdBps,
    uint256 excessThresholdBps,
    address indexed caller
  );

  event LiquidityBalancesSynced(
    address indexed asset,
    uint256 operationalBalance,
    uint256 reserveBalance,
    address indexed caller
  );

  function setUp() public {
    vm.startPrank(gov);
    directory = new ProtocolDirectory();
    liquidityManager = new LiquidityManager(gov, address(directory));

    liquidityManager.grantRole(AccessRoles.CONTROLLER_ROLE, controller);
    directory.registerAddress(ModuleIds.VAULT, vaultMock);
    directory.registerAddress(ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
    vm.stopPrank();
  }

  function test_InitialDefaults() public {
    (uint256 targetBps, uint256 refillBps, uint256 excessBps) = liquidityManager.getThresholds(
      usdc
    );
    assertEq(targetBps, 1000);
    assertEq(refillBps, 500);
    assertEq(excessBps, 1500);
  }

  function test_SetThresholds() public {
    vm.prank(gov);
    vm.expectEmit(true, false, false, true);
    emit ThresholdsConfigured(usdc, 1200, 600, 1800, gov);

    liquidityManager.setThresholds(usdc, 1200, 600, 1800);

    (uint256 targetBps, uint256 refillBps, uint256 excessBps) = liquidityManager.getThresholds(
      usdc
    );
    assertEq(targetBps, 1200);
    assertEq(refillBps, 600);
    assertEq(excessBps, 1800);
  }

  function test_SetThresholds_InvalidReverts() public {
    vm.startPrank(gov);
    // Refill > Target
    vm.expectRevert(ILiquidityManager.InvalidThresholdConfiguration.selector);
    liquidityManager.setThresholds(usdc, 1000, 1100, 1500);

    // Target > Excess
    vm.expectRevert(ILiquidityManager.InvalidThresholdConfiguration.selector);
    liquidityManager.setThresholds(usdc, 1000, 500, 900);

    // Excess > 10000 BPS
    vm.expectRevert(ILiquidityManager.InvalidThresholdConfiguration.selector);
    liquidityManager.setThresholds(usdc, 1000, 500, 10001);
    vm.stopPrank();
  }

  function test_ResetThresholds() public {
    vm.startPrank(gov);
    liquidityManager.setThresholds(usdc, 1200, 600, 1800);
    liquidityManager.resetThresholds(usdc);
    vm.stopPrank();

    (uint256 targetBps, uint256 refillBps, uint256 excessBps) = liquidityManager.getThresholds(
      usdc
    );
    assertEq(targetBps, 1000);
    assertEq(refillBps, 500);
    assertEq(excessBps, 1500);
  }

  function test_LiquidityBalancesAccounting() public {
    vm.startPrank(gov);
    liquidityManager.setLiquidityBalances(usdc, 1000, 9000);
    vm.stopPrank();

    (uint256 op, uint256 res, uint256 total) = liquidityManager.getLiquidityBalances(usdc);
    assertEq(op, 1000);
    assertEq(res, 9000);
    assertEq(total, 10000);

    // Record deposit
    vm.prank(controller);
    liquidityManager.recordDeposit(usdc, 500);

    (op, res, total) = liquidityManager.getLiquidityBalances(usdc);
    assertEq(op, 1500);
    assertEq(res, 9000);

    // Record withdrawal
    vm.prank(controller);
    liquidityManager.recordWithdrawal(usdc, 200);

    (op, res, total) = liquidityManager.getLiquidityBalances(usdc);
    assertEq(op, 1300);
    assertEq(res, 9000);
  }

  function test_CheckLiquidity_RefillRequired() public {
    // Total = 1000, op = 40 (4%), res = 960. Target = 10% (100).
    vm.prank(gov);
    liquidityManager.setLiquidityBalances(usdc, 40, 960);

    vm.expectEmit(true, false, false, true);
    emit RefillRequired(usdc, 40, 100, 60);

    (bool needsRefill, bool needsSweep, uint256 amount) = liquidityManager.checkLiquidity(usdc);
    assertTrue(needsRefill);
    assertFalse(needsSweep);
    assertEq(amount, 60);
  }

  function test_CheckLiquidity_ReserveSweepRequired() public {
    // Total = 1000, op = 200 (20%), res = 800. Target = 10% (100).
    vm.prank(gov);
    liquidityManager.setLiquidityBalances(usdc, 200, 800);

    vm.expectEmit(true, false, false, true);
    emit ReserveSweepRequired(usdc, 200, 100, 100);

    (bool needsRefill, bool needsSweep, uint256 amount) = liquidityManager.checkLiquidity(usdc);
    assertFalse(needsRefill);
    assertTrue(needsSweep);
    assertEq(amount, 100);
  }

  function test_CheckLiquidity_BalancedNoEvent() public {
    // Total = 1000, op = 100 (10%), res = 900.
    vm.prank(gov);
    liquidityManager.setLiquidityBalances(usdc, 100, 900);

    (bool needsRefill, bool needsSweep, uint256 amount) = liquidityManager.checkLiquidity(usdc);
    assertFalse(needsRefill);
    assertFalse(needsSweep);
    assertEq(amount, 0);
  }

  function test_RefillOperationalLiquidity() public {
    vm.startPrank(gov);
    liquidityManager.setLiquidityBalances(usdc, 40, 960);

    vm.expectEmit(true, false, false, true);
    emit OperationalLiquidityRefilled(usdc, 60, 100, 900, gov);

    liquidityManager.refillOperationalLiquidity(usdc, 60);

    (uint256 op, uint256 res, uint256 total) = liquidityManager.getLiquidityBalances(usdc);
    assertEq(op, 100);
    assertEq(res, 900);
    assertEq(total, 1000);
    vm.stopPrank();
  }

  function test_RefillOperationalLiquidity_InsufficientReserveReverts() public {
    vm.startPrank(gov);
    liquidityManager.setLiquidityBalances(usdc, 40, 50);

    vm.expectRevert(
      abi.encodeWithSelector(ILiquidityManager.InsufficientReserveBalance.selector, usdc, 60, 50)
    );
    liquidityManager.refillOperationalLiquidity(usdc, 60);
    vm.stopPrank();
  }

  function test_SweepReserveLiquidity() public {
    vm.startPrank(gov);
    liquidityManager.setLiquidityBalances(usdc, 200, 800);

    vm.expectEmit(true, false, false, true);
    emit ReserveLiquiditySwept(usdc, 100, 100, 900, gov);

    liquidityManager.sweepReserveLiquidity(usdc, 100);

    (uint256 op, uint256 res, uint256 total) = liquidityManager.getLiquidityBalances(usdc);
    assertEq(op, 100);
    assertEq(res, 900);
    assertEq(total, 1000);
    vm.stopPrank();
  }

  function test_SweepReserveLiquidity_InsufficientOperationalReverts() public {
    vm.startPrank(gov);
    liquidityManager.setLiquidityBalances(usdc, 50, 950);

    vm.expectRevert(
      abi.encodeWithSelector(
        ILiquidityManager.InsufficientOperationalBalance.selector,
        usdc,
        100,
        50
      )
    );
    liquidityManager.sweepReserveLiquidity(usdc, 100);
    vm.stopPrank();
  }

  function test_MultiAssetSupport() public {
    vm.startPrank(gov);
    liquidityManager.setLiquidityBalances(usdc, 100, 900);
    liquidityManager.setLiquidityBalances(wbtc, 2, 98);
    liquidityManager.setLiquidityBalances(weth, 15, 85);

    liquidityManager.setThresholds(wbtc, 2000, 1000, 3000); // 20% target, 10% refill, 30% excess
    vm.stopPrank();

    (uint256 targetBpsUsdc, , ) = liquidityManager.getThresholds(usdc);
    (uint256 targetBpsWbtc, , ) = liquidityManager.getThresholds(wbtc);
    assertEq(targetBpsUsdc, 1000);
    assertEq(targetBpsWbtc, 2000);

    (uint256 opUsdc, , ) = liquidityManager.getLiquidityBalances(usdc);
    (uint256 opWbtc, , ) = liquidityManager.getLiquidityBalances(wbtc);
    assertEq(opUsdc, 100);
    assertEq(opWbtc, 2);
  }

  function test_ProtocolDirectoryIntegration() public {
    vm.prank(gov);
    liquidityManager.syncModules();
    assertEq(liquidityManager.custodyVault(), vaultMock);
  }

  function test_AccessControl() public {
    vm.startPrank(user);
    vm.expectRevert();
    liquidityManager.setThresholds(usdc, 1000, 500, 1500);

    vm.expectRevert();
    liquidityManager.refillOperationalLiquidity(usdc, 10);

    vm.expectRevert();
    liquidityManager.sweepReserveLiquidity(usdc, 10);

    vm.expectRevert();
    liquidityManager.recordDeposit(usdc, 100);
    vm.stopPrank();
  }
}
