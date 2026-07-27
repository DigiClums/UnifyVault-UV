// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/vault/CostBasisManager.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';

contract DeployCostBasisManagerScript is Script {
  // Canonical Base Sepolia ProtocolDirectory address
  address public constant PROTOCOL_DIRECTORY = 0xDd29e54f91b86f3e4609AA2e279e04E98dcAb722;

  function run() external {
    vm.startBroadcast();

    address deployer = msg.sender;

    console.log('=== DEPLOYING COST_BASIS_MANAGER TO BASE SEPOLIA ===');
    console.log('Deployer:', deployer);
    console.log('ProtocolDirectory:', PROTOCOL_DIRECTORY);

    ProtocolDirectory directory = ProtocolDirectory(PROTOCOL_DIRECTORY);

    // 1. Get live UnifyVaultController address from ProtocolDirectory
    address controllerAddress = directory.getAddress(ModuleIds.DEPOSIT_MANAGER);
    console.log('Live UnifyVaultController Address:', controllerAddress);

    // 2. Deploy fresh CostBasisManager instance
    CostBasisManager costBasisManager = new CostBasisManager(deployer);
    console.log('Deployed CostBasisManager Address:', address(costBasisManager));

    // 3. Grant CONTROLLER_ROLE to UnifyVaultController
    costBasisManager.grantRole(AccessRoles.CONTROLLER_ROLE, controllerAddress);
    console.log('Granted CONTROLLER_ROLE to UnifyVaultController');

    // 4. Register CostBasisManager in ProtocolDirectory
    if (directory.exists(ModuleIds.COST_BASIS_MANAGER)) {
      directory.updateAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisManager));
      console.log('Updated CostBasisManager in ProtocolDirectory');
    } else {
      directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisManager));
      console.log('Registered CostBasisManager in ProtocolDirectory');
    }

    vm.stopBroadcast();

    // 5. Verification checks
    require(
      directory.getAddress(ModuleIds.COST_BASIS_MANAGER) == address(costBasisManager),
      'Directory registration failed'
    );
    require(
      costBasisManager.hasRole(AccessRoles.CONTROLLER_ROLE, controllerAddress),
      'Role grant verification failed'
    );

    console.log('[SUCCESS] CostBasisManager deployed and registered successfully!');
  }
}
