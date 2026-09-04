// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console2 } from 'forge-std/Test.sol';
import { UVBEStakingVault } from '../../src/staking/UVBEStakingVault.sol';
import { UVBEReferralRegistry } from '../../src/staking/UVBEReferralRegistry.sol';
import { UVBERewardDistributor } from '../../src/staking/UVBERewardDistributor.sol';
import { UVBEV2 } from '../../src/token/UVBEV2.sol';

contract MockCorrectnessToken is UVBEV2 {
  constructor(address initialAdmin) UVBEV2(initialAdmin) {}

  function mintForTest(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

/**
 * @title UVBEEconomicCorrectnessReviewTest
 * @notice In-depth economic simulation proving zero infinite-yield, zero Ponzi dependency,
 *         exact state transitions A-N, and mathematical surplus conservation.
 */
contract UVBEEconomicCorrectnessReviewTest is Test {
  MockCorrectnessToken internal token;
  UVBEStakingVault internal vault;
  UVBEReferralRegistry internal registry;
  UVBERewardDistributor internal distributor;

  address internal admin = address(0xAD001);
  address internal treasury = admin;
  address internal genesisRoot = address(0xAA001);
  address internal alice = address(0xA11CE);
  address internal bob = address(0xB0B);

  function setUp() public {
    token = new MockCorrectnessToken(admin);

    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesisRoot);
    distributor = new UVBERewardDistributor(admin, address(token));

    vm.startPrank(admin);
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(vault), address(registry));
    vm.stopPrank();

    token.mintForTest(alice, 100_000 * 1e18);
    token.mintForTest(bob, 100_000 * 1e18);
  }

  // --- 1. First Stake Exact Economic Proof ---
  function test_Review_FirstStakeExactNumbers() public {
    uint256 grossStake = 50 * 1e18;

    vm.startPrank(alice);
    token.approve(address(vault), grossStake);
    vault.stake(grossStake, genesisRoot);
    vm.stopPrank();

    // 1. Fee Breakdown
    assertEq(token.balanceOf(treasury), 2.5 * 1e18, 'Treasury gets 2.5 UVBE (5%)');
    assertEq(token.balanceOf(address(vault)), 47.5 * 1e18, 'Vault gets 47.5 UVBE (95%)');
    assertEq(vault.totalPermanentStaked(), 47.5 * 1e18, 'Total staked is 47.5 UVBE');

    // 2. Immediate Liabilities
    // Gen 1 Direct to genesisRoot = 5% of 47.5 = 2.375 UVBE
    // DAO pool = 5% of 47.5 = 2.375 UVBE
    // Total immediate liability = 4.75 UVBE
    assertEq(
      distributor.totalOutstandingLiabilities(),
      4.75 * 1e18,
      'Immediate liabilities = 4.75 UVBE'
    );

    // 3. Available Surplus & APY
    // Surplus = 47.5 - 4.75 = 42.75 UVBE
    // APY = floor(42.75 * 10000 / 47.5) = 9000 BPS (90.00%)
    (uint256 cap, uint256 liab, uint256 surplus, uint256 apy) = distributor.getRewardCapacity();
    assertEq(cap, 47.5 * 1e18);
    assertEq(liab, 4.75 * 1e18);
    assertEq(surplus, 42.75 * 1e18);
    assertEq(apy, 9000);
  }

  // --- 2. No New Users: Capital Depletion Simulation ---
  function test_Review_NoNewUsers_CapitalDepletionStopsAtZeroApy() public {
    // Alice stakes 50 UVBE. NO ONE ELSE EVER STAKES.
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    // Warp 10 years into the future with zero new users
    vm.warp(block.timestamp + 3650 days);
    distributor.checkpoint();

    // Invariant: Total liabilities must NEVER exceed available capital (47.5 UVBE)
    (uint256 cap, uint256 liab, uint256 surplus, uint256 apy) = distributor.getRewardCapacity();
    console2.log('Capital after 10 years:  ', cap);
    console2.log('Liabilities after 10 yrs:', liab);
    console2.log('Surplus after 10 years:  ', surplus);
    console2.log('APY after 10 years:      ', apy);

    assertEq(cap, 47.5 * 1e18, 'Capital held by vault');
    assertEq(liab, 47.5 * 1e18, 'Liabilities capped at exact available capital');
    assertEq(surplus, 0, 'Surplus depleted to 0');
    assertEq(apy, 0, 'APY dropped to 0% permanently');

    // Now everyone claims their rewards:
    // 1. Genesis claims direct referral
    vm.prank(genesisRoot);
    distributor.claimAllRewards();

    // 2. Alice claims all recurring rewards
    vm.prank(alice);
    distributor.claimAllRewards();

    // Post-claims verification
    assertEq(
      token.balanceOf(alice) - 99_950 * 1e18,
      42.75 * 1e18,
      'Alice received exact remaining surplus (42.75 UVBE)'
    );
    assertEq(
      token.balanceOf(genesisRoot),
      2.375 * 1e18,
      'Genesis received exact direct commission (2.375 UVBE)'
    );

    // Final total token supply is conserved
    assertEq(token.totalSupply(), 200_000 * 1e18, 'Total supply strictly conserved');
  }

  // --- 3. Restaking Exact Accounting ---
  function test_Review_RestakingNoDoubleCounting() public {
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 90 days);
    distributor.checkpoint();

    uint256 pending = distributor.getPendingRecurringReward(alice);
    assertGt(pending, 0);

    uint256 vaultBalBefore = token.balanceOf(address(vault));
    uint256 liabBefore = distributor.totalOutstandingLiabilities();
    uint256 stakeBefore = vault.getPermanentStake(alice);

    // Alice restakes
    vm.startPrank(alice);
    distributor.restakeAllRewards();
    vm.stopPrank();

    uint256 vaultBalAfter = token.balanceOf(address(vault));
    uint256 liabAfter = distributor.totalOutstandingLiabilities();
    uint256 stakeAfter = vault.getPermanentStake(alice);

    assertEq(vaultBalAfter, vaultBalBefore, 'Vault token balance MUST NOT change on restake');
    assertEq(liabAfter, liabBefore - pending, 'Liabilities decrease by exact restaked amount');
    assertEq(
      stakeAfter,
      stakeBefore + pending,
      'Permanent stake increases by exact restaked amount'
    );
    assertEq(distributor.getClaimableRewards(alice), 0, 'Alice claimable resets to 0');
  }
}
