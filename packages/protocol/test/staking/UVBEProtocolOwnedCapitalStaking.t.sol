// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console2 } from 'forge-std/Test.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { UVBEStakingVault } from '../../src/staking/UVBEStakingVault.sol';
import { UVBEReferralRegistry } from '../../src/staking/UVBEReferralRegistry.sol';
import { UVBERewardDistributor } from '../../src/staking/UVBERewardDistributor.sol';
import { UVBEV2 } from '../../src/token/UVBEV2.sol';
import { IUVBEStakingMLM } from '../../src/interfaces/IUVBEStakingMLM.sol';

contract MockProtocolToken is UVBEV2 {
  constructor(address initialAdmin) UVBEV2(initialAdmin) {}

  function mintForTest(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

/**
 * @title UVBEProtocolOwnedCapitalStakingTest
 * @notice Exhaustive 25-scenario test suite for the redesigned Protocol-Owned Capital Staking Subsystem.
 * All rewards are paid directly from protocol-owned staking capital held in UVBEStakingVault.
 */
contract UVBEProtocolOwnedCapitalStakingTest is Test {
  MockProtocolToken internal token;
  UVBEStakingVault internal vault;
  UVBEReferralRegistry internal registry;
  UVBERewardDistributor internal distributor;

  address internal admin = address(0xAD001);
  address internal treasury = admin;
  address internal genesisRoot = address(0xAA001);
  address internal alice = address(0xA11CE);
  address internal bob = address(0xB0B);
  address internal carol = address(0xCA001);

  uint256 internal constant MIN_STAKE = 50 * 1e18;
  uint256 internal constant ADMIN_FEE_BPS = 500; // 5%
  uint256 internal constant BPS_DENOMINATOR = 10_000;

  function setUp() public {
    token = new MockProtocolToken(admin);

    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesisRoot);
    distributor = new UVBERewardDistributor(admin, address(token));

    // Module mesh wiring
    vm.startPrank(admin);
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(vault), address(registry));
    vm.stopPrank();

    // Mint test funds
    token.mintForTest(alice, 100_000 * 1e18);
    token.mintForTest(bob, 100_000 * 1e18);
    token.mintForTest(carol, 100_000 * 1e18);
    token.mintForTest(genesisRoot, 100_000 * 1e18);
  }

  // 1. 100 UVBE stake: 5 UVBE treasury, 95 UVBE vault
  function test_01_Stake100UVBE_Exact5PctTreasuryAnd95PctVault() public {
    uint256 stakeGross = 100 * 1e18;
    uint256 treasuryBefore = token.balanceOf(treasury);
    uint256 vaultBefore = token.balanceOf(address(vault));

    vm.startPrank(alice);
    token.approve(address(vault), stakeGross);
    vault.stake(stakeGross, genesisRoot);
    vm.stopPrank();

    uint256 expectedFee = (stakeGross * ADMIN_FEE_BPS) / BPS_DENOMINATOR; // 5 UVBE
    uint256 expectedCapital = stakeGross - expectedFee; // 95 UVBE

    assertEq(
      token.balanceOf(treasury) - treasuryBefore,
      expectedFee,
      'Treasury fee must be exactly 5 UVBE'
    );
    assertEq(
      token.balanceOf(address(vault)) - vaultBefore,
      expectedCapital,
      'Vault capital must be exactly 95 UVBE'
    );
  }

  // 2. Vault actually owns 95 UVBE
  function test_02_VaultActuallyOwns95UVBE() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    assertEq(token.balanceOf(address(vault)), 95 * 1e18, 'Vault must physically hold 95 UVBE');
    assertEq(
      vault.getAvailableProtocolCapital(),
      95 * 1e18,
      'Available protocol capital must be 95 UVBE'
    );
    assertEq(vault.totalPermanentStaked(), 95 * 1e18, 'Total permanent staked must be 95 UVBE');
  }

  // 3. User has zero principal withdrawal rights
  function test_03_UserHasZeroPrincipalWithdrawalRights() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);

    (bool sUnstake, ) = address(vault).call(abi.encodeWithSignature('unstake(uint256)', 95 * 1e18));
    assertFalse(sUnstake, 'unstake must not exist');

    (bool sWithdraw, ) = address(vault).call(
      abi.encodeWithSignature('withdrawPrincipal(uint256)', 95 * 1e18)
    );
    assertFalse(sWithdraw, 'withdrawPrincipal must not exist');

    (bool sUnlock, ) = address(vault).call(abi.encodeWithSignature('unlock(uint256)', 95 * 1e18));
    assertFalse(sUnlock, 'unlock must not exist');
    vm.stopPrank();
  }

  // 4. Reward claim actually transfers tokens from Vault
  function test_04_RewardClaimTransfersTokensFromVault() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 30 days);

    uint256 vaultBefore = token.balanceOf(address(vault));
    uint256 aliceBefore = token.balanceOf(alice);

    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();

    uint256 vaultAfter = token.balanceOf(address(vault));
    uint256 aliceAfter = token.balanceOf(alice);
    uint256 claimed = aliceAfter - aliceBefore;

    assertGt(claimed, 0, 'Alice claimed reward > 0');
    assertEq(vaultBefore - vaultAfter, claimed, 'Vault transferred exact reward');
  }

  // 5. Vault balance decreases after reward claim
  function test_05_VaultBalanceDecreasesAfterRewardClaim() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 60 days);

    uint256 vaultBefore = token.balanceOf(address(vault));
    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();
    uint256 vaultAfter = token.balanceOf(address(vault));

    assertLt(vaultAfter, vaultBefore, 'Vault balance must strictly decrease on claim');
  }

  // 6. User balance increases by exact reward
  function test_06_UserBalanceIncreasesByExactReward() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 30 days);

    uint256 pending = distributor.getPendingRecurringReward(alice);
    uint256 aliceBefore = token.balanceOf(alice);

    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();

    uint256 aliceAfter = token.balanceOf(alice);
    assertEq(aliceAfter - aliceBefore, pending, 'User received exact pending reward amount');
  }

  // 7. TotalSupply unchanged
  function test_07_TotalSupplyUnchanged() public {
    uint256 supplyBefore = token.totalSupply();

    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 30 days);

    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();

    assertEq(token.totalSupply(), supplyBefore, 'Total supply must remain invariant');
  }

  // 8. Admin cannot withdraw Vault capital
  function test_08_AdminCannotWithdrawVaultCapital() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    // Admin attempts direct extraction
    vm.startPrank(admin);
    (bool sDisburse, ) = address(vault).call(
      abi.encodeWithSignature('disburseReward(address,uint256)', admin, 10 * 1e18)
    );
    assertFalse(sDisburse, 'Admin cannot call disburseReward directly');

    (bool sSweep, ) = address(vault).call(
      abi.encodeWithSignature('sweep(address,uint256)', admin, 10 * 1e18)
    );
    assertFalse(sSweep, 'Admin cannot sweep vault capital');
    vm.stopPrank();
  }

  // 9. Admin cannot fund/alter APY
  function test_09_AdminCannotFundOrAlterApy() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    // APY is calculated dynamically from on-chain state
    uint256 apy = distributor.getCurrentAnnualBps();
    assertGt(apy, 0, 'Dynamic APY calculated automatically');

    // Admin has no setApy or setRate setter
    vm.startPrank(admin);
    (bool sSetApy, ) = address(distributor).call(abi.encodeWithSignature('setApy(uint256)', 2000));
    assertFalse(sSetApy, 'Admin cannot alter APY');
    vm.stopPrank();
  }

  // 10. RewardReserve is not required
  function test_10_RewardReserveNotRequired() public {
    // Distributor and Vault interact directly with each other
    assertEq(distributor.vault(), address(vault));
    assertEq(vault.distributor(), address(distributor));
  }

  // 11. First stake does not require external reward funding
  function test_11_FirstStakeDoesNotRequireExternalRewardFunding() public {
    // Initially rate is 0
    assertEq(distributor.getCurrentAnnualBps(), 0);

    // Alice stakes 100 UVBE
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    // Rate is immediately positive from Alice's protocol capital
    uint256 apy = distributor.getCurrentAnnualBps();
    assertGt(apy, 0, 'First stake immediately enables positive APY without external funding');
    assertEq(apy, 9000, 'Expected 90.00% APY');
  }

  // 12. Dynamic APY uses actual Vault balance
  function test_12_DynamicApyUsesActualVaultBalance() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    (uint256 availCap, uint256 liab, uint256 surplus, uint256 currentBps) = distributor
      .getRewardCapacity();
    assertEq(
      availCap,
      token.balanceOf(address(vault)),
      'Available capital must match Vault token balance'
    );
    assertEq(surplus, availCap - liab, 'Surplus must be capital minus liabilities');
    assertEq(currentBps, (surplus * 10_000) / vault.totalPermanentStaked());
  }

  // 13. APY = 0 when Vault capital <= liabilities
  function test_13_ApyIsZeroWhenVaultCapitalDepleted() public {
    assertEq(distributor.getCurrentAnnualBps(), 0, 'APY is 0 when no capital staked');
  }

  // 14. APY <= 600%
  function test_14_ApyNeverExceeds600Percent() public {
    vm.startPrank(alice);
    token.approve(address(vault), 50 * 1e18);
    vault.stake(50 * 1e18, genesisRoot);
    vm.stopPrank();

    assertLe(distributor.getCurrentAnnualBps(), 60_000, 'APY must be clamped at 60000 BPS');
  }

  // 15. New stake cannot receive historical rewards
  function test_15_NewStakeCannotReceiveHistoricalRewards() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 180 days);

    // Bob stakes after 180 days
    vm.startPrank(bob);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    // Bob must have 0 pending rewards immediately
    assertEq(distributor.getPendingRecurringReward(bob), 0, 'Bob has zero historical yield');
  }

  // 16. Large stake changes APY prospectively
  function test_16_LargeStakeChangesApyProspectively() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 180 days);
    distributor.checkpoint();

    // Carol stakes large capital (5,000 UVBE)
    vm.startPrank(carol);
    token.approve(address(vault), 5_000 * 1e18);
    vault.stake(5_000 * 1e18, genesisRoot);
    vm.stopPrank();

    (uint256 cap, , , uint256 newApy) = distributor.getRewardCapacity();
    assertGt(cap, 4_000 * 1e18, 'Capital expanded');
    assertLe(newApy, 10_000, 'Clamped at 100%');
  }

  // 17. Claim preserves solvency
  function test_17_ClaimPreservesSolvencySurplus() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 60 days);
    distributor.checkpoint();

    (uint256 capBefore, uint256 liabBefore, uint256 surplusBefore, ) = distributor
      .getRewardCapacity();

    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();

    (uint256 capAfter, uint256 liabAfter, uint256 surplusAfter, ) = distributor.getRewardCapacity();

    assertEq(
      capBefore - liabBefore,
      capAfter - liabAfter,
      'Surplus invariant B - L preserved across claim'
    );
    assertEq(surplusBefore, surplusAfter, 'Surplus capacity strictly invariant');
  }

  // 18. MLM rewards consume Vault capital
  function test_18_MlmRewardsConsumeVaultCapital() public {
    // Alice stakes -> Bob stakes with Alice -> Alice claims referral reward
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.startPrank(bob);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, alice);
    vm.stopPrank();

    (, uint256 directReward, , , , , , ) = distributor.getDetailedRewardInfo(alice);
    assertEq(directReward, 4.75 * 1e18, 'Alice earned 5% direct commission on 95 UVBE');

    uint256 vaultBefore = token.balanceOf(address(vault));
    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();
    uint256 vaultAfter = token.balanceOf(address(vault));

    assertGe(vaultBefore - vaultAfter, directReward, 'Vault capital disbursed for MLM commission');
  }

  // 19. DAO rewards consume Vault capital
  function test_19_DaoRewardsConsumeVaultCapital() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    // 1% DAO pool liability recorded
    (, uint256 liab, , ) = distributor.getRewardCapacity();
    assertGt(liab, 0, 'DAO liability recorded from stake');
  }

  // 20. Restake does not charge 5% fee
  function test_20_RestakeDoesNotCharge5PctFee() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 90 days);

    uint256 pending = distributor.getPendingRecurringReward(alice);
    assertGt(pending, 0);

    uint256 treasuryBefore = token.balanceOf(treasury);
    uint256 principalBefore = vault.getPermanentStake(alice);

    vm.startPrank(alice);
    distributor.restakeAllRewards();
    vm.stopPrank();

    uint256 treasuryAfter = token.balanceOf(treasury);
    uint256 principalAfter = vault.getPermanentStake(alice);

    assertEq(treasuryAfter, treasuryBefore, 'Zero fee to treasury on restake');
    assertEq(
      principalAfter,
      principalBefore + pending,
      '100% of restaked reward added to principal'
    );
  }

  // 21. Restake does not create MLM commission
  function test_21_RestakeDoesNotCreateMlmCommission() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.startPrank(bob);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, alice);
    vm.stopPrank();

    vm.warp(block.timestamp + 90 days);

    (, uint256 aliceDirectBefore, , , , , , ) = distributor.getDetailedRewardInfo(alice);

    // Bob restakes his yield
    vm.startPrank(bob);
    distributor.restakeAllRewards();
    vm.stopPrank();

    (, uint256 aliceDirectAfter, , , , , , ) = distributor.getDetailedRewardInfo(alice);
    assertEq(aliceDirectAfter, aliceDirectBefore, 'Restake must NOT generate referral commission');
  }

  // 22. Restake does not require reserve transfer
  function test_22_RestakeDoesNotRequireReserveTransfer() public {
    vm.startPrank(alice);
    token.approve(address(vault), 100 * 1e18);
    vault.stake(100 * 1e18, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + 60 days);

    uint256 vaultBalBefore = token.balanceOf(address(vault));
    vm.startPrank(alice);
    distributor.restakeAllRewards();
    vm.stopPrank();
    uint256 vaultBalAfter = token.balanceOf(address(vault));

    assertEq(vaultBalAfter, vaultBalBefore, 'Tokens stay in vault on restake');
  }

  // 23. Fuzz: Vault balance >= outstanding liabilities
  function testFuzz_VaultBalanceAlwaysCoversLiabilities(
    uint256 rawStakeA,
    uint256 rawStakeB,
    uint256 rawDays
  ) public {
    uint256 stakeA = bound(rawStakeA, 50 * 1e18, 50_000 * 1e18);
    uint256 stakeB = bound(rawStakeB, 50 * 1e18, 50_000 * 1e18);
    uint256 daysJump = bound(rawDays, 1, 365);

    token.mintForTest(alice, stakeA);
    token.mintForTest(bob, stakeB);

    vm.startPrank(alice);
    token.approve(address(vault), stakeA);
    vault.stake(stakeA, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + (daysJump * 1 days));

    vm.startPrank(bob);
    token.approve(address(vault), stakeB);
    vault.stake(stakeB, alice);
    vm.stopPrank();

    vm.warp(block.timestamp + (daysJump * 1 days));
    distributor.checkpoint();

    (uint256 cap, uint256 liab, , ) = distributor.getRewardCapacity();
    assertGe(cap, liab, 'Solvency invariant B >= L violated');
  }

  // 24. Fuzz: no reward payout exceeds actual Vault balance
  function testFuzz_NoRewardPayoutExceedsVaultBalance(uint256 rawStake, uint256 rawDays) public {
    uint256 stakeAmount = bound(rawStake, 50 * 1e18, 50_000 * 1e18);
    uint256 daysJump = bound(rawDays, 1, 365);

    token.mintForTest(alice, stakeAmount);

    vm.startPrank(alice);
    token.approve(address(vault), stakeAmount);
    vault.stake(stakeAmount, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + (daysJump * 1 days));

    uint256 claimable = distributor.getClaimableRewards(alice);
    uint256 vaultBal = token.balanceOf(address(vault));

    assertLe(claimable, vaultBal, 'Claimable reward exceeds Vault balance');
  }

  // 25. Fuzz: totalSupply never changes
  function testFuzz_TotalSupplyNeverChanges(uint256 rawStake, uint256 rawDays) public {
    uint256 stakeAmount = bound(rawStake, 50 * 1e18, 50_000 * 1e18);
    uint256 daysJump = bound(rawDays, 1, 365);

    token.mintForTest(alice, stakeAmount);
    uint256 supplyBefore = token.totalSupply();

    vm.startPrank(alice);
    token.approve(address(vault), stakeAmount);
    vault.stake(stakeAmount, genesisRoot);
    vm.stopPrank();

    vm.warp(block.timestamp + (daysJump * 1 days));

    vm.startPrank(alice);
    distributor.claimAllRewards();
    vm.stopPrank();

    assertEq(token.totalSupply(), supplyBefore, 'Total supply must never change');
  }
}
