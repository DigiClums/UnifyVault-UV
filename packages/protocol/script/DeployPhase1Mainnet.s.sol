// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { UVBEStakingVault } from '../src/staking/UVBEStakingVault.sol';
import { UVBEReferralRegistry } from '../src/staking/UVBEReferralRegistry.sol';
import { UVBERewardDistributor } from '../src/staking/UVBERewardDistributor.sol';

contract DeployPhase1MainnetScript is Script {
  address constant MAINNET_UVBE = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address constant DEPLOYER = 0x441dbf8076d0b143EC17199baE94Daa884161454;

  function run() external {
    console.log('Simulating Phase 1 Deploy on Base Mainnet...');
    vm.startBroadcast(DEPLOYER);

    UVBEStakingVault vault = new UVBEStakingVault(DEPLOYER, MAINNET_UVBE);
    UVBEReferralRegistry registry = new UVBEReferralRegistry(DEPLOYER, DEPLOYER);
    UVBERewardDistributor distributor = new UVBERewardDistributor(DEPLOYER, MAINNET_UVBE);

    console.log('Simulated Vault:      ', address(vault));
    console.log('Simulated Registry:   ', address(registry));
    console.log('Simulated Distributor:', address(distributor));

    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(vault), address(registry));

    vm.stopBroadcast();
    console.log('Phase 1 simulation completed successfully!');
  }
}
