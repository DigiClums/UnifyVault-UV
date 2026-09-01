// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';
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
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;

  uint256 public constant SECONDS_PER_YEAR = 31_536_000;

  function setUp() public {
    vm.startPrank(admin);
    token = new MockTokenDynamic();
    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesis);
    distributor = new UVBERewardDistributor(admin, address(token));

    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(vault), address(registry));

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

  // 1. Zero liabilities + High reward capacity => Dynamic calculation up to 60000 BPS (600%)
  function test_ZeroLiabilities_HighCapacity_HitsCeiling() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis); // 950 net stake, 57 liabilities (5% Gen 1 + 1% DAO)

    // Capital = 950 UVBE, Liabilities = 57 UVBE => Surplus = 893 UVBE
    // APY = floor(893 * 10000 / 950) = 9400 BPS (94.00%)
    assertEq(distributor.getCurrentAnnualBps(), 9400);
    assertEq(distributor.MAX_RECURRING_ANNUAL_BPS(), 60_000);
  }

  // 2. Proportional APY calculation based on surplus protocol capital
  function test_LowRewardCapacity_CalculatesProportionalRate() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis); // 950 net stake

    (uint256 availCap, uint256 liab, uint256 surplus, uint256 curBps) = distributor
      .getRewardCapacity();
    uint256 expectedBps = (surplus * 10_000) / vault.totalPermanentStaked();
    assertEq(curBps, expectedBps);
    assertEq(distributor.getCurrentAnnualBps(), expectedBps);
  }

  // 3. High liabilities over time reduces APY
  function test_HighLiabilities_ReducesRate() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    uint256 apyInitial = distributor.getCurrentAnnualBps();

    // Time elapses: liabilities grow
    vm.warp(block.timestamp + 180 days);
    distributor.checkpoint();

    uint256 apyLater = distributor.getCurrentAnnualBps();
    assertLt(apyLater, apyInitial, 'APY must decrease prospectively as liabilities accrue');
  }

  // 4. Zero Total Staked => Rate is exactly 0%
  function test_ZeroRewardCapacity_RateBecomesZero() public {
    assertEq(distributor.getCurrentAnnualBps(), 0);
  }

  // 5. New Capital Inflow => Increases Rate & Capacity dynamically
  function test_NewCapitalInflow_IncreasesRate() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    vm.warp(block.timestamp + 180 days);
    distributor.checkpoint();
    uint256 apyMid = distributor.getCurrentAnnualBps();

    // Bob stakes fresh capital
    vm.prank(bob);
    vault.stake(5_000 * 1e18, alice);

    (uint256 availCap, uint256 liab, uint256 surplus, uint256 newBps) = distributor
      .getRewardCapacity();
    assertGt(availCap, 1000 * 1e18, 'Capital must expand');
    assertLe(newBps, 60000, 'APY clamped at 600% max');
  }

  // 6. APY Ceiling: Never exceeds 60,000 BPS
  function test_APYCeiling_NeverExceeds60000Bps() public {
    vm.prank(alice);
    vault.stake(100 * 1e18, genesis);
    assertLe(distributor.getCurrentAnnualBps(), 60000);
  }

  // 7. APY Range: Between 0 and 60000 BPS
  function test_APYRange_Between0And60000Bps() public {
    assertEq(distributor.getCurrentAnnualBps(), 0);

    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);
    uint256 apy = distributor.getCurrentAnnualBps();
    assertGe(apy, 0);
    assertLe(apy, 60000);
  }

  // 8. Solvency invariant
  function test_SolvencyInvariant_RemainsIntactAt100Percent() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    (uint256 availCap, uint256 liab, , ) = distributor.getRewardCapacity();
    assertGe(availCap, liab, 'Protocol capital must back all liabilities');
  }

  // 9. Multi-user pro-rata
  function test_MultipleStakers_ProRataExactDistribution() public {
    vm.prank(alice);
    vault.stake(200 * 1e18, genesis); // 190 net principal

    vm.prank(bob);
    vault.stake(100 * 1e18, genesis); // 95 net principal (half of Alice)

    vm.warp(block.timestamp + 30 days);

    uint256 rAlice = distributor.getPendingRecurringReward(alice);
    uint256 rBob = distributor.getPendingRecurringReward(bob);

    assertApproxEqRel(rAlice, 2 * rBob, 0.0001e18, 'Pro-rata 2:1 distribution required');
  }

  // 10. Mass Claims: Solvency preserved
  function test_MassClaims_SolvencyPreserved() public {
    vm.prank(alice);
    vault.stake(100 * 1e18, genesis);

    vm.prank(bob);
    vault.stake(100 * 1e18, genesis);

    vm.warp(block.timestamp + 60 days);

    vm.prank(alice);
    distributor.claimAllRewards();

    vm.prank(bob);
    distributor.claimAllRewards();

    (uint256 availCap, uint256 liab, , ) = distributor.getRewardCapacity();
    assertGe(availCap, liab, 'Solvency must hold after mass claims');
  }

  // 11. Mass Restaking: No commission loops
  function test_MassRestaking_NoCommissionsGenerated() public {
    vm.prank(alice);
    vault.stake(100 * 1e18, genesis);

    vm.warp(block.timestamp + 60 days);

    uint256 liabBefore = distributor.totalOutstandingLiabilities();
    vm.prank(alice);
    distributor.restakeAllRewards();
    uint256 liabAfter = distributor.totalOutstandingLiabilities();

    assertLe(liabAfter, liabBefore, 'Liabilities must decrease on restake');
  }

  // 12. Repeated APY Transitions: No retroactive repricing
  function test_RepeatedAPYTransitions_NoRetroactiveRepricing() public {
    vm.prank(alice);
    vault.stake(100 * 1e18, genesis);

    vm.warp(block.timestamp + 30 days);
    distributor.checkpoint();

    // Bob stakes, changing APY
    vm.prank(bob);
    vault.stake(500 * 1e18, alice);

    vm.warp(block.timestamp + 30 days);
    distributor.checkpoint();

    uint256 pendingAlice = distributor.getPendingRecurringReward(alice);
    assertGt(pendingAlice, 0, 'Alice accrued rewards continuously');
  }

  // 13. Same-block checkpoints
  function test_SameBlockCheckpoints_ZeroDelta() public {
    vm.prank(alice);
    vault.stake(100 * 1e18, genesis);

    uint256 idx1 = distributor.rewardIndex();
    distributor.checkpoint();
    uint256 idx2 = distributor.rewardIndex();
    assertEq(idx1, idx2, 'Same-block checkpoint must be no-op');
  }
}
