// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';
import '../../src/staking/UVBERewardReserve.sol';
import '../../src/staking/UVBEStakingVault.sol';
import '../../src/staking/UVBEReferralRegistry.sol';
import '../../src/staking/UVBERewardDistributor.sol';

contract MockHardeningToken is ERC20 {
  constructor() ERC20('Mock UVBE', 'UVBE') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract UVBEReserveSecurityHardeningTest is Test {
  address public admin = address(0xAD);
  address public genesis = address(0x6E);
  address public attacker = address(0xBAD);
  address public alice = address(0xA1);
  address public bob = address(0xB0);

  MockHardeningToken public token;
  UVBERewardReserve public reserve;
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;

  function setUp() public {
    vm.startPrank(admin);
    token = new MockHardeningToken();
    reserve = new UVBERewardReserve(admin, address(token));
    vault = new UVBEStakingVault(admin, address(token));
    registry = new UVBEReferralRegistry(admin, genesis);
    distributor = new UVBERewardDistributor(admin, address(token));

    // One-time Permanent Module Wiring
    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(reserve), address(vault), address(registry));

    // Pre-fund Reward Reserve
    token.mint(admin, 1_000_000 * 1e18);
    token.approve(address(reserve), 200_000 * 1e18);
    reserve.depositRewardFunds(200_000 * 1e18);

    token.mint(alice, 10_000 * 1e18);
    token.mint(bob, 10_000 * 1e18);
    vm.stopPrank();

    vm.prank(alice);
    token.approve(address(vault), type(uint256).max);
    vm.prank(bob);
    token.approve(address(vault), type(uint256).max);
  }

  // --- 1. Direct Reserve Drain Attack Prevention ---

  function test_Revert_DirectUnauthorizedReserveDisburse() public {
    // Attacker attempts to call disburseReward directly on UVBERewardReserve
    vm.prank(attacker);
    vm.expectRevert(
      abi.encodeWithSelector(UVBERewardReserve.UnauthorizedDistributor.selector, attacker)
    );
    reserve.disburseReward(attacker, 50_000 * 1e18);

    // Attacker attempts to call transferToVault directly
    vm.prank(attacker);
    vm.expectRevert(
      abi.encodeWithSelector(UVBERewardReserve.UnauthorizedDistributor.selector, attacker)
    );
    reserve.transferToVault(attacker, 50_000 * 1e18);
  }

  // --- 2. Governance Distributor Replacement Attack Prevention (One-Time Freeze) ---

  function test_Revert_GovernanceCannotReplaceFrozenDistributor() public {
    address rogueDistributor = address(0x9999);

    // Even admin/governance cannot overwrite the one-time frozen distributor pointer
    vm.prank(admin);
    vm.expectRevert(UVBERewardReserve.ModuleAlreadyInitialized.selector);
    reserve.setDistributor(rogueDistributor);
  }

  function test_Revert_GovernanceCannotReplaceFrozenVaultModules() public {
    vm.prank(admin);
    vm.expectRevert(UVBEStakingVault.ModuleAlreadyInitialized.selector);
    vault.setModules(address(0x1), address(0x2));
  }

  function test_Revert_GovernanceCannotReplaceFrozenRegistryModules() public {
    vm.prank(admin);
    vm.expectRevert(UVBEReferralRegistry.ModuleAlreadyInitialized.selector);
    registry.setModules(address(0x1), address(0x2));
  }

  function test_Revert_GovernanceCannotReplaceFrozenDistributorModules() public {
    vm.prank(admin);
    vm.expectRevert(UVBERewardDistributor.ModuleAlreadyInitialized.selector);
    distributor.setModules(address(0x1), address(0x2), address(0x3));
  }

  // --- 3. Fabricated Claims / Excess Amount Attacks ---

  function test_Revert_FabricatedClaimWithoutAccruedReward() public {
    // Attacker has 0 accrued rewards and attempts to claim 1,000 UVBE
    vm.prank(attacker);
    vm.expectRevert(
      abi.encodeWithSelector(
        UVBERewardDistributor.InsufficientRewardBalance.selector,
        1_000 * 1e18,
        0
      )
    );
    distributor.claimRewards(1_000 * 1e18);
  }

  function test_Revert_ClaimExceedingAccruedLiability() public {
    // Alice stakes 500 UVBE gross (475 net), Bob stakes 1,000 UVBE gross (950 net) under Alice -> Alice gets 5% of 950 = 47.5 UVBE
    vm.prank(alice);
    vault.stake(500 * 1e18, genesis);

    vm.prank(bob);
    vault.stake(1_000 * 1e18, alice);

    uint256 expectedClaimable = (950 * 1e18 * 500) / 10_000; // 47.5 UVBE
    assertEq(distributor.getClaimableRewards(alice), expectedClaimable);

    // Alice attempts to claim 47.5 UVBE + 1 wei (exceeding her liability by 1 wei)
    vm.prank(alice);
    vm.expectRevert(
      abi.encodeWithSelector(
        UVBERewardDistributor.InsufficientRewardBalance.selector,
        expectedClaimable + 1,
        expectedClaimable
      )
    );
    distributor.claimRewards(expectedClaimable + 1);
  }

  // --- 4. Permanent Principal Lock Immunity ---

  function test_StakingVaultPrincipalCannotBeExtracted() public {
    uint256 grossStake = 5_000 * 1e18;
    uint256 expectedFee = (grossStake * 500) / 10_000; // 250 UVBE
    uint256 expectedNet = grossStake - expectedFee; // 4,750 UVBE

    vm.prank(alice);
    vault.stake(grossStake, genesis);

    assertEq(token.balanceOf(address(vault)), expectedNet);

    // No admin or user has any extraction method
    assertEq(vault.totalPermanentStaked(), expectedNet);
    assertEq(vault.getPermanentStake(alice), expectedNet);
  }
}
