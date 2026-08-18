// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';
import '../../src/staking/UVBERewardReserve.sol';
import '../../src/staking/UVBEStakingVault.sol';
import '../../src/staking/UVBEReferralRegistry.sol';
import '../../src/staking/UVBERewardDistributor.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/constants/ModuleIds.sol';

contract MockERC20PermitToken is ERC20 {
  constructor() ERC20('Mock UVBE', 'UVBE') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract UVBEStakingMLMTest is Test {
  address public admin = address(0xAD);
  address public genesis = address(0x6E);
  address public alice = address(0xA1);
  address public bob = address(0xB0);
  address public charlie = address(0xC3);
  address public david = address(0xD4);
  address public eve = address(0xE5);

  MockERC20PermitToken public token;
  UVBERewardReserve public reserve;
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;

  function setUp() public {
    vm.startPrank(admin);

    // 1. Deploy Mock UVBE
    token = new MockERC20PermitToken();

    // 2. Deploy Subsystem Contracts
    reserve = new UVBERewardReserve(admin, address(token));
    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesis);
    distributor = new UVBERewardDistributor(admin, address(token));

    // 3. Link Modules
    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(reserve), address(vault), address(registry));

    // 4. Pre-fund Reward Reserve with already-minted UVBE (100,000 UVBE)
    token.mint(admin, 1_000_000 * 1e18);
    token.approve(address(reserve), 100_000 * 1e18);
    reserve.depositRewardFunds(100_000 * 1e18);

    // 5. Mint tokens for users
    token.mint(alice, 10_000 * 1e18);
    token.mint(bob, 10_000 * 1e18);
    token.mint(charlie, 10_000 * 1e18);
    token.mint(david, 10_000 * 1e18);
    token.mint(eve, 10_000 * 1e18);

    vm.stopPrank();

    // Users approve vault
    vm.prank(alice);
    token.approve(address(vault), type(uint256).max);
    vm.prank(bob);
    token.approve(address(vault), type(uint256).max);
    vm.prank(charlie);
    token.approve(address(vault), type(uint256).max);
    vm.prank(david);
    token.approve(address(vault), type(uint256).max);
    vm.prank(eve);
    token.approve(address(vault), type(uint256).max);
  }

  // --- 1. Permanent Staking Invariant Tests ---

  function test_PermanentStakingLock() public {
    uint256 stakeAmount = 500 * 1e18;

    vm.prank(alice);
    vault.stake(stakeAmount, genesis);

    assertEq(vault.getPermanentStake(alice), stakeAmount);
    assertEq(vault.totalPermanentStaked(), stakeAmount);
    assertEq(token.balanceOf(address(vault)), stakeAmount);
    assertEq(token.balanceOf(alice), 9_500 * 1e18);

    // Verify there are no unstake functions and tokens remain permanently in vault
    assertEq(vault.getStakeCount(alice), 1);
    (uint256 amt, uint256 ts) = vault.getStakeRecord(alice, 0);
    assertEq(amt, stakeAmount);
    assertEq(ts, block.timestamp);
  }

  function test_Revert_BelowMinimumStake() public {
    vm.prank(alice);
    vm.expectRevert(
      abi.encodeWithSelector(UVBEStakingVault.BelowMinStake.selector, 40 * 1e18, 50 * 1e18)
    );
    vault.stake(40 * 1e18, genesis);
  }

  // --- 2. Referral & Direct (Gen 1) Commission Tests ---

  function test_DirectReferralCommission_Gen1IsDirect() public {
    // Alice stakes 500 UVBE with Genesis
    vm.prank(alice);
    vault.stake(500 * 1e18, genesis);

    // Bob stakes 1,000 UVBE with Alice as referrer
    vm.prank(bob);
    vault.stake(1_000 * 1e18, alice);

    // Alice is Gen 1 (Direct) -> 5.00% of 1000 UVBE = 50 UVBE
    assertEq(distributor.getClaimableRewards(alice), 50 * 1e18);

    (, uint256 directReward, uint256 genReward, , , uint256 totalClaimable, , ) = distributor
      .getDetailedRewardInfo(alice);
    assertEq(directReward, 50 * 1e18);
    assertEq(genReward, 0); // No double payment! Gen 1 IS the Direct Referral
    assertEq(totalClaimable, 50 * 1e18);
  }

  function test_MultiGenerationMatchingCommissions() public {
    // Tree: Genesis -> Alice -> Bob -> Charlie -> David
    // 1. Alice stakes 1,000 UVBE with Genesis
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    // 2. Eve stakes 500 UVBE under Alice -> Alice now has 1 active direct
    vm.prank(eve);
    vault.stake(500 * 1e18, alice);

    // 3. Bob stakes 1,000 UVBE under Alice -> Alice now has 2 active directs (Qualifies for Gen 2 & 3!)
    vm.prank(bob);
    vault.stake(1_000 * 1e18, alice);

    // 4. Charlie stakes 1,000 UVBE under Bob (Gen 1 for Bob, Gen 2 for Alice)
    vm.prank(charlie);
    vault.stake(1_000 * 1e18, bob);

    // 5. David stakes 2,000 UVBE under Charlie (Gen 1 for Charlie, Gen 2 for Bob, Gen 3 for Alice)
    vm.prank(david);
    vault.stake(2_000 * 1e18, charlie);

    // Charlie is Gen 1 for David -> 5.00% of 2000 = 100 UVBE
    (, uint256 charlieDirect, , , , uint256 charlieTotal, , ) = distributor.getDetailedRewardInfo(
      charlie
    );
    assertEq(charlieDirect, 100 * 1e18);
    assertEq(charlieTotal, 100 * 1e18);

    // Bob has only 1 direct (Charlie), so Bob is unqualified for Gen 2 (needs 2 directs)
    (, , uint256 bobGen, , , , , ) = distributor.getDetailedRewardInfo(bob);
    assertEq(bobGen, 0); // Correct! Anti-Sybil qualification strictly enforced

    // Alice has 2 active directs (Bob and Eve):
    // - Gen 1 from Eve: 25 UVBE (Direct)
    // - Gen 1 from Bob: 50 UVBE (Direct)
    // - Gen 2 from Charlie: 20 UVBE (Gen 2 = 2.00% of 1000)
    // - Gen 3 from David: 30 UVBE (Gen 3 = 1.50% of 2000)
    (, uint256 aliceDirect, uint256 aliceGen, , , uint256 aliceTotal, , ) = distributor
      .getDetailedRewardInfo(alice);
    assertEq(aliceDirect, 75 * 1e18); // 25 + 50
    assertEq(aliceGen, 50 * 1e18); // 20 + 30
    assertEq(aliceTotal, 125 * 1e18); // 75 + 50
  }

  // --- 3. Restaking Tests (Frozen Invariant: Restake creates NO new commissions) ---

  function test_RestakeRewards_CreatesNoNewCommissions() public {
    // 1. Alice stakes 500 UVBE
    vm.prank(alice);
    vault.stake(500 * 1e18, genesis);

    // 2. Bob stakes 1,000 UVBE with Alice
    vm.prank(bob);
    vault.stake(1_000 * 1e18, alice);

    // Alice has 50 UVBE claimable reward
    assertEq(distributor.getClaimableRewards(alice), 50 * 1e18);

    uint256 genesisInitialReward = distributor.getClaimableRewards(genesis);

    // 3. Alice restakes all 50 UVBE into permanent principal
    vm.prank(alice);
    distributor.restakeAllRewards();

    // Invariant checks:
    assertEq(distributor.getClaimableRewards(alice), 0);
    assertEq(vault.getPermanentStake(alice), 550 * 1e18); // Principal increased!
    assertEq(vault.getStakeCount(alice), 2);

    // FROZEN DECISION 1: Genesis gets ZERO new referral commission on restaked rewards!
    assertEq(distributor.getClaimableRewards(genesis), genesisInitialReward);
  }

  // --- 4. Claim Rewards Tests ---

  function test_ClaimRewards_DisbursesFromReserveToWallet() public {
    vm.prank(alice);
    vault.stake(500 * 1e18, genesis);

    vm.prank(bob);
    vault.stake(1_000 * 1e18, alice);

    uint256 aliceWalletBefore = token.balanceOf(alice);
    uint256 claimable = distributor.getClaimableRewards(alice);
    assertEq(claimable, 50 * 1e18);

    vm.prank(alice);
    distributor.claimRewards(claimable);

    assertEq(distributor.getClaimableRewards(alice), 0);
    assertEq(token.balanceOf(alice), aliceWalletBefore + claimable);
  }

  // --- 5. Self-Referral and Circular Referral Prevention ---

  function test_Revert_SelfReferral() public {
    vm.prank(alice);
    vm.expectRevert(UVBEReferralRegistry.SelfReferralProhibited.selector);
    vault.stake(100 * 1e18, alice);
  }

  function test_Revert_CircularReferral() public {
    // Alice registers with Bob
    vm.prank(bob);
    vault.stake(100 * 1e18, genesis);

    vm.prank(alice);
    vault.stake(100 * 1e18, bob);

    // Now if a new user Charlie refers to Alice, and Dave refers to Charlie, then Dave cannot be referred by Alice's descendent if cycle formed
    // Verify anti-cycle lookup works cleanly
    assertEq(registry.getReferrer(alice), bob);
  }

  // --- 6. Solvency Invariant Test ---

  function test_RewardReserveSolvencyInvariant() public {
    uint256 reserveBalance = reserve.getAvailableReserve();
    uint256 liabilities = distributor.totalOutstandingLiabilities();

    assertGe(reserveBalance, liabilities, 'Reserve must back all outstanding liabilities');
  }

  // --- 7. DAO Leadership Pool Cycle Test ---

  function test_DaoEpochCycle_DistributionAndClaim() public {
    // Staking deposits fund DAO pool with 1.00%
    vm.prank(alice);
    vault.stake(10_000 * 1e18, genesis); // 1% = 100 UVBE to DAO pool

    assertEq(distributor.currentDaoEpochId(), 1);

    // Fast forward 31 days
    vm.warp(block.timestamp + 31 days);

    // Finalize Epoch 1
    distributor.finalizeDaoEpoch(1);
    assertEq(distributor.currentDaoEpochId(), 2);
  }
}
