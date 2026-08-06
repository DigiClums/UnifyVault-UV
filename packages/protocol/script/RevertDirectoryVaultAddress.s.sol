// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/constants/ModuleIds.sol';

contract RevertDirectoryVaultAddressScript is Script {
  address public constant DIRECTORY = 0xB5dd6d766867cB4c299AD2711068455C718EDDbc;
  address public constant OLD_VAULT = 0x54696d5d00b58F27F9d8C358560ff2a7d10d409e;

  function run() external {
    vm.startBroadcast();

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);
    dir.updateAddress(ModuleIds.VAULT, OLD_VAULT);
    console.log('ProtocolDirectory ModuleIds.VAULT reverted back to:', OLD_VAULT);

    vm.stopBroadcast();
  }
}
