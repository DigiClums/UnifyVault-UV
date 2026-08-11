// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { P2PEscrow } from '../src/escrow/P2PEscrow.sol';
import { ModuleIds } from '../src/constants/ModuleIds.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';

contract DeployP2PEscrowScript is Script {
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;
  address public constant BASE_SEPOLIA_TREASURY = 0x8Aa2e812D244b0C30D45035C3C843f4CdD02aCe6;

  function run() external returns (address escrowAddress) {
    vm.startBroadcast();

    address deployer = msg.sender;
    console2.log('=== P2P Escrow Base Sepolia Deployment ===');
    console2.log('Deployer address:', deployer);
    console2.log('ProtocolDirectory:', DIRECTORY);

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);
    address treasury =
      dir.exists(ModuleIds.TREASURY) ? dir.getAddress(ModuleIds.TREASURY) : BASE_SEPOLIA_TREASURY;

    uint256 feeBps = 10; // 0.10%

    console2.log('Treasury Address:', treasury);
    console2.log('Fee Bps:', feeBps);

    // 1. Deploy P2PEscrow
    P2PEscrow escrow = new P2PEscrow(treasury, feeBps);
    escrowAddress = address(escrow);
    console2.log('P2PEscrow deployed at:', escrowAddress);

    // 2. Grant ARBITRATOR_ROLE to deployer
    escrow.grantRole(AccessRoles.ARBITRATOR_ROLE, deployer);

    // 3. Register in ProtocolDirectory if deployer holds GOVERNANCE_ROLE
    if (dir.hasRole(AccessRoles.GOVERNANCE_ROLE, deployer)) {
      if (dir.exists(ModuleIds.P2P_ESCROW)) {
        dir.updateAddress(ModuleIds.P2P_ESCROW, escrowAddress);
        console2.log('Updated P2P_ESCROW in ProtocolDirectory');
      } else {
        dir.registerAddress(ModuleIds.P2P_ESCROW, escrowAddress);
        console2.log('Registered P2P_ESCROW in ProtocolDirectory');
      }
    } else {
      console2.log('Notice: Deployer does not hold GOVERNANCE_ROLE on ProtocolDirectory');
    }

    vm.stopBroadcast();
  }
}
