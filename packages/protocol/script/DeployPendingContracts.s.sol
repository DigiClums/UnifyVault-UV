// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import { UnifyVaultTimelock } from '../src/governance/UnifyVaultTimelock.sol';
import { UVBEStakingVault } from '../src/staking/UVBEStakingVault.sol';
import { UVBEReferralRegistry } from '../src/staking/UVBEReferralRegistry.sol';
import { UVBERewardDistributor } from '../src/staking/UVBERewardDistributor.sol';
import { P2PReputation } from '../src/reputation/P2PReputation.sol';
import { UnifyVaultPaymaster } from '../src/aa/UnifyVaultPaymaster.sol';
import { GasTreasury } from '../src/aa/GasTreasury.sol';

/**
 * @title DeployPendingContractsScript
 * @notice Master deployment script for deploying all pending UnifyVault modules to Base Mainnet
 */
contract DeployPendingContractsScript is Script {
  address constant GOV = 0x441dbf8076d0b143EC17199baE94Daa884161454;
  address constant UVBE_TOKEN = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address constant P2P_ESCROW_V2 = 0xa938aaCeA64bE8f41c90960aFF232dA4Df7Fc329;

  function run() external {
    vm.startBroadcast(GOV);

    console.log('=== 1. Deploying 48-Hour Governance Timelock ===');
    address[] memory proposers = new address[](1);
    proposers[0] = GOV;
    address[] memory executors = new address[](1);
    executors[0] = address(0); // Open execution after 48-hour delay
    UnifyVaultTimelock timelock = new UnifyVaultTimelock(48 hours, proposers, executors, GOV);
    console.log('UnifyVaultTimelock deployed at:', address(timelock));

    console.log('\n=== 2. Deploying Staking & Referral Ecosystem ===');
    UVBEStakingVault stakingVault = new UVBEStakingVault(GOV, UVBE_TOKEN);
    UVBEReferralRegistry referralRegistry = new UVBEReferralRegistry(GOV, GOV);
    UVBERewardDistributor rewardDistributor = new UVBERewardDistributor(GOV, UVBE_TOKEN);

    console.log('UVBEStakingVault deployed at:     ', address(stakingVault));
    console.log('UVBEReferralRegistry deployed at: ', address(referralRegistry));
    console.log('UVBERewardDistributor deployed at:', address(rewardDistributor));

    console.log('\n=== 3. Interlinking Staking Modules (setModules) ===');
    stakingVault.setModules(address(referralRegistry), address(rewardDistributor));
    referralRegistry.setModules(address(stakingVault), address(rewardDistributor));
    rewardDistributor.setModules(address(stakingVault), address(referralRegistry));
    console.log('Staking modules interlinked and frozen successfully!');

    console.log('\n=== 4. Deploying P2P Reputation Engine ===');
    P2PReputation p2pReputation = new P2PReputation(P2P_ESCROW_V2);
    console.log('P2PReputation deployed at:', address(p2pReputation));

    console.log('\n=== 5. Deploying Account Abstraction Paymaster & Gas Treasury ===');
    address canonicalEntryPointV07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    UnifyVaultPaymaster paymaster = new UnifyVaultPaymaster(
      canonicalEntryPointV07,
      GOV,
      address(0), // verifyingSigner: optional policy mode initially
      0.05 ether // maxCostPerUserOp
    );
    GasTreasury gasTreasury = new GasTreasury(
      GOV,
      GOV, // refillOperator
      address(paymaster),
      0.5 ether,
      2.0 ether
    );

    // Configure approved targets on Paymaster
    address USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address CONTROLLER = 0xe6Cd99f3DcF39BD76D91D211Dce7f4BdF801C366;
    paymaster.setApprovedTarget(USDC, true);
    paymaster.setApprovedTarget(CONTROLLER, true);
    paymaster.setApprovedTarget(UVBE_TOKEN, true);
    paymaster.setApprovedTarget(P2P_ESCROW_V2, true);

    console.log('UnifyVaultPaymaster deployed at:', address(paymaster));
    console.log('GasTreasury deployed at:        ', address(gasTreasury));

    vm.stopBroadcast();
  }
}
