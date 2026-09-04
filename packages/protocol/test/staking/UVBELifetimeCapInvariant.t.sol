// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/staking/UVBEStakingVault.sol';
import '../../src/staking/UVBEReferralRegistry.sol';
import '../../src/staking/UVBERewardDistributor.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';

contract MockUVBEToken is ERC20 {
  constructor() ERC20('UVBE Token', 'UVBE') {
    _mint(msg.sender, 100_000_000 * 1e18);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract UVBELifetimeCapInvariantTest is Test {
  MockUVBEToken internal token;
  UVBEStakingVault internal vault;
  UVBEReferralRegistry internal registry;
  UVBERewardDistributor internal distributor;

  address internal admin = address(0xAD);
  address internal genesisRoot = address(0x01);
  address internal user0Ref = address(0x10); // User with 0 referrals
  address internal user1Ref = address(0x20); // User who will get 1 active referral
  address internal referee1 = address(0x30); // Referee of user1Ref
  address internal referee2 = address(0x40);

  function setUp() public {
    vm.startPrank(admin);

    token = new MockUVBEToken();
    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesisRoot);
    distributor = new UVBERewardDistributor(admin, address(token));

    // Link modules
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(vault), address(registry));

    // Fund stakers
    token.mint(user0Ref, 100_000 * 1e18);
    token.mint(user1Ref, 100_000 * 1e18);
    token.mint(referee1, 100_000 * 1e18);
    token.mint(referee2, 100_000 * 1e18);
    token.mint(genesisRoot, 100_000 * 1e18);

    vm.stopPrank();

    // Genesis Root stakes min active to be fully established
    vm.startPrank(genesisRoot);
    token.approve(address(vault), type(uint256).max);
    vault.stake(100 * 1e18, address(0));
    vm.stopPrank();

    // Users approve vault
    vm.prank(user0Ref);
    token.approve(address(vault), type(uint256).max);

    vm.prank(user1Ref);
    token.approve(address(vault), type(uint256).max);

    vm.prank(referee1);
    token.approve(address(vault), type(uint256).max);

    vm.prank(referee2);
    token.approve(address(vault), type(uint256).max);
  }

  function test_01_ZeroReferrals_CeasesAccrualExactlyAt2xDepositedPrincipal() public {
    // User0Ref stakes 100 UVBE gross (95 UVBE net deposited principal)
    vm.prank(user0Ref);
    vault.stake(100 * 1e18, genesisRoot);

    uint256 depositedPrincipal = vault.getTotalDepositedPrincipal(user0Ref);
    assertEq(depositedPrincipal, 95 * 1e18, 'Net principal should be 95 UVBE');

    (uint256 maxEarnings, uint256 totalEarned, bool isCapReached) = distributor.getLifetimeCap(
      user0Ref
    );
    assertEq(maxEarnings, 190 * 1e18, 'Max lifetime cap should be exactly 2x (190 UVBE)');
    assertEq(totalEarned, 0, 'Total earned initially 0');
    assertFalse(isCapReached);

    // Provide protocol surplus liquidity so APY runs at max ceiling
    token.mint(address(vault), 100_000 * 1e18);
    distributor.checkpoint();

    // Warp enough time (e.g. 5 years) to reach and exceed the 2x cap (190 UVBE)
    vm.warp(block.timestamp + 5 * 365 days);
    distributor.checkpoint();

    // After sufficient accrual, pending reward hits the 2x cap (190 UVBE)
    uint256 pending = distributor.getPendingRecurringReward(user0Ref);
    assertEq(pending, 190 * 1e18, 'Pending reward must be hard capped at 2x (190 UVBE)');

    // Fast forward another 5 years with more protocol capital
    vm.warp(block.timestamp + 5 * 365 days);
    distributor.checkpoint();

    // Pending must STILL be exactly 190 UVBE (accrual completely ceased at 2x)
    assertEq(
      distributor.getPendingRecurringReward(user0Ref),
      190 * 1e18,
      'Accrual must cease at 2x'
    );

    // Claim all rewards (190 UVBE)
    vm.prank(user0Ref);
    distributor.claimAllRewards();

    (maxEarnings, totalEarned, isCapReached) = distributor.getLifetimeCap(user0Ref);
    assertEq(totalEarned, 190 * 1e18);
    assertTrue(isCapReached, 'Cap reached should be true');
    assertEq(
      distributor.getPendingRecurringReward(user0Ref),
      0,
      'Pending after cap claim must be 0'
    );

    // Fast forward another year - still 0 reward
    vm.warp(block.timestamp + 365 days);
    distributor.checkpoint();
    assertEq(distributor.getPendingRecurringReward(user0Ref), 0, 'No APY should accrue after cap');
  }

  function test_02_NewPrincipalDeposit_ExpandsCapProportionallyWithoutResetting() public {
    // 1. Initial stake 100 UVBE (95 UVBE principal)
    vm.prank(user0Ref);
    vault.stake(100 * 1e18, genesisRoot);

    token.mint(address(vault), 100_000 * 1e18);
    distributor.checkpoint();

    vm.warp(block.timestamp + 5 * 365 days);
    distributor.checkpoint();

    vm.prank(user0Ref);
    distributor.claimAllRewards();

    // User is capped at 190 UVBE
    assertEq(distributor.getPendingRecurringReward(user0Ref), 0);

    // 2. User deposits additional 100 UVBE gross (95 UVBE additional principal)
    vm.prank(user0Ref);
    vault.stake(100 * 1e18, genesisRoot);

    uint256 newTotalDeposited = vault.getTotalDepositedPrincipal(user0Ref);
    assertEq(newTotalDeposited, 190 * 1e18, 'Total deposited principal is now 190 UVBE');

    (uint256 newMaxEarnings, uint256 totalEarned, bool isCapReached) = distributor.getLifetimeCap(
      user0Ref
    );
    assertEq(newMaxEarnings, 380 * 1e18, 'New 2x cap should be 380 UVBE (2 * 190)');
    assertEq(totalEarned, 190 * 1e18, 'Past earned rewards (190) are retained against total cap');
    assertFalse(
      isCapReached,
      'Cap is no longer reached because total cap is 380 and earned is 190'
    );

    // Warp more with protocol surplus capital
    token.mint(address(vault), 100_000 * 1e18);
    distributor.checkpoint();

    vm.warp(block.timestamp + 5 * 365 days);
    distributor.checkpoint();

    // User can now earn the remaining 190 UVBE (reaching 380 total)
    uint256 pending = distributor.getPendingRecurringReward(user0Ref);
    assertEq(pending, 190 * 1e18, 'User earns remaining 190 UVBE to reach new 380 cap');

    // Further time does not exceed 380
    vm.warp(block.timestamp + 365 days);
    distributor.checkpoint();
    assertEq(distributor.getPendingRecurringReward(user0Ref), 190 * 1e18);
  }

  function test_03_RestakeDoesNotBypassReferralRequirement() public {
    // User stakes 100 UVBE (95 net principal)
    vm.prank(user0Ref);
    vault.stake(100 * 1e18, genesisRoot);

    token.mint(address(vault), 100_000 * 1e18);
    distributor.checkpoint();

    // Warp 10 days, earn partial reward
    vm.warp(block.timestamp + 10 days);
    distributor.checkpoint();

    uint256 pending = distributor.getPendingRecurringReward(user0Ref);
    assertTrue(pending > 0);

    // Restake the reward
    vm.prank(user0Ref);
    distributor.restakeAllRewards();

    // Total deposited principal remains 95 UVBE (restake does NOT increase deposited principal)
    assertEq(
      vault.getTotalDepositedPrincipal(user0Ref),
      95 * 1e18,
      'Deposited principal must stay 95'
    );
    assertTrue(
      vault.getPermanentStake(user0Ref) > 95 * 1e18,
      'Permanent stake increases via restake'
    );

    // Max earnings lifetime cap remains strictly 2 * 95 = 190 UVBE
    (uint256 maxEarnings, uint256 totalEarned, ) = distributor.getLifetimeCap(user0Ref);
    assertEq(maxEarnings, 190 * 1e18, 'Cap remains strictly 190 UVBE despite restake');
    assertEq(totalEarned, pending, 'Restaked reward counts against lifetime cap');

    // Warp 5 years with surplus capital
    token.mint(address(vault), 100_000 * 1e18);
    distributor.checkpoint();
    vm.warp(block.timestamp + 5 * 365 days);
    distributor.checkpoint();

    // User's total earnings (restaked + pending) can NEVER exceed 190 UVBE
    uint256 newPending = distributor.getPendingRecurringReward(user0Ref);
    assertEq(
      totalEarned + newPending,
      190 * 1e18,
      'Total return (restake + pending) capped at 190 UVBE'
    );
  }

  function test_04_QualifiedDirectReferral_Unlocks3xLifetimeCap() public {
    // User1Ref stakes 100 UVBE (95 principal)
    vm.prank(user1Ref);
    vault.stake(100 * 1e18, genesisRoot);

    // Initially 0 directs -> 2x cap (190 UVBE)
    (uint256 initialMaxEarnings, , ) = distributor.getLifetimeCap(user1Ref);
    assertEq(initialMaxEarnings, 190 * 1e18);
    assertFalse(registry.hasUnlocked3x(user1Ref));

    // Referee1 registers with user1Ref and stakes 50 UVBE (47.5 net active principal)
    vm.prank(referee1);
    vault.stake(50 * 1e18, user1Ref);

    // User1Ref now has 1 qualified direct -> hasUnlocked3x is TRUE
    assertTrue(registry.hasUnlocked3x(user1Ref), '3x should be permanently unlocked');
    assertEq(registry.getActiveDirectCount(user1Ref), 1);

    // Max lifetime cap is now 3x (3 * 95 = 285 UVBE)
    (uint256 unlockedMaxEarnings, , ) = distributor.getLifetimeCap(user1Ref);
    assertEq(unlockedMaxEarnings, 285 * 1e18, 'Max lifetime earnings should now be 3x (285 UVBE)');

    // Provide protocol liquidity and warp 5 years
    token.mint(address(vault), 100_000 * 1e18);
    distributor.checkpoint();
    vm.warp(block.timestamp + 5 * 365 days);
    distributor.checkpoint();

    // User receives direct referral commission (5% of 47.5 = 2.375 UVBE) + recurring up to 285 UVBE
    (, uint256 directReward, , , , uint256 totalClaimable, , ) = distributor.getDetailedRewardInfo(
      user1Ref
    );

    assertEq(directReward, (475 * 1e17 * 500) / 10000, 'Direct reward 5%');
    assertEq(
      totalClaimable,
      285 * 1e18,
      'Total claimable earnings capped at exactly 3x (285 UVBE)'
    );
  }
}
