// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';
import '../../src/staking/UVBERewardReserve.sol';
import '../../src/staking/UVBEStakingVault.sol';
import '../../src/staking/UVBEReferralRegistry.sol';
import '../../src/staking/UVBERewardDistributor.sol';

contract MockRecurringToken is ERC20 {
  constructor() ERC20('Mock UVBE', 'UVBE') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract UVBERecurringRewardTest is Test {
  address public admin = address(0xAD);
  address public genesis = address(0x6E);
  address public alice = address(0xA1);
  address public bob = address(0xB0);

  MockRecurringToken public token;
  UVBERewardReserve public reserve;
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;

  uint256 public constant SECONDS_PER_YEAR = 31_536_000;

  function setUp() public {
    vm.startPrank(admin);
    token = new MockRecurringToken();
    reserve = new UVBERewardReserve(admin, address(token));
    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesis);
    distributor = new UVBERewardDistributor(admin, address(token));

    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(reserve), address(vault), address(registry));

    // Pre-fund Reward Reserve
    token.mint(admin, 10_000_000 * 1e18);
    token.approve(address(reserve), 5_000_000 * 1e18);
    reserve.depositRewardFunds(5_000_000 * 1e18);

    token.mint(alice, 2_000_000 * 1e18);
    token.mint(bob, 2_000_000 * 1e18);
    vm.stopPrank();

    vm.prank(alice);
    token.approve(address(vault), type(uint256).max);
    vm.prank(bob);
    token.approve(address(vault), type(uint256).max);
  }

  // --- 1. Basic Accrual Durations: 1 sec, 1 day, 30 days, 365 days ---

  function test_RecurringAccrual_1Second() public {
    // 50 UVBE minimum stake
    vm.prank(alice);
    vault.stake(50 * 1e18, genesis);

    skip(1);

    // Expected: (50 * 1e18 * 1800 * 1) / (10000 * 31536000) = 285388127853 wei
    uint256 expected = (50 * 1e18 * 1800 * 1) / (10000 * SECONDS_PER_YEAR);
    assertEq(distributor.getClaimableRewards(alice), expected);
    assertGt(expected, 0);
  }

  function test_RecurringAccrual_1Day() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    skip(1 days);

    uint256 expected = (1_000 * 1e18 * 1800 * 1 days) / (10000 * SECONDS_PER_YEAR);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  function test_RecurringAccrual_30Days() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    skip(30 days);

    uint256 expected = (1_000 * 1e18 * 1800 * 30 days) / (10000 * SECONDS_PER_YEAR);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  function test_RecurringAccrual_365Days_Exact18Percent() public {
    vm.prank(alice);
    vault.stake(10_000 * 1e18, genesis);

    skip(365 days);

    // Exact 18.00% of 10,000 UVBE = 1,800 UVBE
    uint256 expected = 1_800 * 1e18;
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  // --- 2. Multiple Stakes & Timestamp Checkpoints ---

  function test_RecurringAccrual_MultipleStakes() public {
    // 1. Alice stakes 1,000 UVBE
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    // 2. Holds for 100 days
    skip(100 days);
    uint256 earnedPhase1 = (1_000 * 1e18 * 1800 * 100 days) / (10000 * SECONDS_PER_YEAR);

    // 3. Alice stakes an additional 1,000 UVBE (total stake becomes 2,000 UVBE)
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    // 4. Holds for another 100 days
    skip(100 days);
    uint256 earnedPhase2 = (2_000 * 1e18 * 1800 * 100 days) / (10000 * SECONDS_PER_YEAR);

    uint256 totalExpected = earnedPhase1 + earnedPhase2;
    assertEq(distributor.getClaimableRewards(alice), totalExpected);
  }

  // --- 3. Claims & Restaking of Recurring Rewards ---

  function test_ClaimRecurringRewards_PartialAndAll() public {
    vm.prank(alice);
    vault.stake(10_000 * 1e18, genesis);

    skip(365 days); // Earned 1,800 UVBE

    uint256 initialWallet = token.balanceOf(alice);

    // Partial claim of 800 UVBE
    vm.prank(alice);
    distributor.claimRewards(800 * 1e18);

    assertEq(token.balanceOf(alice), initialWallet + 800 * 1e18);
    assertEq(distributor.getClaimableRewards(alice), 1_000 * 1e18);

    // Claim remaining
    vm.prank(alice);
    distributor.claimAllRewards();

    assertEq(token.balanceOf(alice), initialWallet + 1_800 * 1e18);
    assertEq(distributor.getClaimableRewards(alice), 0);
  }

  function test_RestakeRecurringRewards_CompoundsWithoutCommissions() public {
    vm.prank(alice);
    vault.stake(10_000 * 1e18, genesis);

    // Warp 1 year -> 1,800 UVBE reward
    skip(365 days);

    // Alice restakes her 1,800 UVBE reward into permanent stake
    vm.prank(alice);
    distributor.restakeAllRewards();

    // Permanent stake increased to 11,800 UVBE
    assertEq(vault.getPermanentStake(alice), 11_800 * 1e18);
    assertEq(distributor.getClaimableRewards(alice), 0);

    // Warp another year -> earns 18% on 11,800 UVBE = 2,124 UVBE
    skip(365 days);

    uint256 expectedYear2 = (11_800 * 1e18 * 18) / 100;
    assertEq(distributor.getClaimableRewards(alice), expectedYear2);
  }

  // --- 4. Large Stake & Overflow Boundary Check ---

  function test_RecurringAccrual_LargeStakeNoOverflow() public {
    // 100,000 UVBE max stake
    vm.prank(alice);
    vault.stake(100_000 * 1e18, genesis);

    // Warp 10 years (3650 days)
    skip(3650 days);

    // 18% per year * 10 years = 180% = 180,000 UVBE
    uint256 expected = (100_000 * 1e18 * 1800 * 3650 days) / (10000 * SECONDS_PER_YEAR);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  // --- 5. Invariant Checks ---

  function test_SolvencyAndLiabilityConservation() public {
    vm.prank(alice);
    vault.stake(5_000 * 1e18, genesis);

    skip(180 days);

    // Materialize accrual
    distributor.accrueRecurringReward(alice);

    uint256 totalLiab = distributor.totalOutstandingLiabilities();
    uint256 reserveBal = reserve.getAvailableReserve();

    // Invariant 1: Total liabilities <= Reserve Balance
    assertLe(totalLiab, reserveBal);

    // Invariant 2: User claimable + DAO pool matches total liabilities
    (uint256 rec, uint256 dir, uint256 gen, uint256 rk, uint256 dao, uint256 tot, , ) = distributor
      .getDetailedRewardInfo(alice);
    assertEq(tot, rec + dir + gen + rk + dao);

    // Total liabilities include 1% DAO pool allocation (50 UVBE) + recurring accruals
    uint256 expectedDaoAlloc = (5_000 * 1e18 * 100) / 10_000;
    assertEq(totalLiab, tot + expectedDaoAlloc);
  }
}
