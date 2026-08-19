// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console2 } from 'forge-std/Test.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { UVBERewardReserve } from '../../src/staking/UVBERewardReserve.sol';
import { UVBEStakingVault } from '../../src/staking/UVBEStakingVault.sol';
import { UVBEReferralRegistry } from '../../src/staking/UVBEReferralRegistry.sol';
import { UVBERewardDistributor } from '../../src/staking/UVBERewardDistributor.sol';
import { UVBEV2 } from '../../src/token/UVBEV2.sol';
import { IUVBEStakingMLM } from '../../src/interfaces/IUVBEStakingMLM.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

/**
 * @title BaseSepoliaDynamicStakingIntegrationTest
 * @notice Controlled end-to-end integration and invariant test on live Base Sepolia deployed contracts.
 */
contract BaseSepoliaDynamicStakingIntegrationTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  // Live Base Sepolia Addresses
  address public constant UVBE = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant REWARD_RESERVE = 0xf1E40C0e7aA253CE259A224f1CFEDEDEd6D77Fda;
  address public constant STAKING_VAULT = 0xaa5deaF54BCfb5ddf4C7196eDEd2A4B981a327e4;
  address public constant REFERRAL_REGISTRY = 0xc1F00539B6869b2445d85056EDc036114b939Ddd;
  address public constant REWARD_DISTRIBUTOR = 0x49D3Fef686b838a26b9B14E9728Ab99b66e320E9;
  address public constant TIMELOCK = 0x9094145Cd2AEA2f309eDf14237444a07edF98d02;

  UVBEV2 internal uvbe;
  UVBERewardReserve internal reserve;
  UVBEStakingVault internal vault;
  UVBEReferralRegistry internal registry;
  UVBERewardDistributor internal distributor;

  address internal testStakerA = address(0x2222222222222222222222222222222222222222);
  address internal testStakerB = address(0x3333333333333333333333333333333333333333);
  address internal treasury;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    uvbe = UVBEV2(UVBE);
    reserve = UVBERewardReserve(REWARD_RESERVE);
    vault = UVBEStakingVault(STAKING_VAULT);
    registry = UVBEReferralRegistry(REFERRAL_REGISTRY);
    distributor = UVBERewardDistributor(REWARD_DISTRIBUTOR);

    treasury = vault.treasury();
  }

  function test_CompleteControlledIntegrationJourney() public {
    console2.log('========================================================================');
    console2.log('  STARTING CONTROLLED BASE SEPOLIA RECURRING-REWARD INTEGRATION TEST');
    console2.log('========================================================================');

    // -------------------------------------------------------------------------
    // PHASE 1: READ-ONLY INITIAL STATE
    // -------------------------------------------------------------------------
    console2.log('\n--- PHASE 1: Read-Only Initial State ---');
    uint256 initReserve = reserve.getAvailableReserve();
    uint256 initLiabilities = distributor.totalOutstandingLiabilities();
    uint256 initApyBps = distributor.getCurrentAnnualBps();
    uint256 initTotalStaked = vault.totalPermanentStaked();

    console2.log('Initial Reserve:             ', initReserve);
    console2.log('Initial Liabilities:         ', initLiabilities);
    console2.log('Initial Dynamic APY (BPS):   ', initApyBps);
    console2.log('Initial Total Staked:        ', initTotalStaked);
    console2.log('Admin Fee BPS:               ', vault.ADMIN_FEE_BPS());
    console2.log('Treasury Address:            ', treasury);

    assertEq(initTotalStaked, 0, 'Initial total staked must be 0');

    // -------------------------------------------------------------------------
    // PHASE 2 & 3: FUND REWARD RESERVE
    // -------------------------------------------------------------------------
    console2.log('\n--- PHASE 2 & 3: Fund Reward Reserve with Controlled Amount ---');
    uint256 targetFundAmount = 9.5 * 1e18; // 9.5 UVBE
    deal(UVBE, testStakerA, targetFundAmount + 100 * 1e18);

    uint256 reserveBeforeFunding = reserve.getAvailableReserve();
    vm.startPrank(testStakerA);
    uvbe.approve(REWARD_RESERVE, targetFundAmount);
    reserve.depositRewardFunds(targetFundAmount);
    vm.stopPrank();

    uint256 reserveAfterFunding = reserve.getAvailableReserve();
    console2.log('Reserve Before Funding:      ', reserveBeforeFunding);
    console2.log('Funding Amount:              ', targetFundAmount);
    console2.log('Reserve After Funding:       ', reserveAfterFunding);
    assertEq(
      reserveAfterFunding,
      reserveBeforeFunding + targetFundAmount,
      'Reserve balance mismatch'
    );

    // -------------------------------------------------------------------------
    // PHASE 4 & 5: FUND TEST STAKER & APPROVAL
    // -------------------------------------------------------------------------
    console2.log('\n--- PHASE 4 & 5: Fund Test Staker & Approve Staking Vault ---');
    uint256 grossStakeAmount = 50 * 1e18; // 50 UVBE minimum stake
    vm.startPrank(testStakerA);
    uvbe.approve(STAKING_VAULT, grossStakeAmount);
    console2.log('Approved 50 UVBE to StakingVault');

    // -------------------------------------------------------------------------
    // PHASE 6: STAKE 50 UVBE
    // -------------------------------------------------------------------------
    console2.log('\n--- PHASE 6: Execute 50 UVBE Stake ---');
    uint256 treasuryBalBefore = uvbe.balanceOf(treasury);
    uint256 vaultBalBefore = uvbe.balanceOf(STAKING_VAULT);
    uint256 totalSupplyBefore = uvbe.totalSupply();

    vault.stake(grossStakeAmount, address(0));
    vm.stopPrank();

    uint256 expectedFee = (grossStakeAmount * 500) / 10000; // 2.5 UVBE (5%)
    uint256 expectedNetPrincipal = grossStakeAmount - expectedFee; // 47.5 UVBE (95%)

    uint256 treasuryBalAfter = uvbe.balanceOf(treasury);
    uint256 vaultBalAfter = uvbe.balanceOf(STAKING_VAULT);
    uint256 userStake = vault.getPermanentStake(testStakerA);
    uint256 totalStaked = vault.totalPermanentStaked();

    console2.log('Gross Stake Amount:          ', grossStakeAmount);
    console2.log('Admin Treasury Fee (5%):     ', expectedFee);
    console2.log('Net Permanent Principal:     ', expectedNetPrincipal);
    console2.log('Treasury Balance Growth:     ', treasuryBalAfter - treasuryBalBefore);
    console2.log('Vault Balance Growth:        ', vaultBalAfter - vaultBalBefore);
    console2.log('User Permanent Stake:        ', userStake);
    console2.log('Total Permanent Staked:      ', totalStaked);

    assertEq(treasuryBalAfter - treasuryBalBefore, expectedFee, 'Treasury fee mismatch');
    assertEq(vaultBalAfter - vaultBalBefore, expectedNetPrincipal, 'Vault balance mismatch');
    assertEq(userStake, expectedNetPrincipal, 'User principal mismatch');
    assertEq(totalStaked, expectedNetPrincipal, 'Total staked mismatch');

    // Total supply conservation check
    assertEq(uvbe.totalSupply(), totalSupplyBefore, 'Total supply must not change on stake');

    // -------------------------------------------------------------------------
    // PHASE 7: DYNAMIC APY VERIFICATION
    // -------------------------------------------------------------------------
    console2.log('\n--- PHASE 7: Dynamic APY Verification ---');
    (uint256 availRes, uint256 liab, uint256 surplus, uint256 curBps) = distributor
      .getRewardCapacity();
    uint256 actualAnnualBps = distributor.getCurrentAnnualBps();

    // Independent calculation: floor(Surplus * 10000 / TotalStaked)
    uint256 expectedBps = (surplus * 10000) / totalStaked;
    if (expectedBps > 10000) expectedBps = 10000;

    console2.log('Available Reserve:           ', availRes);
    console2.log('Outstanding Liabilities:     ', liab);
    console2.log('Surplus Capacity:            ', surplus);
    console2.log('Calculated Expected APY (BPS):', expectedBps);
    console2.log('On-Chain Current APY (BPS):  ', actualAnnualBps);
    console2.log('Effective Dynamic APY (%):   ', actualAnnualBps / 100);

    assertEq(actualAnnualBps, expectedBps, 'Dynamic APY BPS mismatch');
    assertEq(curBps, expectedBps, 'Capacity BPS mismatch');

    // -------------------------------------------------------------------------
    // PHASE 8: TIME-BASED ACCRUAL OVER CONTROLLED INTERVAL
    // -------------------------------------------------------------------------
    console2.log('\n--- PHASE 8: Time-Based Accrual Verification ---');
    uint256 elapsedSeconds = 30 days; // 30 days time jump
    vm.warp(block.timestamp + elapsedSeconds);

    uint256 pendingReward = distributor.getPendingRecurringReward(testStakerA);
    console2.log('Elapsed Time:                ', elapsedSeconds, 'seconds');
    console2.log('Pending Recurring Reward:    ', pendingReward);

    // Theoretical expected reward: (Principal * APY_BPS * elapsedSeconds) / (31536000 * 10000)
    uint256 expectedReward =
      (expectedNetPrincipal * actualAnnualBps * elapsedSeconds) / (31536000 * 10000);
    console2.log('Theoretical Expected Reward: ', expectedReward);

    assertGt(pendingReward, 0, 'Pending reward must be > 0');
    assertApproxEqAbs(
      pendingReward,
      expectedReward,
      1e12,
      'Pending reward calculation variance too high'
    );

    // Checkpoint accrual
    distributor.checkpoint();
    uint256 liabAfterAccrual = distributor.totalOutstandingLiabilities();
    console2.log('Outstanding Liabilities After Accrual:', liabAfterAccrual);
    assertGt(liabAfterAccrual, 0, 'Liabilities must increase after accrual');
    assertLe(liabAfterAccrual, reserve.getAvailableReserve(), 'Reserve must remain solvent');

    // -------------------------------------------------------------------------
    // PHASE 9: CLAIM REWARD EXECUTION & ROUTING INVARIANTS
    // -------------------------------------------------------------------------
    console2.log('\n--- PHASE 9: Claim Reward Execution & Invariants ---');
    uint256 userBalBeforeClaim = uvbe.balanceOf(testStakerA);
    uint256 reserveBalBeforeClaim = reserve.getAvailableReserve();
    uint256 vaultBalBeforeClaim = uvbe.balanceOf(STAKING_VAULT);
    uint256 claimAmount = pendingReward;

    vm.startPrank(testStakerA);
    distributor.claimAllRewards();
    vm.stopPrank();

    uint256 userBalAfterClaim = uvbe.balanceOf(testStakerA);
    uint256 reserveBalAfterClaim = reserve.getAvailableReserve();
    uint256 vaultBalAfterClaim = uvbe.balanceOf(STAKING_VAULT);
    uint256 liabAfterClaim = distributor.totalOutstandingLiabilities();

    console2.log('Claimed Reward Amount:       ', claimAmount);
    console2.log('User Balance Growth:         ', userBalAfterClaim - userBalBeforeClaim);
    console2.log('Reserve Balance Decrease:    ', reserveBalBeforeClaim - reserveBalAfterClaim);
    console2.log('Vault Balance Change:        ', vaultBalAfterClaim - vaultBalBeforeClaim);
    console2.log('Liabilities After Claim:     ', liabAfterClaim);

    // Invariant 1: Reward came directly from Reserve
    assertEq(
      reserveBalBeforeClaim - reserveBalAfterClaim,
      userBalAfterClaim - userBalBeforeClaim,
      'Reward must disburse from reserve'
    );
    // Invariant 2: Zero tokens left StakingVault
    assertEq(
      vaultBalAfterClaim,
      vaultBalBeforeClaim,
      'StakingVault balance must remain strictly locked'
    );
    // Invariant 3: Liabilities decreased
    assertLt(liabAfterClaim, liabAfterAccrual, 'Liabilities must decrease on claim');

    // -------------------------------------------------------------------------
    // PHASE 10: SOLVENCY POST-CLAIM
    // -------------------------------------------------------------------------
    console2.log('\n--- PHASE 10: Solvency Check Post-Claim ---');
    uint256 finalReserve = reserve.getAvailableReserve();
    uint256 finalLiabilities = distributor.totalOutstandingLiabilities();
    uint256 finalApy = distributor.getCurrentAnnualBps();

    console2.log('Final Available Reserve:     ', finalReserve);
    console2.log('Final Liabilities:           ', finalLiabilities);
    console2.log('Final Dynamic APY (BPS):     ', finalApy);

    assertGe(finalReserve, finalLiabilities, 'Solvency invariant violated');
    console2.log('\n=== ALL 11 PHASES OF CONTROLLED INTEGRATION TEST PASSED SUCCESSFULLY ===');
  }
}
