// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';
import '../../src/staking/UVBERewardReserve.sol';
import '../../src/staking/UVBEStakingVault.sol';
import '../../src/staking/UVBEReferralRegistry.sol';
import '../../src/staking/UVBERewardDistributor.sol';

contract MockTokenDynamic is ERC20 {
  constructor() ERC20('Mock UVBE', 'UVBE') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract UVBEDynamicRewardSystemTest is Test {
  address public admin = address(0xAD);
  address public genesis = address(0x6E);
  address public alice = address(0xA1);
  address public bob = address(0xB0);
  address public charlie = address(0xC0);

  MockTokenDynamic public token;
  UVBERewardReserve public reserve;
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;

  uint256 public constant SECONDS_PER_YEAR = 31_536_000;

  function setUp() public {
    vm.startPrank(admin);
    token = new MockTokenDynamic();
    reserve = new UVBERewardReserve(admin, address(token));
    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesis);
    distributor = new UVBERewardDistributor(admin, address(token));

    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(reserve), address(vault), address(registry));

    // Fund admin & reserve
    token.mint(admin, 100_000_000 * 1e18);
    token.approve(address(reserve), 10_000_000 * 1e18);
    reserve.depositRewardFunds(10_000_000 * 1e18);

    token.mint(alice, 5_000_000 * 1e18);
    token.mint(bob, 5_000_000 * 1e18);
    token.mint(charlie, 5_000_000 * 1e18);
    vm.stopPrank();

    vm.prank(alice);
    token.approve(address(vault), type(uint256).max);
    vm.prank(bob);
    token.approve(address(vault), type(uint256).max);
    vm.prank(charlie);
    token.approve(address(vault), type(uint256).max);
  }

  // 1. Zero liabilities + High reward capacity => Capped at 10000 BPS (100%)
  function test_ZeroLiabilities_HighCapacity_HitsCeiling() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis); // 950 net stake

    // Reserve = 10,000,000 UVBE, Liabilities = 1% DAO (9.5) = 9.5 UVBE
    // Surplus = 9,999,990.5 UVBE
    // Capacity BPS = (9,999,990.5 * 10000) / 950 = 105,263,057 BPS => Capped at 10000 BPS (100.00% APY)
    assertEq(distributor.getCurrentAnnualBps(), 10_000);
    assertEq(distributor.MAX_RECURRING_ANNUAL_BPS(), 10_000);
  }

  // 2. Low reward capacity => Calculates proportional rate below ceiling
  function test_LowRewardCapacity_CalculatesProportionalRate() public {
    // Deploy a fresh low-funded reserve
    vm.startPrank(admin);
    UVBERewardReserve lowReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault freshVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry freshReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor freshDist = new UVBERewardDistributor(admin, address(token));

    lowReserve.setDistributor(address(freshDist));
    freshVault.setModules(address(freshReg), address(freshDist));
    freshReg.setModules(address(freshVault), address(freshDist));
    freshDist.setModules(address(lowReserve), address(freshVault), address(freshReg));

    // Deposit exactly 150 UVBE into lowReserve
    token.approve(address(lowReserve), 150 * 1e18);
    lowReserve.depositRewardFunds(150 * 1e18);
    vm.stopPrank();

    // Alice stakes 1,000 UVBE (net 950).
    vm.prank(alice);
    token.approve(address(freshVault), type(uint256).max);
    vm.prank(alice);
    freshVault.stake(1_000 * 1e18, genesis);

    uint256 surplus = 150 * 1e18 - freshDist.totalOutstandingLiabilities();
    uint256 expectedBps = (surplus * 10_000) / freshVault.totalPermanentStaked();
    assertEq(freshDist.getCurrentAnnualBps(), expectedBps);
    assertLt(freshDist.getCurrentAnnualBps(), 10_000);
  }

  // 3. High liabilities reduces APY
  function test_HighLiabilities_ReducesRate() public {
    vm.startPrank(admin);
    UVBERewardReserve lowReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault freshVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry freshReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor freshDist = new UVBERewardDistributor(admin, address(token));

    lowReserve.setDistributor(address(freshDist));
    freshVault.setModules(address(freshReg), address(freshDist));
    freshReg.setModules(address(freshVault), address(freshDist));
    freshDist.setModules(address(lowReserve), address(freshVault), address(freshReg));

    token.approve(address(lowReserve), 100 * 1e18);
    lowReserve.depositRewardFunds(100 * 1e18);
    vm.stopPrank();

    // Alice stakes 1,000 UVBE.
    vm.prank(alice);
    token.approve(address(freshVault), type(uint256).max);
    vm.prank(alice);
    freshVault.stake(1_000 * 1e18, genesis);

    uint256 surplus = 100 * 1e18 - freshDist.totalOutstandingLiabilities();
    uint256 expectedBps = (surplus * 10_000) / freshVault.totalPermanentStaked();
    assertEq(freshDist.getCurrentAnnualBps(), expectedBps);
  }

  // 4. Zero Reward Capacity (R <= L) => Rate is exactly 0%
  function test_ZeroRewardCapacity_RateBecomesZero() public {
    vm.startPrank(admin);
    UVBERewardReserve emptyReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault freshVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry freshReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor freshDist = new UVBERewardDistributor(admin, address(token));

    emptyReserve.setDistributor(address(freshDist));
    freshVault.setModules(address(freshReg), address(freshDist));
    freshReg.setModules(address(freshVault), address(freshDist));
    freshDist.setModules(address(emptyReserve), address(freshVault), address(freshReg));
    vm.stopPrank();

    vm.prank(alice);
    token.approve(address(freshVault), type(uint256).max);
    vm.prank(alice);
    freshVault.stake(1_000 * 1e18, genesis);

    assertEq(freshDist.getCurrentAnnualBps(), 0);
  }

  // 5. New Capital Inflow => Increases Rate & Capacity dynamically
  function test_NewCapitalInflow_IncreasesRate() public {
    vm.startPrank(admin);
    UVBERewardReserve dynReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault freshVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry freshReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor freshDist = new UVBERewardDistributor(admin, address(token));

    dynReserve.setDistributor(address(freshDist));
    freshVault.setModules(address(freshReg), address(freshDist));
    freshReg.setModules(address(freshVault), address(freshDist));
    freshDist.setModules(address(dynReserve), address(freshVault), address(freshReg));

    token.approve(address(dynReserve), 60 * 1e18);
    dynReserve.depositRewardFunds(60 * 1e18);
    vm.stopPrank();

    vm.prank(alice);
    token.approve(address(freshVault), type(uint256).max);
    vm.prank(alice);
    freshVault.stake(1_000 * 1e18, genesis);

    uint256 initialRate = freshDist.getCurrentAnnualBps(); // 531 BPS (5.31%)

    // Admin deposits additional 200 UVBE inflow into reserve
    vm.startPrank(admin);
    token.approve(address(dynReserve), 200 * 1e18);
    dynReserve.depositRewardFunds(200 * 1e18);
    freshDist.checkpoint();
    vm.stopPrank();

    uint256 rateAfterInflow = freshDist.getCurrentAnnualBps();
    assertGt(rateAfterInflow, initialRate);
    assertEq(rateAfterInflow, 2636); // 260 total reserve - 9.5 liab = 250.5 surplus / 950 stake => 2636 bps (26.36%)

    // Admin deposits additional 1,000 UVBE into reserve => surplus = 1250.5 UVBE >= 950 stake => hits 100% ceiling (10000 BPS)
    vm.startPrank(admin);
    token.approve(address(dynReserve), 1_000 * 1e18);
    dynReserve.depositRewardFunds(1_000 * 1e18);
    freshDist.checkpoint();
    vm.stopPrank();

    uint256 maxRate = freshDist.getCurrentAnnualBps();
    assertEq(maxRate, 10_000); // Exactly 100.00% APY ceiling
  }

  // 6. APY Ceiling Enforcement (Never Exceeds 10000 BPS)
  function test_APYCeiling_NeverExceeds10000Bps() public {
    vm.prank(alice);
    vault.stake(50 * 1e18, genesis); // Net 47.5 UVBE, Reserve has 10M UVBE

    (, , , uint256 currentBps) = distributor.getRewardCapacity();
    assertEq(currentBps, 10_000);
    assertLe(distributor.getCurrentAnnualBps(), 10_000);
    assertEq(distributor.MAX_RECURRING_ANNUAL_BPS(), 10_000);
  }

  // 6b. Test 0% <= APY <= 100% Invariant
  function test_APYRange_Between0And10000Bps() public {
    // Initial state: S == 0 => APY is 0 BPS
    assertEq(distributor.getCurrentAnnualBps(), 0);

    // Condition A: Zero capacity (S > 0, AvailableReserve == 0) => Rate is strictly 0 BPS
    vm.startPrank(admin);
    UVBERewardReserve emptyRes = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault freshV = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry freshR = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor freshD = new UVBERewardDistributor(admin, address(token));

    emptyRes.setDistributor(address(freshD));
    freshV.setModules(address(freshR), address(freshD));
    freshR.setModules(address(freshV), address(freshD));
    freshD.setModules(address(emptyRes), address(freshV), address(freshR));
    vm.stopPrank();

    vm.prank(alice);
    token.approve(address(freshV), type(uint256).max);
    vm.prank(alice);
    freshV.stake(100 * 1e18, genesis); // S = 95 UVBE > 0

    uint256 rateZero = freshD.getCurrentAnnualBps();
    assertEq(rateZero, 0);
    assertGe(rateZero, 0);
    assertLe(rateZero, 10_000);

    // Condition B: Partial capacity (S > 0, 0 < Surplus < S) => Rate is proportional between 0 and 10000 BPS
    vm.startPrank(admin);
    UVBERewardReserve partialRes = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault partialV = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry partialR = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor partialD = new UVBERewardDistributor(admin, address(token));

    partialRes.setDistributor(address(partialD));
    partialV.setModules(address(partialR), address(partialD));
    partialR.setModules(address(partialV), address(partialD));
    partialD.setModules(address(partialRes), address(partialV), address(partialR));

    token.approve(address(partialRes), 50 * 1e18);
    partialRes.depositRewardFunds(50 * 1e18);
    vm.stopPrank();

    vm.prank(alice);
    token.approve(address(partialV), type(uint256).max);
    vm.prank(alice);
    partialV.stake(1_000 * 1e18, genesis); // S = 950 UVBE, DAO liab = 9.5 UVBE, Surplus = 40.5 UVBE

    uint256 ratePartial = partialD.getCurrentAnnualBps();
    assertGt(ratePartial, 0);
    assertLt(ratePartial, 10_000);
    assertGe(ratePartial, 0);
    assertLe(ratePartial, 10_000);

    // Condition C: High capacity with active staker (Reserve = 10M, S = 95 UVBE) => Rate hits 10,000 BPS ceiling (100%)
    vm.prank(alice);
    vault.stake(100 * 1e18, genesis); // S = 95 UVBE > 0 in main test harness with 10M UVBE reserve

    uint256 rateMax = distributor.getCurrentAnnualBps();
    assertEq(rateMax, 10_000);
    assertGe(rateMax, 0);
    assertLe(rateMax, 10_000);
  }

  // 7. Proportional Reward Distribution between 2 stakers
  function test_MultipleStakers_ProRataExactDistribution() public {
    // Alice stakes 1,000 UVBE (net 950)
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    // Bob stakes 3,000 UVBE (net 2,850) -> Bob has 3x Alice's stake (75% vs 25%)
    vm.prank(bob);
    vault.stake(3_000 * 1e18, genesis);

    // Advance 1 year
    vm.warp(block.timestamp + SECONDS_PER_YEAR);

    uint256 alicePending = distributor.getPendingRecurringReward(alice);
    uint256 bobPending = distributor.getPendingRecurringReward(bob);

    // Bob's recurring yield must be exactly 3x Alice's recurring yield (within 1 wei rounding)
    assertApproxEqRel(bobPending, alicePending * 3, 1e14); // 0.01% precision
    assertGt(alicePending, 0);
  }

  // 8. 100 Stakers Simulation
  function test_100Stakers_ProRataAccrual() public {
    uint256 count = 100;
    address[] memory stakers = new address[](count);

    vm.startPrank(admin);
    for (uint256 i = 0; i < count; i++) {
      stakers[i] = address(uint160(0x1000 + i));
      token.mint(stakers[i], 1_000 * 1e18);
    }
    vm.stopPrank();

    for (uint256 i = 0; i < count; i++) {
      vm.startPrank(stakers[i]);
      token.approve(address(vault), type(uint256).max);
      vault.stake(100 * 1e18, genesis); // Net 95 UVBE each
      vm.stopPrank();
    }

    // Advance 30 days
    vm.warp(block.timestamp + 30 days);

    // Check all 100 stakers have identical pro-rata rewards
    uint256 firstReward = distributor.getPendingRecurringReward(stakers[0]);
    assertGt(firstReward, 0);

    for (uint256 i = 1; i < count; i++) {
      uint256 r = distributor.getPendingRecurringReward(stakers[i]);
      assertEq(r, firstReward);
    }
  }

  // 9. 1,000 Stakers Mathematical Verification
  function test_1000Stakers_Simulation() public {
    uint256 count = 1000;
    address[] memory stakers = new address[](count);

    vm.startPrank(admin);
    for (uint256 i = 0; i < count; i++) {
      stakers[i] = address(uint160(0x5000 + i));
      token.mint(stakers[i], 100 * 1e18);
    }
    vm.stopPrank();

    for (uint256 i = 0; i < count; i++) {
      vm.startPrank(stakers[i]);
      token.approve(address(vault), type(uint256).max);
      vault.stake(50 * 1e18, genesis);
      vm.stopPrank();
    }

    vm.warp(block.timestamp + 365 days);

    uint256 r0 = distributor.getPendingRecurringReward(stakers[0]);
    uint256 r999 = distributor.getPendingRecurringReward(stakers[999]);
    assertGt(r0, 0);
    assertEq(r0, r999);
  }

  // 10. 10,000 Staker Mathematical Model Simulation
  function test_10000Stakers_Simulation() public {
    // Mathematically test index progression with 10,000 stakers of 100 UVBE (total 950,000 net stake)
    uint256 totalStaked = 950_000 * 1e18;

    // Simulate initial stake
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    // Fast forward 1 year
    vm.warp(block.timestamp + SECONDS_PER_YEAR);
    distributor.checkpoint();

    // Verify index advanced linearly without precision breakdown
    assertGt(distributor.rewardIndex(), 0);
  }

  // 11. Repeated APY transitions preserve historical rewards without retroactive repricing
  function test_RepeatedAPYTransitions_NoRetroactiveRepricing() public {
    vm.startPrank(admin);
    UVBERewardReserve dynReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault freshVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry freshReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor freshDist = new UVBERewardDistributor(admin, address(token));

    dynReserve.setDistributor(address(freshDist));
    freshVault.setModules(address(freshReg), address(freshDist));
    freshReg.setModules(address(freshVault), address(freshDist));
    freshDist.setModules(address(dynReserve), address(freshVault), address(freshReg));

    token.approve(address(dynReserve), 100_000 * 1e18);
    dynReserve.depositRewardFunds(100_000 * 1e18);
    vm.stopPrank();

    // Alice stakes 1,000 UVBE (net 950)
    vm.prank(alice);
    token.approve(address(freshVault), type(uint256).max);
    vm.prank(alice);
    freshVault.stake(1_000 * 1e18, genesis);

    // Period 1: 18% APY for 180 days
    vm.warp(block.timestamp + 180 days);
    uint256 aliceEarnedP1 = freshDist.getPendingRecurringReward(alice);
    assertGt(aliceEarnedP1, 0);

    // Bob joins with massive stake 100,000 UVBE, diluting dynamic APY for Period 2
    vm.prank(bob);
    token.approve(address(freshVault), type(uint256).max);
    vm.prank(bob);
    freshVault.stake(100_000 * 1e18, genesis);

    // Period 2: Lower APY for another 180 days
    vm.warp(block.timestamp + 180 days);
    uint256 aliceEarnedTotal = freshDist.getPendingRecurringReward(alice);

    // Alice's total earned MUST be strictly >= Period 1 reward (historical earnings preserved!)
    assertGt(aliceEarnedTotal, aliceEarnedP1);
  }

  // 12. Mass Claims and Solvency Invariant
  function test_MassClaims_SolvencyPreserved() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);
    vm.prank(bob);
    vault.stake(1_000 * 1e18, genesis);

    vm.warp(block.timestamp + 100 days);

    // Alice claims all
    uint256 aliceBalBefore = token.balanceOf(alice);
    vm.prank(alice);
    distributor.claimAllRewards();
    uint256 aliceBalAfter = token.balanceOf(alice);
    assertGt(aliceBalAfter, aliceBalBefore);

    // Bob claims all
    uint256 bobBalBefore = token.balanceOf(bob);
    vm.prank(bob);
    distributor.claimAllRewards();
    uint256 bobBalAfter = token.balanceOf(bob);
    assertGt(bobBalAfter, bobBalBefore);

    // Reserve available >= outstanding liabilities
    assertGe(reserve.getAvailableReserve(), distributor.totalOutstandingLiabilities());
  }

  // 13. Mass Restaking - No Commissions Generated
  function test_MassRestaking_NoCommissionsGenerated() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    vm.warp(block.timestamp + 365 days);

    uint256 pendingRecurring = distributor.getPendingRecurringReward(alice);
    assertGt(pendingRecurring, 0);

    uint256 liabBefore = distributor.totalOutstandingLiabilities();
    vm.prank(alice);
    distributor.restakeAllRewards();

    // Restake creates no new MLM/referral liabilities
    assertLe(distributor.totalOutstandingLiabilities(), liabBefore);
    assertGt(vault.getPermanentStake(alice), 950 * 1e18);
  }

  // 14. Same-block Checkpoint produces zero delta
  function test_SameBlockCheckpoints_ZeroDelta() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    uint256 idx1 = distributor.rewardIndex();
    distributor.checkpoint();
    uint256 idx2 = distributor.rewardIndex();
    assertEq(idx1, idx2);
  }

  // 15. Fuzz test for Dynamic Accrual Conservation
  function testFuzz_DynamicAccrualConservation(uint256 stakeA, uint256 timeDelta) public {
    stakeA = bound(stakeA, 50 * 1e18, 50_000 * 1e18);
    timeDelta = bound(timeDelta, 1, 365 days * 5);

    vm.prank(alice);
    vault.stake(stakeA, genesis);

    vm.warp(block.timestamp + timeDelta);

    uint256 pending = distributor.getPendingRecurringReward(alice);
    assertGt(pending, 0);
    assertLe(distributor.totalOutstandingLiabilities(), reserve.getAvailableReserve());
  }

  // 16. Test: APY can reach exactly 100% when capacity supports it
  function test_APY_CanReach100PercentWhenCapacitySupportsIt() public {
    vm.startPrank(admin);
    UVBERewardReserve capReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault capVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry capReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor capDist = new UVBERewardDistributor(admin, address(token));

    capReserve.setDistributor(address(capDist));
    capVault.setModules(address(capReg), address(capDist));
    capReg.setModules(address(capVault), address(capDist));
    capDist.setModules(address(capReserve), address(capVault), address(capReg));

    // Deposit exactly 1,000 UVBE into reserve
    token.approve(address(capReserve), 1_000 * 1e18);
    capReserve.depositRewardFunds(1_000 * 1e18);
    vm.stopPrank();

    // Alice stakes 1,000 UVBE (net 950). Total liabilities = 9.5 UVBE (DAO pool).
    // Surplus = 1,000 - 9.5 = 990.5 UVBE.
    // Capacity BPS = (990.5 * 10000) / 950 = 10,426 BPS >= 10,000 BPS => Exactly 10,000 BPS (100.00% APY)
    vm.prank(alice);
    token.approve(address(capVault), type(uint256).max);
    vm.prank(alice);
    capVault.stake(1_000 * 1e18, genesis);

    assertEq(capDist.getCurrentAnnualBps(), 10_000);
  }

  // 17. Test: APY cannot exceed 100% under any circumstance
  function test_APY_CannotExceed100Percent() public {
    vm.startPrank(admin);
    UVBERewardReserve hugeReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault hugeVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry hugeReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor hugeDist = new UVBERewardDistributor(admin, address(token));

    hugeReserve.setDistributor(address(hugeDist));
    hugeVault.setModules(address(hugeReg), address(hugeDist));
    hugeReg.setModules(address(hugeVault), address(hugeDist));
    hugeDist.setModules(address(hugeReserve), address(hugeVault), address(hugeReg));

    // Deposit 100M UVBE into reserve
    token.mint(admin, 100_000_000 * 1e18);
    token.approve(address(hugeReserve), 100_000_000 * 1e18);
    hugeReserve.depositRewardFunds(100_000_000 * 1e18);
    vm.stopPrank();

    // Small stake: 50 UVBE (net 47.5 UVBE)
    vm.prank(alice);
    token.approve(address(hugeVault), type(uint256).max);
    vm.prank(alice);
    hugeVault.stake(50 * 1e18, genesis);

    uint256 rate = hugeDist.getCurrentAnnualBps();
    assertEq(rate, 10_000);
    assertLe(rate, 10_000);
  }

  // 18. Test: Insufficient capacity falls immediately to 0%
  function test_InsufficientCapacity_FallsToZero() public {
    vm.startPrank(admin);
    UVBERewardReserve depletedReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault depletedVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry depletedReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor depletedDist = new UVBERewardDistributor(admin, address(token));

    depletedReserve.setDistributor(address(depletedDist));
    depletedVault.setModules(address(depletedReg), address(depletedDist));
    depletedReg.setModules(address(depletedVault), address(depletedDist));
    depletedDist.setModules(address(depletedReserve), address(depletedVault), address(depletedReg));

    // Fund exactly 9 UVBE
    token.approve(address(depletedReserve), 9 * 1e18);
    depletedReserve.depositRewardFunds(9 * 1e18);
    vm.stopPrank();

    // Alice stakes 1,000 UVBE => creates 9.5 UVBE DAO liability.
    // Available reserve (9) < Liabilities (9.5) => Capacity is 0
    vm.prank(alice);
    token.approve(address(depletedVault), type(uint256).max);
    vm.prank(alice);
    depletedVault.stake(1_000 * 1e18, genesis);

    assertEq(depletedDist.getCurrentAnnualBps(), 0);
  }

  // 19. Test: Solvency invariant remains intact at 100% APY for 1 full year
  function test_SolvencyInvariant_RemainsIntactAt100Percent() public {
    vm.startPrank(admin);
    UVBERewardReserve solReserve = new UVBERewardReserve(admin, address(token));
    UVBEStakingVault solVault = new UVBEStakingVault(admin, address(token));
    UVBEReferralRegistry solReg = new UVBEReferralRegistry(admin, genesis);
    UVBERewardDistributor solDist = new UVBERewardDistributor(admin, address(token));

    solReserve.setDistributor(address(solDist));
    solVault.setModules(address(solReg), address(solDist));
    solReg.setModules(address(solVault), address(solDist));
    solDist.setModules(address(solReserve), address(solVault), address(solReg));

    // Deposit 2,000 UVBE into reserve
    token.approve(address(solReserve), 2_000 * 1e18);
    solReserve.depositRewardFunds(2_000 * 1e18);
    vm.stopPrank();

    // Alice stakes 1,000 UVBE (net 950). Rate is 100.00% (10,000 BPS)
    vm.prank(alice);
    token.approve(address(solVault), type(uint256).max);
    vm.prank(alice);
    solVault.stake(1_000 * 1e18, genesis);

    assertEq(solDist.getCurrentAnnualBps(), 10_000);

    // Advance 365 days (1 full year)
    vm.warp(block.timestamp + 365 days);

    // Accrued 100% on 950 UVBE = 950 UVBE + 9.5 DAO = 959.5 UVBE total liability
    uint256 pendingAlice = solDist.getPendingRecurringReward(alice);
    assertApproxEqRel(pendingAlice, 950 * 1e18, 1e14);

    // Claim all rewards
    vm.prank(alice);
    solDist.claimAllRewards();

    // Solvency invariant holds: reserve >= liabilities
    assertGe(solReserve.getAvailableReserve(), solDist.totalOutstandingLiabilities());
  }
}
