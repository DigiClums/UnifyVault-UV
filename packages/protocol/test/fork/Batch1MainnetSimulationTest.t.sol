// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import { UnifyVaultTimelock } from '../../src/governance/UnifyVaultTimelock.sol';
import { UVBEStakingVault } from '../../src/staking/UVBEStakingVault.sol';
import { UVBEReferralRegistry } from '../../src/staking/UVBEReferralRegistry.sol';
import { UVBERewardDistributor } from '../../src/staking/UVBERewardDistributor.sol';
import { P2PReputation } from '../../src/reputation/P2PReputation.sol';
import { UnifyVaultPaymaster } from '../../src/aa/UnifyVaultPaymaster.sol';
import { GasTreasury } from '../../src/aa/GasTreasury.sol';

contract Batch1MainnetSimulationTest is Test {
  address constant GOV = 0x441dbf8076d0b143EC17199baE94Daa884161454;
  address constant UVBE_TOKEN = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address constant P2P_ESCROW_V2 = 0xa938aaCeA64bE8f41c90960aFF232dA4Df7Fc329;

  UnifyVaultTimelock public timelock;
  UVBEStakingVault public stakingVault;
  UVBEReferralRegistry public referralRegistry;
  UVBERewardDistributor public rewardDistributor;
  P2PReputation public p2pReputation;

  function test_SimulateBatch1Deployment() public {
    vm.startPrank(GOV);

    // 1. Deploy 48-hour Timelock
    address[] memory proposers = new address[](1);
    proposers[0] = GOV;
    address[] memory executors = new address[](1);
    executors[0] = address(0);
    timelock = new UnifyVaultTimelock(48 hours, proposers, executors, GOV);

    assertEq(timelock.getMinDelay(), 48 hours);
    assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), GOV));

    // 2. Deploy Staking Ecosystem
    stakingVault = new UVBEStakingVault(GOV, UVBE_TOKEN);
    referralRegistry = new UVBEReferralRegistry(GOV, GOV);
    rewardDistributor = new UVBERewardDistributor(GOV, UVBE_TOKEN);

    assertEq(stakingVault.token(), UVBE_TOKEN);
    assertEq(referralRegistry.genesisReferrer(), GOV);
    assertEq(rewardDistributor.token(), UVBE_TOKEN);

    // 3. Interlink Staking Modules
    stakingVault.setModules(address(referralRegistry), address(rewardDistributor));
    referralRegistry.setModules(address(stakingVault), address(rewardDistributor));
    rewardDistributor.setModules(address(stakingVault), address(referralRegistry));

    assertEq(stakingVault.registry(), address(referralRegistry));
    assertEq(stakingVault.distributor(), address(rewardDistributor));
    assertEq(referralRegistry.vault(), address(stakingVault));
    assertEq(referralRegistry.distributor(), address(rewardDistributor));
    assertEq(rewardDistributor.vault(), address(stakingVault));
    assertEq(rewardDistributor.registry(), address(referralRegistry));

    // 4. Deploy P2P Reputation Engine
    p2pReputation = new P2PReputation(P2P_ESCROW_V2);
    assertEq(p2pReputation.p2pEscrow(), P2P_ESCROW_V2);

    // 5. Deploy Account Abstraction Paymaster & Gas Treasury
    address canonicalEntryPointV07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    UnifyVaultPaymaster paymaster = new UnifyVaultPaymaster(
      canonicalEntryPointV07,
      GOV,
      address(0),
      0.05 ether
    );
    GasTreasury gasTreasury = new GasTreasury(GOV, GOV, address(paymaster), 0.5 ether, 2.0 ether);

    address USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address CONTROLLER = 0xe6Cd99f3DcF39BD76D91D211Dce7f4BdF801C366;
    paymaster.setApprovedTarget(USDC, true);
    paymaster.setApprovedTarget(CONTROLLER, true);
    paymaster.setApprovedTarget(UVBE_TOKEN, true);
    paymaster.setApprovedTarget(P2P_ESCROW_V2, true);

    assertEq(address(paymaster.entryPoint()), canonicalEntryPointV07);
    assertEq(gasTreasury.paymaster(), address(paymaster));
    assertTrue(paymaster.approvedTargets(USDC));
    assertTrue(paymaster.approvedTargets(CONTROLLER));

    vm.stopPrank();

    console.log('=== All Pending Contracts Simulation Passed on Live Base Mainnet State ===');
    console.log('Timelock:            ', address(timelock));
    console.log('UVBEStakingVault:    ', address(stakingVault));
    console.log('UVBEReferralRegistry:', address(referralRegistry));
    console.log('UVBERewardDistributor', address(rewardDistributor));
    console.log('P2PReputation:       ', address(p2pReputation));
    console.log('UnifyVaultPaymaster: ', address(paymaster));
    console.log('GasTreasury:         ', address(gasTreasury));
  }
}
