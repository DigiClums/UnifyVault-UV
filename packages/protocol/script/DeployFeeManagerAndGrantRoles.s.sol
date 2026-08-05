// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/treasury/FeeManager.sol';
import '../src/constants/ModuleIds.sol';
import '../src/libraries/AccessRoles.sol';

contract DeployFeeManagerAndGrantRolesScript is Script {
  address public constant DIRECTORY = 0xB5dd6d766867cB4c299AD2711068455C718EDDbc;
  address public constant TREASURY = 0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D;
  address public constant TARGET_ADMIN = 0xd905920c91853039060246Ed5724AA72B91a96DA;

  function run() external {
    vm.startBroadcast();

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);

    // 1. Grant GOVERNANCE_ROLE to 0xd905...96DA on ProtocolDirectory
    if (!dir.hasRole(AccessRoles.GOVERNANCE_ROLE, TARGET_ADMIN)) {
      dir.grantRole(AccessRoles.GOVERNANCE_ROLE, TARGET_ADMIN);
      console.log('Granted GOVERNANCE_ROLE to:', TARGET_ADMIN);
    }

    // 2. Deploy FeeManager
    FeeManager feeManager = new FeeManager(TREASURY);
    console.log('Deployed FeeManager at:', address(feeManager));

    // 3. Register FeeManager in ProtocolDirectory
    if (dir.exists(ModuleIds.FEE_MANAGER)) {
      dir.updateAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    } else {
      dir.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    }

    vm.stopBroadcast();

    // 4. Verification Assertions
    require(dir.hasRole(AccessRoles.GOVERNANCE_ROLE, TARGET_ADMIN), 'Role Grant Failed');
    require(dir.exists(ModuleIds.FEE_MANAGER), 'Registration Failed: exists');
    require(
      dir.getAddress(ModuleIds.FEE_MANAGER) == address(feeManager),
      'Registration Failed: getAddress'
    );

    console.log('=== VERIFICATION SUCCESSFUL ===');
    console.log('FeeManager Address:                   ', address(feeManager));
    console.log('ProtocolDirectory Registered FeeManager:', dir.getAddress(ModuleIds.FEE_MANAGER));
    console.log(
      'Target Admin GOVERNANCE_ROLE Status:   ',
      dir.hasRole(AccessRoles.GOVERNANCE_ROLE, TARGET_ADMIN)
    );
  }
}
