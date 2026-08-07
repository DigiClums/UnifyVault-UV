// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/constants/ModuleIds.sol';

contract RegisterCostBasisAndPerformanceScript is Script {
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;
  address public constant COST_BASIS_MANAGER = 0xef0637A3D2080749BbcD5D98e6C68D9944C700A6;

  function run() external {
    vm.startBroadcast();

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);

    console.log('=== REGISTERING COST_BASIS_MANAGER & PERFORMANCE_MANAGER IN PROTOCOL DIRECTORY ===');
    _registerOrUpdate(dir, ModuleIds.COST_BASIS_MANAGER, COST_BASIS_MANAGER);
    _registerOrUpdate(dir, ModuleIds.PERFORMANCE_MANAGER, COST_BASIS_MANAGER);

    vm.stopBroadcast();

    console.log('[SUCCESS] COST_BASIS_MANAGER and PERFORMANCE_MANAGER registered in ProtocolDirectory!');
  }

  function _registerOrUpdate(ProtocolDirectory dir, bytes32 id, address target) internal {
    if (dir.exists(id)) {
      if (dir.getAddress(id) != target) {
        dir.updateAddress(id, target);
      }
    } else {
      dir.registerAddress(id, target);
    }
  }
}
