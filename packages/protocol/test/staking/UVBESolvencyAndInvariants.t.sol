// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';
import '../../src/staking/UVBERewardReserve.sol';
import '../../src/staking/UVBEStakingVault.sol';
import '../../src/staking/UVBEReferralRegistry.sol';
import '../../src/staking/UVBERewardDistributor.sol';

contract MockPermitToken is ERC20 {
  constructor() ERC20('Mock UVBE', 'UVBE') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract UVBESolvencyAndInvariantsTest is Test {
  address public admin = address(0xAD);
  address public genesis = address(0x6E);
  address public userA = address(0x111);
  address public userB = address(0x222);
  address public userC = address(0x333);

  MockPermitToken public token;
  UVBERewardReserve public reserve;
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;

  function setUp() public {
    vm.startPrank(admin);
    token = new MockPermitToken();
    reserve = new UVBERewardReserve(admin, address(token));
    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesis);
    distributor = new UVBERewardDistributor(admin, address(token));

    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(reserve), address(vault), address(registry));

    // Pre-fund Reward Reserve
    token.mint(admin, 1_000_000 * 1e18);
    token.approve(address(reserve), 200_000 * 1e18);
    reserve.depositRewardFunds(200_000 * 1e18);

    token.mint(userA, 50_000 * 1e18);
    token.mint(userB, 50_000 * 1e18);
    token.mint(userC, 50_000 * 1e18);
    vm.stopPrank();

    vm.prank(userA);
    token.approve(address(vault), type(uint256).max);
    vm.prank(userB);
    token.approve(address(vault), type(uint256).max);
    vm.prank(userC);
    token.approve(address(vault), type(uint256).max);
  }

  // --- Fuzz Testing Solvency Invariant ---

  function testFuzz_RewardReserveSolvencyInvariant(uint256 stakeA, uint256 stakeB) public {
    // Bound stake amounts within valid limits [50 UVBE, 20,000 UVBE]
    stakeA = bound(stakeA, 50 * 1e18, 20_000 * 1e18);
    stakeB = bound(stakeB, 50 * 1e18, 20_000 * 1e18);

    vm.prank(userA);
    vault.stake(stakeA, genesis);

    vm.prank(userB);
    vault.stake(stakeB, userA);

    uint256 availableReserve = reserve.getAvailableReserve();
    uint256 totalLiabilities = distributor.totalOutstandingLiabilities();

    // Core Invariant: Reserve must always strictly cover all outstanding liabilities
    assertGe(
      availableReserve,
      totalLiabilities,
      'Solvency Invariant Violated: Reserve balance must exceed or equal outstanding liabilities'
    );

    // Core Invariant: Vault token balance must exactly equal total permanent staked
    assertEq(
      token.balanceOf(address(vault)),
      vault.totalPermanentStaked(),
      'Vault Token Balance Invariant Violated'
    );
  }

  function testFuzz_RestakeSolvencyConservation(uint256 stakeAmount) public {
    stakeAmount = bound(stakeAmount, 50 * 1e18, 10_000 * 1e18);

    vm.prank(userA);
    vault.stake(stakeAmount, genesis);

    vm.prank(userB);
    vault.stake(stakeAmount, userA);

    uint256 claimableA = distributor.getClaimableRewards(userA);

    if (claimableA > 0) {
      uint256 vaultBalanceBefore = token.balanceOf(address(vault));
      uint256 reserveBalanceBefore = reserve.getAvailableReserve();

      vm.prank(userA);
      distributor.restakeAllRewards();

      // Assertions
      assertEq(token.balanceOf(address(vault)), vaultBalanceBefore + claimableA);
      assertEq(reserve.getAvailableReserve(), reserveBalanceBefore - claimableA);
      assertEq(distributor.getClaimableRewards(userA), 0);
    }
  }

  function test_PrincipalExtractionImpossible() public {
    uint256 grossStake = 1_000 * 1e18;
    uint256 expectedFee = (grossStake * 500) / 10_000; // 50 UVBE
    uint256 expectedNet = grossStake - expectedFee; // 950 UVBE

    vm.prank(userA);
    vault.stake(grossStake, genesis);

    assertEq(token.balanceOf(address(vault)), expectedNet);

    // Attempting any unauthorized transfer from vault will revert
    vm.expectRevert();
    vm.prank(userA);
    token.transferFrom(address(vault), userA, expectedNet);

    // Verify vault balance remains 950 UVBE
    assertEq(token.balanceOf(address(vault)), expectedNet);
    assertEq(vault.totalPermanentStaked(), expectedNet);
  }
}
