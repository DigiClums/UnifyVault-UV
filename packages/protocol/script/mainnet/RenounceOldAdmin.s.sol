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
 * @title RenounceOldAdminScript
 * @notice Broadcasts transactions to renounce administrative and governance roles
 *         from the old deployer key. Requires explicit confirmation flag and prior verification.
 */
contract RenounceOldAdminScript is Script {
  function run() external {
    MigrationConfig memory config = GovernanceMigrationHelper.loadConfig(address(vm));

    require(
      config.confirmRenounce,
      'RenounceOldAdmin: confirmRenounce flag must be set to true in config or env'
    );
    require(config.oldAdmin != address(0), 'RenounceOldAdmin: Invalid oldAdmin address');
    require(config.newAdmin != address(0), 'RenounceOldAdmin: Invalid newAdmin address');
    require(config.contracts.length > 0, 'RenounceOldAdmin: No contracts configured');

    console.log('==================================================');
    console.log('  UNIFYVAULT V2 - RENOUNCE OLD ADMIN ROLES       ');
    console.log('==================================================');
    console.log('Old Admin (Deployer):     ', config.oldAdmin);
    console.log('New Admin (Safe Multisig):', config.newAdmin);
    console.log('Confirmation Flag Status:   CONFIRMED');
    console.log('--------------------------------------------------');

    // Pre-renounce Verification: Ensure newAdmin has required roles first
    for (uint256 i = 0; i < config.contracts.length; i++) {
      TargetContract memory item = config.contracts[i];
      bool newAdminHasDefaultAdmin = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
        config.newAdmin
      );
      bool newAdminHasGovernance = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.GOVERNANCE_ROLE,
        config.newAdmin
      );

      require(
        newAdminHasDefaultAdmin && newAdminHasGovernance,
        string.concat('Pre-renounce check failed: New admin missing roles on ', item.name)
      );
    }

    vm.startBroadcast(config.oldAdmin);

    for (uint256 i = 0; i < config.contracts.length; i++) {
      TargetContract memory item = config.contracts[i];
      console.log('Processing contract:       ', item.name);
      console.log('Contract Address:          ', item.addr);

      IAccessControl target = IAccessControl(item.addr);

      // Renounce DEFAULT_ADMIN_ROLE if held
      if (
        GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
          config.oldAdmin
        )
      ) {
        try target.renounceRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, config.oldAdmin) {
          console.log('  [-] Renounced: DEFAULT_ADMIN_ROLE');
        } catch {
          console.log('  [!] Renounce skipped/failed: DEFAULT_ADMIN_ROLE');
        }
      }

      // Renounce GOVERNANCE_ROLE if held
      if (
        GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.GOVERNANCE_ROLE,
          config.oldAdmin
        )
      ) {
        try target.renounceRole(GovernanceMigrationHelper.GOVERNANCE_ROLE, config.oldAdmin) {
          console.log('  [-] Renounced: GOVERNANCE_ROLE');
        } catch {
          console.log('  [!] Renounce skipped/failed: GOVERNANCE_ROLE');
        }
      }

      // Renounce GUARDIAN_ROLE if held
      if (
        GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.GUARDIAN_ROLE,
          config.oldAdmin
        )
      ) {
        try target.renounceRole(GovernanceMigrationHelper.GUARDIAN_ROLE, config.oldAdmin) {
          console.log('  [-] Renounced: GUARDIAN_ROLE');
        } catch {
          console.log('  [!] Renounce skipped/failed: GUARDIAN_ROLE');
        }
      }

      // Renounce CONTROLLER_ROLE if held
      if (
        GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.CONTROLLER_ROLE,
          config.oldAdmin
        )
      ) {
        try target.renounceRole(GovernanceMigrationHelper.CONTROLLER_ROLE, config.oldAdmin) {
          console.log('  [-] Renounced: CONTROLLER_ROLE');
        } catch {
          console.log('  [!] Renounce skipped/failed: CONTROLLER_ROLE');
        }
      }

      // Renounce BOT_ROLE if held
      if (
        GovernanceMigrationHelper.checkRole(
          item.addr,
          GovernanceMigrationHelper.BOT_ROLE,
          config.oldAdmin
        )
      ) {
        try target.renounceRole(GovernanceMigrationHelper.BOT_ROLE, config.oldAdmin) {
          console.log('  [-] Renounced: BOT_ROLE');
        } catch {
          console.log('  [!] Renounce skipped/failed: BOT_ROLE');
        }
      }

      // Verify old admin has no privileged roles remaining
      bool oldAdminHasDefaultAdmin = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
        config.oldAdmin
      );
      bool oldAdminHasGovernance = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.GOVERNANCE_ROLE,
        config.oldAdmin
      );
      bool oldAdminHasGuardian = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.GUARDIAN_ROLE,
        config.oldAdmin
      );
      bool oldAdminHasController = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.CONTROLLER_ROLE,
        config.oldAdmin
      );
      bool oldAdminHasBot = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.BOT_ROLE,
        config.oldAdmin
      );

      require(
        !oldAdminHasDefaultAdmin,
        string.concat(
          'Post-renounce check failed: oldAdmin still holds DEFAULT_ADMIN_ROLE on ',
          item.name
        )
      );
      require(
        !oldAdminHasGovernance,
        string.concat(
          'Post-renounce check failed: oldAdmin still holds GOVERNANCE_ROLE on ',
          item.name
        )
      );
      require(
        !oldAdminHasGuardian,
        string.concat(
          'Post-renounce check failed: oldAdmin still holds GUARDIAN_ROLE on ',
          item.name
        )
      );
      require(
        !oldAdminHasController,
        string.concat(
          'Post-renounce check failed: oldAdmin still holds CONTROLLER_ROLE on ',
          item.name
        )
      );
      require(
        !oldAdminHasBot,
        string.concat('Post-renounce check failed: oldAdmin still holds BOT_ROLE on ', item.name)
      );

      console.log('  [v] Post-Renounce Verification Passed for ', item.name);
      console.log('--------------------------------------------------');
    }

    vm.stopBroadcast();

    console.log('==================================================');
    console.log('  SUCCESS: OLD ADMIN ROLES RENOUNCED & MIGRATION COMPLETE');
    console.log('==================================================');
  }
}
