// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { IAccessControl } from '@openzeppelin/contracts/access/IAccessControl.sol';
import {
  GovernanceMigrationHelper,
  MigrationConfig,
  TargetContract
} from './helpers/GovernanceMigrationHelper.sol';

/**
 * @title GrantAdminRolesScript
 * @notice Broadcasts transactions to grant DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, and GUARDIAN_ROLE
 *         to designated new admin and guardian addresses across all protocol contracts.
 */
contract GrantAdminRolesScript is Script {
  function run() external {
    MigrationConfig memory config = GovernanceMigrationHelper.loadConfig(address(vm));

    require(config.newAdmin != address(0), 'GrantAdminRoles: Invalid newAdmin address');
    require(config.guardian != address(0), 'GrantAdminRoles: Invalid guardian address');
    require(config.contracts.length > 0, 'GrantAdminRoles: No contracts configured');

    console.log('==================================================');
    console.log('  UNIFYVAULT V2 - GRANT GOVERNANCE ROLES          ');
    console.log('==================================================');
    console.log('New Admin (Safe Multisig):', config.newAdmin);
    console.log('Guardian Address:          ', config.guardian);
    console.log('Configured Contracts Count:', config.contracts.length);
    console.log('--------------------------------------------------');

    vm.startBroadcast();

    for (uint256 i = 0; i < config.contracts.length; i++) {
      TargetContract memory item = config.contracts[i];
      console.log('Processing contract:       ', item.name);
      console.log('Contract Address:          ', item.addr);

      IAccessControl target = IAccessControl(item.addr);

      // 1. Grant DEFAULT_ADMIN_ROLE to newAdmin
      if (
        !GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
          config.newAdmin
        )
      ) {
        target.grantRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, config.newAdmin);
      }
      require(
        GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
          config.newAdmin
        ),
        string.concat('Verification failed: DEFAULT_ADMIN_ROLE grant on ', item.name)
      );
      console.log('  [+] Granted & Verified: DEFAULT_ADMIN_ROLE -> New Admin');

      // 2. Grant GOVERNANCE_ROLE to newAdmin
      if (
        !GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.GOVERNANCE_ROLE,
          config.newAdmin
        )
      ) {
        target.grantRole(GovernanceMigrationHelper.GOVERNANCE_ROLE, config.newAdmin);
      }
      require(
        GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.GOVERNANCE_ROLE,
          config.newAdmin
        ),
        string.concat('Verification failed: GOVERNANCE_ROLE grant on ', item.name)
      );
      console.log('  [+] Granted & Verified: GOVERNANCE_ROLE -> New Admin');

      // 3. Grant GUARDIAN_ROLE to guardian
      if (
        !GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.GUARDIAN_ROLE,
          config.guardian
        )
      ) {
        target.grantRole(GovernanceMigrationHelper.GUARDIAN_ROLE, config.guardian);
      }
      require(
        GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.GUARDIAN_ROLE,
          config.guardian
        ),
        string.concat('Verification failed: GUARDIAN_ROLE grant on ', item.name)
      );
      console.log('  [+] Granted & Verified: GUARDIAN_ROLE -> Guardian');
      console.log('--------------------------------------------------');
    }

    vm.stopBroadcast();

    console.log('==================================================');
    console.log('  SUCCESS: ALL GOVERNANCE ROLES GRANTED & VERIFIED');
    console.log('==================================================');
  }
}
