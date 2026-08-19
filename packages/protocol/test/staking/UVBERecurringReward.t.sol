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
  uint256 public constant BPS_DENOMINATOR = 10_000;
  uint256 public constant INDEX_PRECISION = 1e18;

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

    // Pre-fund Reward Reserve with 5,000,000 UVBE
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

  // --- Helper to calculate expected dynamic recurring reward matching contract math ---
  function _calculateExpectedRecurring(
    uint256 userStake,
    uint256 bps,
    uint256 timeDelta
  ) internal pure returns (uint256) {
    if (userStake == 0 || bps == 0 || timeDelta == 0) return 0;
    uint256 deltaIndex = (timeDelta * bps * INDEX_PRECISION) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
    return (userStake * deltaIndex) / INDEX_PRECISION;
  }

  // --- 1. Dynamic Recurring Accrual & 5% Admin Treasury Fee ---

  function test_RecurringAccrual_With5PercentAdminFee_1Second() public {
    uint256 adminBalBefore = token.balanceOf(admin);
    uint256 grossStake = 50 * 1e18;

    vm.prank(alice);
    vault.stake(grossStake, genesis);

    // Verify 5% admin fee routing
    uint256 expectedFee = (grossStake * 500) / BPS_DENOMINATOR; // 2.5 UVBE
    uint256 expectedNet = grossStake - expectedFee; // 47.5 UVBE
    assertEq(token.balanceOf(admin), adminBalBefore + expectedFee);
    assertEq(vault.getPermanentStake(alice), expectedNet);

    uint256 rate = distributor.getCurrentAnnualBps();
    assertGt(rate, 0);

    skip(1);

    uint256 expected = _calculateExpectedRecurring(expectedNet, rate, 1);
    assertEq(distributor.getClaimableRewards(alice), expected);
    assertGt(expected, 0);
  }

  function test_RecurringAccrual_1Day() public {
    uint256 grossStake = 1_000 * 1e18; // Net 950 UVBE
    vm.prank(alice);
    vault.stake(grossStake, genesis);

    uint256 netStake = vault.getPermanentStake(alice);
    uint256 rate = distributor.getCurrentAnnualBps();

    skip(1 days);

    uint256 expected = _calculateExpectedRecurring(netStake, rate, 1 days);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  function test_RecurringAccrual_30Days() public {
    uint256 grossStake = 1_000 * 1e18; // Net 950 UVBE
    vm.prank(alice);
    vault.stake(grossStake, genesis);

    uint256 netStake = vault.getPermanentStake(alice);
    uint256 rate = distributor.getCurrentAnnualBps();

    skip(30 days);

    uint256 expected = _calculateExpectedRecurring(netStake, rate, 30 days);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  function test_RecurringAccrual_365Days() public {
    uint256 grossStake = 10_000 * 1e18; // Net 9,500 UVBE
    vm.prank(alice);
    vault.stake(grossStake, genesis);

    uint256 netStake = vault.getPermanentStake(alice);
    uint256 rate = distributor.getCurrentAnnualBps();

    skip(365 days);

    uint256 expected = _calculateExpectedRecurring(netStake, rate, 365 days);
    assertEq(distributor.getClaimableRewards(alice), expected);

    (uint256 rec, , , , , uint256 totalClaimable, , ) = distributor.getDetailedRewardInfo(alice);
    assertEq(rec, expected);
    assertEq(totalClaimable, expected);
  }

  // --- 2. Multiple Stakes & Dynamic Rate Checkpoints ---

  function test_RecurringAccrual_MultipleStakes() public {
    // 1. Alice stakes 1,000 UVBE gross (950 net)
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);
    uint256 netStake1 = vault.getPermanentStake(alice);
    uint256 rate1 = distributor.getCurrentAnnualBps();

    // 2. Holds for 100 days
    skip(100 days);
    uint256 earnedPhase1 = _calculateExpectedRecurring(netStake1, rate1, 100 days);

    // 3. Alice stakes an additional 1,000 UVBE gross (total net becomes 1,900 UVBE)
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);
    uint256 netStake2 = vault.getPermanentStake(alice);
    assertEq(netStake2, 1_900 * 1e18);

    uint256 rate2 = distributor.getCurrentAnnualBps();

    // 4. Holds for another 100 days
    skip(100 days);
    uint256 earnedPhase2 = _calculateExpectedRecurring(netStake2, rate2, 100 days);

    uint256 totalExpected = earnedPhase1 + earnedPhase2;
    assertEq(distributor.getClaimableRewards(alice), totalExpected);
  }

  // --- 3. Claims (Partial and Full) & Reserve/Liability Synchronization ---

  function test_ClaimRecurringRewards_PartialAndAll() public {
    vm.prank(alice);
    vault.stake(10_000 * 1e18, genesis); // Net 9,500 UVBE

    skip(365 days);

    // Synchronize recurring accrual into recorded liabilities
    distributor.accrueRecurringReward(alice);

    uint256 totalEarned = distributor.getClaimableRewards(alice);
    assertGt(totalEarned, 0);

    uint256 initialWallet = token.balanceOf(alice);
    uint256 liabBefore = distributor.totalOutstandingLiabilities();
    uint256 resBefore = reserve.getAvailableReserve();

    // Partial claim of 800 UVBE
    uint256 partialClaim = 800 * 1e18;
    vm.prank(alice);
    distributor.claimRewards(partialClaim);

    assertEq(token.balanceOf(alice), initialWallet + partialClaim);
    assertEq(distributor.getClaimableRewards(alice), totalEarned - partialClaim);
    assertEq(distributor.totalOutstandingLiabilities(), liabBefore - partialClaim);
    assertEq(reserve.getAvailableReserve(), resBefore - partialClaim);

    // Claim remaining rewards
    vm.prank(alice);
    distributor.claimAllRewards();

    assertEq(token.balanceOf(alice), initialWallet + totalEarned);
    assertEq(distributor.getClaimableRewards(alice), 0);
  }

  // --- 4. Restaking Recurring Rewards (No Commissions & Expanded Principal Accrual) ---

  function test_RestakeRecurringRewards_CompoundsWithoutCommissions() public {
    vm.prank(alice);
    vault.stake(10_000 * 1e18, genesis); // Net 9,500 UVBE

    // Warp 1 year
    skip(365 days);
    uint256 earnedYear1 = distributor.getPendingRecurringReward(alice);
    assertGt(earnedYear1, 0);

    uint256 liabBefore = distributor.totalOutstandingLiabilities();

    // Alice restakes her earned reward into permanent principal
    vm.prank(alice);
    distributor.restakeAllRewards();

    // Permanent stake increased to 9,500 UVBE + earnedYear1
    uint256 newStake = 9_500 * 1e18 + earnedYear1;
    assertEq(vault.getPermanentStake(alice), newStake);
    assertEq(distributor.getClaimableRewards(alice), 0);

    // Restake deducts liability and does not generate new referral/DAO liabilities
    assertLe(distributor.totalOutstandingLiabilities(), liabBefore);

    // Warp another year -> earns dynamic yield on expanded principal
    uint256 rateYear2 = distributor.getCurrentAnnualBps();
    skip(365 days);

    uint256 expectedYear2 = _calculateExpectedRecurring(newStake, rateYear2, 365 days);
    assertEq(distributor.getClaimableRewards(alice), expectedYear2);
  }

  // --- 5. Large Stake & Overflow Boundary Check ---

  function test_RecurringAccrual_LargeStakeNoOverflow() public {
    // 100,000 UVBE max gross stake (95,000 net principal)
    vm.prank(alice);
    vault.stake(100_000 * 1e18, genesis);

    uint256 netStake = vault.getPermanentStake(alice);
    uint256 rate = distributor.getCurrentAnnualBps();

    // Warp 10 years (3650 days)
    skip(3650 days);

    uint256 expected = _calculateExpectedRecurring(netStake, rate, 3650 days);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  // --- 6. Interaction with Referral MLM Commissions & Isolated DAO Accounting ---

  function test_ReferralCommissionsAndDynamicRecurringCoexist() public {
    // Alice stakes 1,000 UVBE gross (950 net principal)
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    // Bob stakes 2,000 UVBE gross (1,900 net principal) under Alice
    vm.prank(bob);
    vault.stake(2_000 * 1e18, alice);

    // Alice has 5% Direct Referral on Bob's 1,900 net principal = 95 UVBE
    uint256 expectedDirect = (1_900 * 1e18 * 500) / BPS_DENOMINATOR;

    uint256 rateAlice = distributor.getCurrentAnnualBps();

    // Fast forward 180 days
    skip(180 days);

    uint256 expectedRecurring = _calculateExpectedRecurring(950 * 1e18, rateAlice, 180 days);

    (uint256 rec, uint256 dir, uint256 gen, uint256 rk, uint256 dao, uint256 tot, , ) = distributor
      .getDetailedRewardInfo(alice);

    assertEq(rec, expectedRecurring, 'Recurring reward matches dynamic accrual');
    assertEq(dir, expectedDirect, 'Direct reward must match 5%');
    assertEq(gen, 0);
    assertEq(rk, 0);
    assertEq(dao, 0);
    assertEq(
      tot,
      expectedRecurring + expectedDirect,
      'Total claimable is sum of recurring and direct'
    );
    assertEq(distributor.getClaimableRewards(alice), tot);
  }

  // --- 7. Zero-Capacity Condition Drops Rate to 0% ---

  function test_ZeroCapacity_ProducesZeroRecurringYield() public {
    // Deploy fresh depleted reserve where availableReserve <= liabilities
    vm.startPrank(admin);
    UVBERewardReserve emptyRes = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault emptyVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry emptyReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor emptyDist = new UVBERewardDistributor(admin, address(token));

    emptyRes.setDistributor(address(emptyDist));
    emptyVault.setModules(address(emptyReg), address(emptyDist));
    emptyReg.setModules(address(emptyVault), address(emptyDist));
    emptyDist.setModules(address(emptyRes), address(emptyVault), address(emptyReg));
    vm.stopPrank();

    // Alice stakes into empty-reserve vault
    vm.prank(alice);
    token.approve(address(emptyVault), type(uint256).max);
    vm.prank(alice);
    emptyVault.stake(1_000 * 1e18, genesis);

    assertEq(emptyDist.getCurrentAnnualBps(), 0);

    skip(180 days);

    // With 0% APY, no recurring rewards accrue
    assertEq(emptyDist.getClaimableRewards(alice), 0);
  }

  // --- 8. Solvency and Liability Conservation Invariant ---

  function test_SolvencyAndLiabilityConservation() public {
    vm.prank(alice);
    vault.stake(5_000 * 1e18, genesis); // Net 4,750 UVBE

    skip(180 days);

    // Materialize user accrual
    distributor.accrueRecurringReward(alice);

    uint256 totalLiab = distributor.totalOutstandingLiabilities();
    uint256 reserveBal = reserve.getAvailableReserve();

    // Invariant 1: Total liabilities <= Reserve Balance
    assertLe(totalLiab, reserveBal);

    // Invariant 2: Total liabilities strictly equal Alice claimable + 1% DAO pool allocation
    (uint256 rec, uint256 dir, uint256 gen, uint256 rk, uint256 dao, uint256 tot, , ) = distributor
      .getDetailedRewardInfo(alice);
    assertEq(tot, rec + dir + gen + rk + dao);

    uint256 netStake = (5_000 * 1e18 * 9500) / BPS_DENOMINATOR; // 4,750 UVBE
    uint256 expectedDaoAlloc = (netStake * 100) / BPS_DENOMINATOR; // 47.5 UVBE
    assertEq(totalLiab, tot + expectedDaoAlloc);
  }
}
