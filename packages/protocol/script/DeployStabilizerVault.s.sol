// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { StabilizerVault } from '../src/stabilizer/StabilizerVault.sol';

contract DeployStabilizerVaultScript is Script {
  address constant GOV = 0x441dbf8076d0b143EC17199baE94Daa884161454;
  address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
  address constant UVBE = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address constant PORTFOLIO_MANAGER = 0x66182F56BD5E523c655f6890290aB519f528e83f;
  address constant ORACLE_MANAGER = 0x91B488cdE0f2Ef28141FE4ffD8531c4179B48EA7;
  address constant CONTROLLER = 0xe6Cd99f3DcF39BD76D91D211Dce7f4BdF801C366;
  address constant UNISWAP_V4_POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;

  function run() external {
    vm.startBroadcast(GOV);

    console.log('=== Deploying StabilizerVault ===');
    StabilizerVault vault = new StabilizerVault(
      GOV,
      USDC,
      UVBE,
      PORTFOLIO_MANAGER,
      ORACLE_MANAGER,
      CONTROLLER,
      UNISWAP_V4_POOL_MANAGER,
      75, // 0.0075% fee
      1, // tickSpacing = 1
      address(0) // hooks
    );

    console.log('StabilizerVault deployed at:', address(vault));

    vm.stopBroadcast();
  }
}
