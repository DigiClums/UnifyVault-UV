// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console2 } from 'forge-std/Test.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { UVBEStakingVault } from '../../src/staking/UVBEStakingVault.sol';
import { UVBEReferralRegistry } from '../../src/staking/UVBEReferralRegistry.sol';
import { UVBERewardDistributor } from '../../src/staking/UVBERewardDistributor.sol';
import { UVBEV2 } from '../../src/token/UVBEV2.sol';
import { IUVBEStakingMLM } from '../../src/interfaces/IUVBEStakingMLM.sol';

contract MockUVBEToken is UVBEV2 {
  constructor(address initialAdmin) UVBEV2(initialAdmin) {}

  function mintForTest(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

/**
 * @title UVBEProtocolStakingRedesignTest
 * @notice Comprehensive unit, invariant, and economic test suite for the redesigned
 *         protocol-owned capital staking & dynamic reward subsystem.
 */
contract UVBEProtocolStakingRedesignTest is Test {
  MockUVBEToken internal token;
  UVBEStakingVault internal vault;
  UVBEReferralRegistry internal registry;
  UVBERewardDistributor internal distributor;

  address internal admin = address(0xAD001);
  address internal treasury = admin;
  address internal genesisRoot = address(0xAA001);
  address internal alice = address(0xA11CE);
  address internal bob = address(0xB0B);
  address internal carol = address(0xCA001);
  address internal david = address(0xDA001);

  uint256 internal constant MIN_STAKE = 50 * 1e18;
  uint256 internal constant BPS_DENOMINATOR = 10_000;
  uint256 internal constant ADMIN_FEE_BPS = 500; // 5%

  function setUp() public {
    token = new MockUVBEToken(admin);

    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesisRoot);
    distributor = new UVBERewardDistributor(admin, address(token));

    // One-time module mesh wiring
    vm.startPrank(admin);
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(vault), address(registry));
    vm.stopPrank();

    // Mint test tokens
    token.mintForTest(alice, 100_000 * 1e18);
    token.mintForTest(bob, 100_000 * 1e18);
    token.mintForTest(carol, 100_000 * 1e18);
    token.mintForTest(david, 100_000 * 1e18);
    token.mintForTest(genesisRoot, 100_000 * 1e18);
  }

  // ---------------------------------------------------------------------------
  // TEST 1-5: BASE STAKE, FEE ROUTING, PRINCIPAL OWNERSHIP & ZERO WITHDRAWAL
  // ---------------------------------------------------------------------------

  function test_01_Stake50UVBE_ExactFeeAndPrincipalRouting() public {
    uint256 stakeGross = 50 * 1e18;
    uint256 treasuryBefore = token.balanceOf(treasury);
    uint256 vaultBefore = token.balanceOf(address(vault));
    uint256 totalSupplyBefore = token.totalSupply();

    vm.startPrank(alice);
    token.approve(address(vault), stakeGross);
    vault.stake(stakeGross, genesisRoot);
    vm.stopPrank();

    uint256 expectedFee = (stakeGross * ADMIN_FEE_BPS) / BPS_DENOMINATOR; // 2.5 UVBE (5%)
    uint256 expectedPrincipal = stakeGross - expectedFee; // 47.5 UVBE (95%)

    assertEq(token.balanceOf(treasury) - treasuryBefore, expectedFee, 'Treasury fee mismatch');
    assertEq(
      token.balanceOf(address(vault)) - vaultBefore,
      expectedPrincipal,
      'Vault balance mismatch'
    );
    assertEq(vault.getPermanentStake(alice), expectedPrincipal, 'Alice principal mismatch');
    assertEq(vault.totalPermanentStaked(), expectedPrincipal, 'Total staked mismatch');
    assertEq(vault.getAvailableProtocolCapital(), expectedPrincipal, 'Available capital mismatch');
    assertEq(token.totalSupply(), totalSupplyBefore, 'Total supply must be conserved');
  }

  function test_02_ZeroPrincipalWithdrawalRight() public {
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);

    // Assert that vault has no unstake or withdraw selectors
    (bool successUnstake, ) = address(vault).call(
      abi.encodeWithSignature('unstake(uint256)', 47.5 * 1e18)
    );
    assertFalse(successUnstake, 'unstake must not exist');

    (bool successWithdraw, ) = address(vault).call(
      abi.encodeWithSignature('withdraw(uint256)', 47.5 * 1e18)
    );
    assertFalse(successWithdraw, 'withdraw must not exist');

    (bool successUnlock, ) = address(vault).call(
      abi.encodeWithSignature('unlock(uint256)', 47.5 * 1e18)
    );
    assertFalse(successUnlock, 'unlock must not exist');

    (bool successRescue, ) = address(vault).call(
      abi.encodeWithSignature('rescue(address,uint256)', alice, 47.5 * 1e18)
    );
    assertFalse(successRescue, 'rescue must not exist');
    vm.stopPrank();
  }

  function test_03_BelowMinStakeReverts() public {
    vm.startPrank(alice);
    token.approve(address(vault), 49 * 1e18);
    vm.expectRevert(
      abi.encodeWithSelector(IUVBEStakingMLM.BelowMinStake.selector, 49 * 1e18, MIN_STAKE)
    );
    vault.stake(49 * 1e18, genesisRoot);
    vm.stopPrank();
  }

  // ---------------------------------------------------------------------------
  // TEST 6-12: DYNAMIC APY DYNAMICS (INFLOW, LIABILITIES, 100% CAP, 0% FLOOR)
  // ---------------------------------------------------------------------------

  function test_06_FirstStakerDynamicApyCalculation() public {
    // Initial APY before stake
    assertEq(distributor.getCurrentAnnualBps(), 0, 'Initial APY must be 0');

    // Alice stakes 50 UVBE (Net = 47.5 UVBE)
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    // Gen 1 referral to genesisRoot: 5% of 47.5 = 2.375 UVBE
    // DAO pool 1% of 47.5 = 0.475 UVBE
    // Total liabilities L = 2.85 UVBE
    // Available Capital B = 47.5 UVBE
    // Surplus = 47.5 - 2.85 = 44.65 UVBE
    // Expected APY = floor(44.65 * 10000 / 47.5) = 9400 BPS (94.00%)
    uint256 apyBps = distributor.getCurrentAnnualBps();
    assertEq(apyBps, 9400, 'First staker dynamic APY mismatch');
  }

  function test_07_ApyDecreasesAsLiabilitiesGrowOverTime() public {
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    uint256 apyBefore = distributor.getCurrentAnnualBps();

    // Warp 180 days (half a year)
    vm.warp(block.timestamp + 180 days);
    distributor.checkpoint();

    uint256 apyAfter = distributor.getCurrentAnnualBps();
    assertLt(apyAfter, apyBefore, 'APY must decrease prospectively as liabilities accrue');
  }

  function test_08_NewCapitalInflowIncreasesSurplusAndApy() public {
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    // Warp 180 days
    vm.warp(block.timestamp + 180 days);
    distributor.checkpoint();

    // Bob stakes 200 UVBE (Net = 190 UVBE)
    vm.startPrank(bob);
    token.approve(address(vault), 200 * 1e18);
    vault.stake(200 * 1e18, alice);
    vm.stopPrank();

    (uint256 availCap, uint256 liab, uint256 surplus, uint256 newBps) = distributor
      .getRewardCapacity();
    console2.log('Available Capital after Bob:', availCap);
    console2.log('Liabilities after Bob:      ', liab);
    console2.log('Surplus after Bob:          ', surplus);
    console2.log('New APY BPS:                ', newBps);

    assertGt(availCap, 200 * 1e18, 'Capital must expand with new inflow');
    assertLe(newBps, 10000, 'APY must be clamped at 100% max');
  }

  function test_09_ApyReachesZeroWhenLiabilitiesEqualCapital() public {
    // Zero stake gives 0 APY
    assertEq(distributor.getCurrentAnnualBps(), 0);
  }

  // ---------------------------------------------------------------------------
  // TEST 13-16: CLAIM REDUCES LIABILITIES & CAPITAL IN PERFECT EQUILIBRIUM
  // ---------------------------------------------------------------------------

  function test_13_ClaimReducesLiabilityAndVaultCapitalEqually() public {
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 30 days);
    distributor.checkpoint();

    uint256 pendingAlice = distributor.getPendingRecurringReward(alice);
    assertGt(pendingAlice, 0, 'Alice must have pending reward');

    uint256 aliceBalBefore = token.balanceOf(alice);
    uint256 vaultBalBefore = token.balanceOf(address(vault));
    uint256 liabBefore = distributor.totalOutstandingLiabilities();

    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();

    uint256 aliceBalAfter = token.balanceOf(alice);
    uint256 vaultBalAfter = token.balanceOf(address(vault));
    uint256 liabAfter = distributor.totalOutstandingLiabilities();

    uint256 claimed = aliceBalAfter - aliceBalBefore;
    assertEq(claimed, pendingAlice, 'Claimed amount mismatch');
    assertEq(
      vaultBalBefore - vaultBalAfter,
      claimed,
      'Vault capital decrease must equal claimed amount'
    );
    assertEq(liabBefore - liabAfter, claimed, 'Liability decrease must equal claimed amount');

    // Surplus capacity (VaultBalance - Liabilities) remains strictly constant across claims!
    assertEq(
      vaultBalBefore - liabBefore,
      vaultBalAfter - liabAfter,
      'Surplus capacity must be invariant under claims'
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 17-23: MULTI-USER PRO-RATA, SAME-BLOCK STAKES, RESTAKE & MLM
  // ---------------------------------------------------------------------------

  function test_17_MultipleUsersProRataRewardAllocation() public {
    // Alice stakes 100 UVBE (Net = 95 UVBE)
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    // Bob stakes 50 UVBE (Net = 47.5 UVBE) -> Exactly half of Alice
    vm.startPrank(bob);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    // Warp 30 days
    vm.warp(block.timestamp + 30 days);

    uint256 aliceReward = distributor.getPendingRecurringReward(alice);
    uint256 bobReward = distributor.getPendingRecurringReward(bob);

    console2.log('Alice Pending Reward:', aliceReward);
    console2.log('Bob Pending Reward:  ', bobReward);

    // Alice should earn 2x Bob
    assertApproxEqRel(aliceReward, 2 * bobReward, 0.0001e18, 'Alice reward must be exactly 2x Bob');
  }

  function test_18_SameBlockMultipleStakesZeroRetroactiveYield() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    // Second stake in same block
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    uint256 pendingImmediate = distributor.getPendingRecurringReward(alice);
    assertEq(pendingImmediate, 0, 'Zero yield in same block as stake');
    assertEq(vault.getPermanentStake(alice), 95 * 1e18, 'Total principal 95 UVBE');
  }

  function test_19_RestakeConvertsRewardToPrincipalWithout5PctFeeOrRecursiveMlm() public {
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 60 days);

    uint256 pending = distributor.getPendingRecurringReward(alice);
    assertGt(pending, 0);

    uint256 principalBefore = vault.getPermanentStake(alice);
    uint256 treasuryBefore = token.balanceOf(treasury);
    uint256 vaultBalBefore = token.balanceOf(address(vault));

    vm.startPrank(alice);
    distributor.restakeAllRewards();
    vm.stopPrank();

    uint256 principalAfter = vault.getPermanentStake(alice);
    uint256 treasuryAfter = token.balanceOf(treasury);
    uint256 vaultBalAfter = token.balanceOf(address(vault));

    assertEq(
      principalAfter,
      principalBefore + pending,
      'Principal must increase by exact restake amount'
    );
    assertEq(treasuryAfter, treasuryBefore, 'Treasury fee must NOT be charged on restake');
    assertEq(vaultBalAfter, vaultBalBefore, 'Vault token balance unchanged on internal restake');
  }

  function test_20_Mlm10GenerationCommissionsAndDaoDistribution() public {
    // Build 3-generation chain: Genesis -> Alice -> Bob -> Carol
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.startPrank(bob);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, alice);
    vm.stopPrank();

    vm.startPrank(carol);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, bob);
    vm.stopPrank();

    // Carol stake = 47.5 net principal
    // Bob (Gen 1): 5% of 47.5 = 2.375 UVBE (Bob is active because net principal == 47.5 UVBE)
    (, uint256 bobDirect, , , , , , ) = distributor.getDetailedRewardInfo(bob);
    assertEq(bobDirect, 2.375 * 1e18, 'Bob Gen 1 direct commission mismatch');
  }

  // ---------------------------------------------------------------------------
  // TEST 24-30: FUZZ TESTS FOR SOLVENCY, CAPITAL RECONCILIATION & CONSERVATION
  // ---------------------------------------------------------------------------

  function testFuzz_CapitalConservationAndSolvency(
    uint256 rawStakeA,
    uint256 rawStakeB,
    uint256 rawTime
  ) public {
    uint256 stakeAmountA = bound(rawStakeA, 50 * 1e18, 50_000 * 1e18);
    uint256 stakeAmountB = bound(rawStakeB, 50 * 1e18, 50_000 * 1e18);
    uint256 timeJump = bound(rawTime, 1 days, 365 days);

    token.mintForTest(alice, stakeAmountA);
    token.mintForTest(bob, stakeAmountB);

    uint256 supplyBefore = token.totalSupply();

    // Alice stakes
    vm.startPrank(alice);
    token.approve(address(vault), stakeAmountA);
    vault.stake(stakeAmountA, genesisRoot);
    vm.stopPrank();

    // Warp
    vm.warp(block.timestamp + timeJump);

    // Bob stakes
    vm.startPrank(bob);
    token.approve(address(vault), stakeAmountB);
    vault.stake(stakeAmountB, alice);
    vm.stopPrank();

    // Warp more
    vm.warp(block.timestamp + timeJump);

    // Check invariants
    (uint256 availCap, uint256 liab, , uint256 apy) = distributor.getRewardCapacity();

    // Invariant 1: APY <= 100%
    assertLe(apy, 10000, 'APY must never exceed 10000 BPS');

    // Invariant 2: Solvency (Available Capital >= Outstanding Liabilities)
    assertGe(availCap, liab, 'Solvency invariant violated');

    // Invariant 3: Total supply conservation
    assertEq(token.totalSupply(), supplyBefore, 'Total supply must remain constant');

    // Invariant 4: Token balance equals available protocol capital
    assertEq(
      token.balanceOf(address(vault)),
      availCap,
      'Vault token balance must equal available capital'
    );

    // Alice claims
    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();

    // Bob restakes
    vm.startPrank(bob);
    distributor.restakeAllRewards();
    vm.stopPrank();

    // Post-claim/restake solvency
    (uint256 postCap, uint256 postLiab, , ) = distributor.getRewardCapacity();
    assertGe(postCap, postLiab, 'Post-claim solvency invariant violated');
    assertEq(token.totalSupply(), supplyBefore, 'Total supply conserved after claims and restakes');
  }
}
