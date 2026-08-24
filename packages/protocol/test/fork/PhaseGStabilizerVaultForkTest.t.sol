// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console } from 'forge-std/Test.sol';
import { StabilizerVault, IPoolManagerV4 } from '../../src/stabilizer/StabilizerVault.sol';
import { IPortfolioManager } from '../../src/interfaces/IPortfolioManager.sol';
import { IOracle } from '../../src/interfaces/IOracle.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { AccessRoles } from '../../src/libraries/AccessRoles.sol';

/**
 * @title PhaseGStabilizerVaultForkTest
 * @notice Comprehensive Phase G Fork Integration Test Suite for StabilizerVault on Base Mainnet (Chain ID 8453)
 */
contract PhaseGStabilizerVaultForkTest is Test {
  // Canonical Base Mainnet Addresses
  address public constant BASE_MAINNET_PORTFOLIO_MANAGER =
    0x66182F56BD5E523c655f6890290aB519f528e83f;
  address public constant BASE_MAINNET_ORACLE_MANAGER = 0x91B488cdE0f2Ef28141FE4ffD8531c4179B48EA7;
  address public constant BASE_MAINNET_CONTROLLER = 0xe6Cd99f3DcF39BD76D91D211Dce7f4BdF801C366;
  address public constant BASE_MAINNET_UVBE = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address public constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
  address public constant BASE_MAINNET_UNISWAP_V4_POOL_MANAGER =
    0x498581fF718922c3f8e6A244956aF099B2652b2b;

  // Expected Canonical Base Mainnet Pool Id
  bytes32 public constant EXPECTED_POOL_ID =
    0x21db2ac844f3933a74135e6feed4bd06c0f6a4a9dcc13c9b22dde903710c5daa;

  address public admin = address(0x441dbf8076d0b143EC17199baE94Daa884161454);
  address public keeper = address(0xAA11Bb22cC33DD44ee55FF660011223344556677);
  address public user = address(0x1111111111111111111111111111111111111111);

  StabilizerVault public vault;

  function setUp() public {
    // 1. Deploy StabilizerVault instance
    vm.startPrank(admin);
    vault = new StabilizerVault(
      admin,
      BASE_MAINNET_USDC,
      BASE_MAINNET_UVBE,
      BASE_MAINNET_PORTFOLIO_MANAGER,
      BASE_MAINNET_ORACLE_MANAGER,
      BASE_MAINNET_CONTROLLER,
      BASE_MAINNET_UNISWAP_V4_POOL_MANAGER,
      75, // fee = 75 (0.0075%)
      1, // tickSpacing = 1
      address(0) // hooks = address(0)
    );

    // Grant keeper role
    vault.grantRole(vault.KEEPER_ROLE(), keeper);
    vm.stopPrank();

    // 2. Fund StabilizerVault with operational inventory
    deal(BASE_MAINNET_USDC, address(vault), 10_000 * 1e6); // 10,000 USDC
    deal(BASE_MAINNET_UVBE, address(vault), 10_000 * 1e18); // 10,000 UVBE
  }

  // --- Test 1: PoolId and PoolKey Integrity ---
  function test_01_poolKeyAndPoolIdVerification() public {
    bytes32 poolId = vault.getPoolId();
    assertEq(
      poolId,
      EXPECTED_POOL_ID,
      'Pool ID must strictly match canonical Base Mainnet Pool ID'
    );

    IPoolManagerV4.PoolKey memory key = vault.getPoolKey();
    assertEq(key.currency0, BASE_MAINNET_USDC, 'currency0 must be USDC');
    assertEq(key.currency1, BASE_MAINNET_UVBE, 'currency1 must be UVBE');
    assertEq(key.fee, 75, 'fee must be 75');
    assertEq(key.tickSpacing, 1, 'tickSpacing must be 1');
    assertEq(key.hooks, address(0), 'hooks must be address(0)');
  }

  // --- Test 2: Authoritative NAV Reading ---
  function test_02_authoritativeNavReading() public {
    uint256 nav = vault.getAuthoritativeNAV();
    assertTrue(nav > 0, 'Authoritative NAV must be non-zero');
    console.log('Authoritative NAV from PortfolioManager (USD 18 dec):', nav);
  }

  // --- Test 3: Price in Parity (NAV == DEX) -> No Trade ---
  function test_03_parityNoTrade() public {
    uint256 nav = vault.getAuthoritativeNAV();
    vm.prank(admin);
    vault.setMockMarketState(true, nav, 100_000 * 1e6);

    (bool shouldExecute, , uint256 devBps, , string memory reason) = vault.checkStabilization();
    assertFalse(shouldExecute, 'Should not execute trade when price is in parity');
    assertEq(devBps, 0, 'Deviation should be 0');
    assertEq(reason, 'PRICE_IN_PARITY');
  }

  // --- Test 4: DEX 1% Below NAV -> Bounded BUY UVBE ---
  function test_04_dexBelowNavBoundedBuy() public {
    uint256 nav = vault.getAuthoritativeNAV();
    uint256 dexPrice = (nav * 99) / 100; // 1% below NAV (100 BPS deviation)

    vm.prank(admin);
    vault.setMockMarketState(true, dexPrice, 100_000 * 1e6);

    (
      bool shouldExecute,
      bool isBuy,
      uint256 devBps,
      uint256 tradeAmount,
      string memory reason
    ) = vault.checkStabilization();

    assertTrue(shouldExecute, 'Should execute stabilization');
    assertTrue(isBuy, 'Direction should be BUY');
    assertEq(devBps, 100, 'Deviation should be 100 BPS');
    assertEq(tradeAmount, 100 * 1e6, 'Trade amount should be bounded at 100 USDC');
    assertEq(reason, 'READY_TO_STABILIZE');

    // Execute as Keeper
    vm.prank(keeper);
    vault.executeStabilization();

    // Verify economic convergence: new DEX price moved upward toward NAV
    uint256 newDex = vault.getDexPrice();
    assertTrue(newDex > dexPrice, 'DEX price must converge upward toward NAV');
  }

  // --- Test 5: DEX 1% Above NAV -> Bounded SELL UVBE ---
  function test_05_dexAboveNavBoundedSell() public {
    uint256 nav = vault.getAuthoritativeNAV();
    uint256 dexPrice = (nav * 101) / 100; // 1% above NAV (100 BPS deviation)

    vm.prank(admin);
    vault.setMockMarketState(true, dexPrice, 100_000 * 1e6);

    (
      bool shouldExecute,
      bool isBuy,
      uint256 devBps,
      uint256 tradeAmount,
      string memory reason
    ) = vault.checkStabilization();

    assertTrue(shouldExecute, 'Should execute stabilization');
    assertFalse(isBuy, 'Direction should be SELL');
    assertTrue(devBps >= 98 && devBps <= 101, 'Deviation should be ~100 BPS');
    assertEq(tradeAmount, 100 * 1e6, 'Trade amount should be bounded at 100 USDC');
    assertEq(reason, 'READY_TO_STABILIZE');

    // Execute as Keeper
    vm.prank(keeper);
    vault.executeStabilization();

    // Verify economic convergence: new DEX price moved downward toward NAV
    uint256 newDex = vault.getDexPrice();
    assertTrue(newDex < dexPrice, 'DEX price must converge downward toward NAV');
  }

  // --- Test 6: Deviation > 2% (200 BPS) -> Emergency Halt ---
  function test_06_emergencyHaltOnExtremeDeviation() public {
    uint256 nav = vault.getAuthoritativeNAV();
    uint256 dexPrice = (nav * 97) / 100; // 3% below NAV (300 BPS deviation)

    vm.prank(admin);
    vault.setMockMarketState(true, dexPrice, 100_000 * 1e6);

    (bool shouldExecute, , uint256 devBps, , string memory reason) = vault.checkStabilization();
    assertFalse(shouldExecute, 'Should NOT execute trade on >2% deviation');
    assertEq(devBps, 300, 'Deviation should be 300 BPS');
    assertEq(reason, 'EMERGENCY_DEVIATION_HALT');

    // Executing must revert with DeviationExceedsEmergencyThreshold
    vm.prank(keeper);
    vm.expectRevert(
      abi.encodeWithSelector(StabilizerVault.DeviationExceedsEmergencyThreshold.selector, 300)
    );
    vault.executeStabilization();
  }

  // --- Test 7: Cooldown Enforced (300 seconds) ---
  function test_07_cooldownEnforcement() public {
    uint256 nav = vault.getAuthoritativeNAV();
    uint256 dexPrice = (nav * 99) / 100; // 1% below NAV

    vm.prank(admin);
    vault.setMockMarketState(true, dexPrice, 100_000 * 1e6);

    // 1st Trade succeeds
    vm.prank(keeper);
    vault.executeStabilization();

    // Re-assert mock price below NAV so deviation remains active
    vm.prank(admin);
    vault.setMockMarketState(true, dexPrice, 100_000 * 1e6);

    // 2nd Trade immediately after must fail due to cooldown
    (bool shouldExecute, , , , string memory reason) = vault.checkStabilization();
    assertFalse(shouldExecute, 'Second trade immediately after should be blocked by cooldown');
    assertEq(reason, 'COOLDOWN_ACTIVE');

    // Fast forward 299 seconds -> still blocked
    vm.warp(block.timestamp + 299);
    (shouldExecute, , , , reason) = vault.checkStabilization();
    assertFalse(shouldExecute, 'Blocked at 299s');

    // Fast forward 1 more second (300s total) -> ready
    vm.warp(block.timestamp + 1);
    (shouldExecute, , , , reason) = vault.checkStabilization();
    assertTrue(shouldExecute, 'Unblocked after 300s cooldown');
  }

  // --- Test 8: Daily 500 USDC Exposure Cap ---
  function test_08_dailyExposureCap() public {
    uint256 nav = vault.getAuthoritativeNAV();
    uint256 dexPrice = (nav * 99) / 100;

    vm.prank(admin);
    vault.setMockMarketState(true, dexPrice, 100_000 * 1e6);

    // Perform 5 trades of 100 USDC spaced by 300s (total 1200s < 1 day)
    for (uint256 i = 0; i < 5; i++) {
      vm.prank(keeper);
      vault.executeStabilization();
      vm.warp(block.timestamp + 300);
      // Keep price at 1% below NAV for the test loop
      vm.prank(admin);
      vault.setMockMarketState(true, dexPrice, 100_000 * 1e6);
    }

    // 6th trade must be blocked because 500 USDC daily cap is exhausted
    (bool shouldExecute, , , , string memory reason) = vault.checkStabilization();
    assertFalse(shouldExecute, '6th trade must be blocked by daily exposure cap');
    assertEq(reason, 'DAILY_EXPOSURE_EXHAUSTED');
  }

  // --- Test 9: Hard Limit Constraints on Governance Parameter Changes ---
  function test_09_governanceParameterHardBounds() public {
    vm.startPrank(admin);

    // Attempting to set max trade > 100 USDC must revert
    vm.expectRevert(StabilizerVault.ParameterExceedsHardLimit.selector);
    vault.setParameters(101 * 1e6, 500 * 1e6, 300, 1000 * 1e6);

    // Attempting to set daily exposure > 500 USDC must revert
    vm.expectRevert(StabilizerVault.ParameterExceedsHardLimit.selector);
    vault.setParameters(100 * 1e6, 501 * 1e6, 300, 1000 * 1e6);

    // Attempting to set cooldown < 300s must revert
    vm.expectRevert(StabilizerVault.ParameterExceedsHardLimit.selector);
    vault.setParameters(100 * 1e6, 500 * 1e6, 299, 1000 * 1e6);

    // Valid parameters within bounds succeed
    vault.setParameters(50 * 1e6, 250 * 1e6, 600, 2000 * 1e6);
    assertEq(vault.maxTradeUsdc(), 50 * 1e6);
    assertEq(vault.maxDailyExposureUsdc(), 250 * 1e6);
    assertEq(vault.cooldownDuration(), 600);
    assertEq(vault.minPoolLiquidity(), 2000 * 1e6);

    vm.stopPrank();
  }

  // --- Test 10: Keeper Unauthorized Actions Revert ---
  function test_10_keeperPrivilegeBoundaries() public {
    vm.startPrank(keeper);

    // Keeper cannot change parameters
    vm.expectRevert();
    vault.setParameters(100 * 1e6, 500 * 1e6, 300, 1000 * 1e6);

    // Keeper cannot withdraw funds
    vm.expectRevert();
    vault.withdrawInventory(BASE_MAINNET_USDC, 100 * 1e6, keeper);

    // Keeper cannot pause/unpause
    vm.expectRevert();
    vault.pause();

    vm.stopPrank();
  }

  // --- Test 11: Governance Inventory Withdrawal Security ---
  function test_11_governanceInventoryWithdrawal() public {
    address recipient = address(0x9999999999999999999999999999999999999999);
    uint256 usdcBalBefore = IERC20(BASE_MAINNET_USDC).balanceOf(recipient);

    vm.prank(admin);
    vault.withdrawInventory(BASE_MAINNET_USDC, 500 * 1e6, recipient);

    uint256 usdcBalAfter = IERC20(BASE_MAINNET_USDC).balanceOf(recipient);
    assertEq(
      usdcBalAfter - usdcBalBefore,
      500 * 1e6,
      'Recipient must receive exact withdrawn amount'
    );

    // Attempting to withdraw arbitrary unauthorized asset fails
    vm.prank(admin);
    vm.expectRevert(StabilizerVault.InvalidPoolConfiguration.selector);
    vault.withdrawInventory(address(0x1234), 100, recipient);
  }

  // --- Test 12: Existing Protocol Invariants Unchanged ---
  function test_12_existingProtocolInvariantsUnchanged() public {
    // 1. Verify PortfolioManager address & NAV method intact
    (uint256 backing, uint256 price) = IPortfolioManager(BASE_MAINNET_PORTFOLIO_MANAGER)
      .calculateUVPrice();
    assertTrue(backing > 0, 'PortfolioManager backing intact');
    assertTrue(price > 0, 'PortfolioManager price intact');

    // 2. Verify UVBE total supply intact
    uint256 supply = IERC20(BASE_MAINNET_UVBE).totalSupply();
    assertTrue(supply > 0, 'UVBE supply intact');
  }
}
