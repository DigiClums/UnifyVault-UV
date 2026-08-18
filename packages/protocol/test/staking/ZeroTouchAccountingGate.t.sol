// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/interfaces/IUVBEStakingMLM.sol';
import '../../src/staking/UVBERewardReserve.sol';
import '../../src/staking/UVBEStakingVault.sol';
import '../../src/staking/UVBEReferralRegistry.sol';
import '../../src/staking/UVBERewardDistributor.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/constants/ModuleIds.sol';

contract ZeroTouchAccountingGateTest is Test {
  address public admin = address(0xAD);
  address public genesis = address(0x6E);
  address public controller = address(0xCC);
  address public alice = address(0xA1);
  address public bob = address(0xB0);

  ProtocolDirectory public directory;
  UVBEV2 public uvbe;
  CostBasisManagerV2 public cbm;

  UVBERewardReserve public reserve;
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;

  function setUp() public {
    vm.startPrank(admin);

    // 1. Core Architecture Setup
    directory = new ProtocolDirectory();
    uvbe = new UVBEV2(admin);
    cbm = new CostBasisManagerV2(admin, address(directory));

    // Configure UVBE with CostBasisManagerV2
    uvbe.setCostBasisManager(address(cbm));
    cbm.setModules(address(0x999), address(uvbe));

    // Register modules
    directory.registerAddress(ModuleIds.TOKEN, address(uvbe));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(cbm));

    // 2. MLM Subsystem Setup
    reserve = new UVBERewardReserve(admin, address(uvbe));
    vault = new UVBEStakingVault(admin, address(uvbe));
    registry = new UVBEReferralRegistry(admin, genesis);
    distributor = new UVBERewardDistributor(admin, address(uvbe));

    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(reserve), address(vault), address(registry));

    // Grant controller role on UVBE to mock controller to simulate initial mints
    uvbe.grantRole(keccak256('CONTROLLER_ROLE'), controller);
    cbm.grantRole(keccak256('CONTROLLER_ROLE'), controller);

    vm.stopPrank();

    // 3. Simulate Initial Collateral Deposits via Controller
    vm.startPrank(controller);
    // Mint 100,000 UVBE for RewardReserve pre-funding ($100,000 cost basis)
    uvbe.mint(admin, 100_000 * 1e18);
    cbm.recordDeposit(admin, 100_000 * 1e18, 100_000 * 1e18);

    // Mint 10,000 UVBE for Alice ($10,000 cost basis)
    uvbe.mint(alice, 10_000 * 1e18);
    cbm.recordDeposit(alice, 10_000 * 1e18, 10_000 * 1e18);

    // Mint 10,000 UVBE for Bob ($10,000 cost basis)
    uvbe.mint(bob, 10_000 * 1e18);
    cbm.recordDeposit(bob, 10_000 * 1e18, 10_000 * 1e18);
    vm.stopPrank();

    // 4. Admin deposits 100,000 already-minted UVBE into Reward Reserve
    vm.startPrank(admin);
    uvbe.approve(address(reserve), 100_000 * 1e18);
    reserve.depositRewardFunds(100_000 * 1e18);
    vm.stopPrank();

    // Users approve vault
    vm.prank(alice);
    uvbe.approve(address(vault), type(uint256).max);
    vm.prank(bob);
    uvbe.approve(address(vault), type(uint256).max);
  }

  function test_ZeroTouch_TotalSupplyInvariant() public {
    uint256 initialTotalSupply = uvbe.totalSupply();
    assertEq(initialTotalSupply, 120_000 * 1e18);

    // 1. Alice stakes 2,000 UVBE
    vm.prank(alice);
    vault.stake(2_000 * 1e18, genesis);

    // 2. Bob stakes 5,000 UVBE under Alice
    vm.prank(bob);
    vault.stake(5_000 * 1e18, alice);

    // 3. Alice restakes her earned rewards (250 UVBE) into permanent principal
    uint256 aliceClaimable = distributor.getClaimableRewards(alice);
    assertEq(aliceClaimable, 250 * 1e18);

    vm.prank(alice);
    distributor.restakeAllRewards();

    assertEq(distributor.getClaimableRewards(alice), 0);
    assertEq(vault.getPermanentStake(alice), 2_250 * 1e18);

    // CRITICAL INVARIANT: Total Supply must be 100.000% unchanged
    assertEq(
      uvbe.totalSupply(),
      initialTotalSupply,
      'CRITICAL INVARIANT VIOLATION: UVBE totalSupply must never change during staking or claims'
    );
  }

  function test_ZeroTouch_CostBasisConservation() public {
    // Total system cost basis initially across reserve, alice, and bob = $120,000
    uint256 initialSumBasis =
      cbm.costBasis(address(reserve)) + cbm.costBasis(alice) + cbm.costBasis(bob);
    assertEq(initialSumBasis, 120_000 * 1e18);

    // Alice stakes 2,000 UVBE
    vm.prank(alice);
    vault.stake(2_000 * 1e18, genesis);

    // Bob stakes 5,000 UVBE
    vm.prank(bob);
    vault.stake(5_000 * 1e18, alice);

    // Alice claims rewards (250 UVBE)
    vm.prank(alice);
    distributor.claimAllRewards();

    // Sum of cost basis across all system addresses (including staking vault and reserve)
    uint256 currentSumBasis =
      cbm.costBasis(alice) +
        cbm.costBasis(bob) +
        cbm.costBasis(address(reserve)) +
        cbm.costBasis(address(vault));

    assertEq(
      currentSumBasis,
      initialSumBasis,
      'CRITICAL INVARIANT VIOLATION: Total cost basis must be mathematically conserved'
    );
  }

  function test_ZeroTouch_LiquidRedemptionAndP2PIsolation() public {
    // Alice has 10,000 UVBE initially. She stakes 2,000 UVBE.
    vm.prank(alice);
    vault.stake(2_000 * 1e18, genesis);

    // Alice's liquid wallet balance is now 8,000 UVBE
    assertEq(uvbe.balanceOf(alice), 8_000 * 1e18);

    // Alice can perform normal liquid wallet transfer of 1,000 UVBE to Bob without interference
    vm.prank(alice);
    uvbe.transfer(bob, 1_000 * 1e18);

    assertEq(uvbe.balanceOf(alice), 7_000 * 1e18);
    assertEq(uvbe.balanceOf(bob), 11_000 * 1e18);

    // Staked principal remains locked in vault
    assertEq(vault.getPermanentStake(alice), 2_000 * 1e18);
  }
}
