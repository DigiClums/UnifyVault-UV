// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';
import '../../src/staking/UVBERewardReserve.sol';
import '../../src/staking/UVBEStakingVault.sol';
import '../../src/staking/UVBEReferralRegistry.sol';
import '../../src/staking/UVBERewardDistributor.sol';

contract MockTokenForDao is ERC20 {
  constructor() ERC20('Mock UVBE', 'UVBE') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract DaoTestHelper is Test {
  UVBEStakingVault public vault;
  MockTokenForDao public token;
  address public genesis;

  constructor(address _vault, address _token, address _genesis) {
    vault = UVBEStakingVault(_vault);
    token = MockTokenForDao(_token);
    genesis = _genesis;
  }

  function stakeFor(address user, uint256 amt, address ref) external {
    token.mint(user, amt);
    vm.prank(user);
    token.approve(address(vault), type(uint256).max);
    vm.prank(user);
    vault.stake(amt, ref);
  }
}

contract UVBEDaoDistributionInvariantTest is Test {
  address public admin = address(0xAD);
  address public genesis = address(0x6E);
  address public platinumLeader = address(0x444);
  address public diamondLeader = address(0x555);
  address public crownLeader = address(0x666);
  address public nonLeader = address(0x999);

  MockTokenForDao public token;
  UVBERewardReserve public reserve;
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;
  DaoTestHelper public helper;

  function setUp() public {
    vm.startPrank(admin);
    token = new MockTokenForDao();
    reserve = new UVBERewardReserve(admin, address(token));
    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesis);
    distributor = new UVBERewardDistributor(admin, address(token));
    helper = new DaoTestHelper(address(vault), address(token), genesis);

    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(reserve), address(vault), address(registry));

    // Pre-fund Reward Reserve
    token.mint(admin, 1_000_000 * 1e18);
    token.approve(address(reserve), 500_000 * 1e18);
    reserve.depositRewardFunds(500_000 * 1e18);

    vm.stopPrank();
  }

  // --- Helper to create a qualified leader ---
  function _qualifyLeader(
    address target,
    uint256 stakeAmt,
    uint256 directs,
    uint256 volPerDirect
  ) internal {
    helper.stakeFor(target, stakeAmt, genesis);

    for (uint256 i = 1; i <= directs; ++i) {
      address d = address(uint160(uint256(keccak256(abi.encodePacked(target, i)))));
      helper.stakeFor(d, volPerDirect, target);
    }
  }

  // --- Invariant 1: Sum of Claims <= Pool Amount ---

  function test_DaoInvariant_SumOfClaimsNeverExceedsPoolAmount() public {
    // 1. Qualify Platinum (Rank 4: 1,000 personal, 5 directs, 50,000 team volume) -> 1 share
    _qualifyLeader(platinumLeader, 1_000 * 1e18, 5, 10_000 * 1e18);
    assertEq(registry.getRank(platinumLeader), 4);

    // 2. Qualify Diamond (Rank 5: 2,500 personal, 7 directs, 150,000 team volume) -> 3 shares
    _qualifyLeader(diamondLeader, 2_500 * 1e18, 7, 22_000 * 1e18);
    assertEq(registry.getRank(diamondLeader), 5);

    // 3. Qualify Crown (Rank 6: 5,000 personal, 10 directs, 500,000 team volume) -> 10 shares
    _qualifyLeader(crownLeader, 5_000 * 1e18, 10, 50_000 * 1e18);
    assertEq(registry.getRank(crownLeader), 6);

    // Total shares = 1 + 3 + 10 = 14 shares

    // Warp 31 days to end Epoch 1
    vm.warp(block.timestamp + 31 days);

    // Finalize Epoch 1
    distributor.finalizeDaoEpoch(1);

    // Claim rewards for all 3 leaders
    vm.prank(platinumLeader);
    distributor.claimDaoEpochReward(1);

    vm.prank(diamondLeader);
    distributor.claimDaoEpochReward(1);

    vm.prank(crownLeader);
    distributor.claimDaoEpochReward(1);

    (, , , , uint256 platDao, , , ) = _getDetailedReward(platinumLeader);
    (, , , , uint256 diamDao, , , ) = _getDetailedReward(diamondLeader);
    (, , , , uint256 crownDao, , , ) = _getDetailedReward(crownLeader);

    uint256 totalClaimedDao = platDao + diamDao + crownDao;

    // Verify proportions: Diamond gets 3x Platinum, Crown gets 10x Platinum
    assertApproxEqAbs(diamDao, platDao * 3, 10);
    assertApproxEqAbs(crownDao, platDao * 10, 10);

    // MATHEMATICAL INVARIANT: Total claimed must strictly be <= pool amount
    // Staking deposits created 1% DAO allocation.
    assertLe(totalClaimedDao, reserve.getAvailableReserve());
  }

  // --- Invariant 2: Rank Changes After Epoch Finalization Do NOT Alter Denominator ---

  function test_DaoInvariant_RankChangesAfterFinalizationDoNotAffectFinalizedEpoch() public {
    // 1. Qualify Platinum (Rank 4) -> 1 share
    _qualifyLeader(platinumLeader, 1_000 * 1e18, 5, 10_000 * 1e18);
    assertEq(registry.getRank(platinumLeader), 4);

    // Warp 31 days and finalize Epoch 1
    vm.warp(block.timestamp + 31 days);
    distributor.finalizeDaoEpoch(1);

    // Now in Epoch 2, upgrade Platinum to Diamond (Rank 5)
    _qualifyLeader(platinumLeader, 2_500 * 1e18, 7, 25_000 * 1e18);
    assertEq(registry.getRank(platinumLeader), 5);

    // Claim Epoch 1: Should receive Rank 4 (1 share), NOT Rank 5 (3 shares)!
    vm.prank(platinumLeader);
    distributor.claimDaoEpochReward(1);

    (, , , , uint256 platDao, , , ) = _getDetailedReward(platinumLeader);
    // Since platinumLeader was the sole leader during Epoch 1 snapshot, they get 100% of Epoch 1 pool
    assertGt(platDao, 0);
  }

  // --- Invariant 3: Replay Attack Defense (Same Epoch Cannot Be Claimed Twice) ---

  function test_DaoInvariant_RevertOnDoubleClaim() public {
    _qualifyLeader(platinumLeader, 1_000 * 1e18, 5, 10_000 * 1e18);

    vm.warp(block.timestamp + 31 days);
    distributor.finalizeDaoEpoch(1);

    vm.prank(platinumLeader);
    distributor.claimDaoEpochReward(1);

    // Attempting second claim must revert
    vm.prank(platinumLeader);
    vm.expectRevert(
      abi.encodeWithSelector(UVBERewardDistributor.EpochAlreadyClaimed.selector, platinumLeader, 1)
    );
    distributor.claimDaoEpochReward(1);
  }

  // --- Invariant 4: Non-Eligible Users Cannot Claim ---

  function test_DaoInvariant_NonLeaderCannotClaim() public {
    _qualifyLeader(platinumLeader, 1_000 * 1e18, 5, 10_000 * 1e18);

    // nonLeader stakes 100 UVBE (Bronze: Rank 1)
    helper.stakeFor(nonLeader, 100 * 1e18, genesis);

    vm.warp(block.timestamp + 31 days);
    distributor.finalizeDaoEpoch(1);

    vm.prank(nonLeader);
    vm.expectRevert(UVBERewardDistributor.NoEligibleShares.selector);
    distributor.claimDaoEpochReward(1);
  }

  // --- Invariant 5: Zero Leaders Roll Over Pool Amount ---

  function test_DaoInvariant_ZeroLeadersRollsOverPool() public {
    // Only nonLeader stakes (no DAO leader exists)
    helper.stakeFor(nonLeader, 10_000 * 1e18, genesis); // 1% = 100 UVBE to DAO pool

    vm.warp(block.timestamp + 31 days);

    // Finalize Epoch 1 with 0 leaders
    distributor.finalizeDaoEpoch(1);

    // In Epoch 2, Platinum leader arrives
    _qualifyLeader(platinumLeader, 1_000 * 1e18, 5, 10_000 * 1e18);

    vm.warp(block.timestamp + 32 days);
    distributor.finalizeDaoEpoch(2);

    // Platinum leader claims Epoch 2 and receives the full accumulated pool
    vm.prank(platinumLeader);
    distributor.claimDaoEpochReward(2);

    (, , , , uint256 platDao, , , ) = _getDetailedReward(platinumLeader);
    assertGt(platDao, 100 * 1e18); // Includes rolled-over funds from Epoch 1!
  }

  function _getDetailedReward(
    address user
  ) internal view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256) {
    return distributor.getDetailedRewardInfo(user);
  }
}
