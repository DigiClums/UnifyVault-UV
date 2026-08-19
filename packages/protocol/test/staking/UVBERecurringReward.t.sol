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

    reserve.setVault(address(vault));
    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(vault), address(registry));

    token.mint(alice, 2_000_000 * 1e18);
    token.mint(bob, 2_000_000 * 1e18);
    vm.stopPrank();

    vm.prank(alice);
    token.approve(address(vault), type(uint256).max);
    vm.prank(bob);
    token.approve(address(vault), type(uint256).max);
  }

  function _calculateExpectedRecurring(
    uint256 userStake,
    uint256 bps,
    uint256 timeDelta
  ) internal pure returns (uint256) {
    if (userStake == 0 || bps == 0 || timeDelta == 0) return 0;
    uint256 deltaIndex = (timeDelta * bps * INDEX_PRECISION) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
    return (userStake * deltaIndex) / INDEX_PRECISION;
  }

  function test_RecurringAccrual_With5PercentAdminFee_1Second() public {
    uint256 adminBalBefore = token.balanceOf(admin);
    uint256 grossStake = 50 * 1e18;

    vm.prank(alice);
    vault.stake(grossStake, genesis);

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
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis); // 950 net stake

    uint256 rate = distributor.getCurrentAnnualBps();
    skip(1 days);

    uint256 expected = _calculateExpectedRecurring(950 * 1e18, rate, 1 days);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  function test_RecurringAccrual_30Days() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    uint256 rate = distributor.getCurrentAnnualBps();
    skip(30 days);

    uint256 expected = _calculateExpectedRecurring(950 * 1e18, rate, 30 days);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  function test_RecurringAccrual_365Days() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    uint256 rate = distributor.getCurrentAnnualBps();
    skip(365 days);

    uint256 expected = _calculateExpectedRecurring(950 * 1e18, rate, 365 days);
    assertEq(distributor.getClaimableRewards(alice), expected);
  }

  function test_ClaimRecurringRewards_PartialAndAll() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    skip(365 days);

    distributor.accrueRecurringReward(alice);
    uint256 totalEarned = distributor.getClaimableRewards(alice);
    assertGt(totalEarned, 0);

    uint256 initialWallet = token.balanceOf(alice);
    uint256 liabBefore = distributor.totalOutstandingLiabilities();
    uint256 resBefore = vault.getAvailableProtocolCapital();

    uint256 partialClaim = totalEarned / 2;
    vm.prank(alice);
    distributor.claimRewards(partialClaim);

    assertEq(token.balanceOf(alice), initialWallet + partialClaim);
    assertEq(distributor.getClaimableRewards(alice), totalEarned - partialClaim);
    assertEq(distributor.totalOutstandingLiabilities(), liabBefore - partialClaim);
    assertEq(vault.getAvailableProtocolCapital(), resBefore - partialClaim);

    vm.prank(alice);
    distributor.claimAllRewards();

    assertEq(token.balanceOf(alice), initialWallet + totalEarned);
    assertEq(distributor.getClaimableRewards(alice), 0);
  }

  function test_RestakeRecurringRewards_CompoundsWithoutCommissions() public {
    vm.prank(alice);
    vault.stake(10_000 * 1e18, genesis); // Net 9,500 UVBE

    skip(365 days);
    uint256 earnedYear1 = distributor.getPendingRecurringReward(alice);
    assertGt(earnedYear1, 0);

    uint256 liabBefore = distributor.totalOutstandingLiabilities();

    vm.prank(alice);
    distributor.restakeAllRewards();

    uint256 newStake = 9_500 * 1e18 + earnedYear1;
    assertEq(vault.getPermanentStake(alice), newStake);
    assertEq(distributor.getClaimableRewards(alice), 0);
    assertLe(distributor.totalOutstandingLiabilities(), liabBefore);
  }

  function test_RecurringAccrual_MultiYearLongTerm() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis); // 950 net principal, 57 initial liabilities, 893 surplus

    skip(3650 days);

    // After 10 years with no new entrants, Alice earns the entire remaining surplus (893 UVBE)
    uint256 claimable = distributor.getClaimableRewards(alice);
    assertEq(claimable, 893 * 1e18, 'Multi-year reward bounded by protocol surplus');
    assertEq(distributor.getCurrentAnnualBps(), 0, 'APY drops to 0% when surplus is exhausted');
  }

  function test_ReferralCommissionsAndDynamicRecurringCoexist() public {
    vm.prank(alice);
    vault.stake(1_000 * 1e18, genesis);

    vm.prank(bob);
    vault.stake(2_000 * 1e18, alice);

    uint256 expectedDirect = (1_900 * 1e18 * 500) / BPS_DENOMINATOR;
    uint256 rateAlice = distributor.getCurrentAnnualBps();

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

  function test_ZeroCapacity_ProducesZeroRecurringYield() public {
    assertEq(distributor.getCurrentAnnualBps(), 0);
    assertEq(distributor.getClaimableRewards(alice), 0);
  }

  function test_SolvencyAndLiabilityConservation() public {
    vm.prank(alice);
    vault.stake(5_000 * 1e18, genesis); // Net 4,750 UVBE

    skip(180 days);

    distributor.accrueRecurringReward(alice);

    uint256 totalLiab = distributor.totalOutstandingLiabilities();
    uint256 capital = vault.getAvailableProtocolCapital();

    assertLe(totalLiab, capital);

    (uint256 rec, uint256 dir, uint256 gen, uint256 rk, uint256 dao, uint256 tot, , ) = distributor
      .getDetailedRewardInfo(alice);
    assertEq(tot, rec + dir + gen + rk + dao);

    uint256 netStake = (5_000 * 1e18 * 9500) / BPS_DENOMINATOR; // 4,750 UVBE
    uint256 expectedDaoAlloc = (netStake * 100) / BPS_DENOMINATOR; // 47.5 UVBE
    uint256 expectedGen1Direct = (netStake * 500) / BPS_DENOMINATOR; // 237.5 UVBE (to genesis)
    assertEq(totalLiab, tot + expectedDaoAlloc + expectedGen1Direct);
  }
}
