// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import {
  GovernanceMigrationHelper,
  MigrationConfig,
  TargetContract
} from './helpers/GovernanceMigrationHelper.sol';

/**
 * @title VerifyGovernanceScript
 * @notice Performs read-only verification of role assignments across all protocol contracts.
 *         Displays contract status, privileged roles, and PASS/FAIL metrics for New Admin,
 *         Old Admin, and Guardian addresses. Reverts if expected roles are missing.
 */
contract VerifyGovernanceScript is Script {
  function run() external view {
    MigrationConfig memory config = GovernanceMigrationHelper.loadConfig(address(vm));

    require(config.newAdmin != address(0), 'VerifyGovernance: Invalid newAdmin address');
    require(config.oldAdmin != address(0), 'VerifyGovernance: Invalid oldAdmin address');
    require(config.guardian != address(0), 'VerifyGovernance: Invalid guardian address');
    require(config.contracts.length > 0, 'VerifyGovernance: No contracts configured');

    console.log('==================================================');
    console.log('  UNIFYVAULT V2 - READ-ONLY GOVERNANCE AUDIT      ');
    console.log('==================================================');
    console.log('New Admin (Safe Multisig):', config.newAdmin);
    console.log('Old Admin (Deployer):     ', config.oldAdmin);
    console.log('Guardian Address:          ', config.guardian);
    console.log('--------------------------------------------------');

    bool allPassed = true;

    for (uint256 i = 0; i < config.contracts.length; i++) {
      TargetContract memory item = config.contracts[i];
      console.log('Contract Name:   ', item.name);
      console.log('Contract Address:', item.addr);

      // Check New Admin Roles
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

      // Check Guardian Roles
      bool guardianHasRole = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.GUARDIAN_ROLE,
        config.guardian
      );

      // Check Old Admin Roles
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

      bool newAdminPassed = newAdminHasDefaultAdmin && newAdminHasGovernance;
      bool guardianPassed = guardianHasRole;

      if (!newAdminPassed || !guardianPassed) {
        allPassed = false;
      }

      console.log('  [+] Role: DEFAULT_ADMIN_ROLE');
      console.log('      New Admin: ', newAdminHasDefaultAdmin ? 'PASS' : 'FAIL');
      console.log('      Old Admin: ', oldAdminHasDefaultAdmin ? 'ACTIVE' : 'RENOUNCED');

      console.log('  [+] Role: GOVERNANCE_ROLE');
      console.log('      New Admin: ', newAdminHasGovernance ? 'PASS' : 'FAIL');
      console.log('      Old Admin: ', oldAdminHasGovernance ? 'ACTIVE' : 'RENOUNCED');

      console.log('  [+] Role: GUARDIAN_ROLE');
      console.log('      Guardian:  ', guardianHasRole ? 'PASS' : 'FAIL');
      console.log('      Old Admin: ', oldAdminHasGuardian ? 'ACTIVE' : 'RENOUNCED');

      console.log('--------------------------------------------------');
    }

    if (!allPassed) {
      console.log('==================================================');
      console.log('  AUDIT FAILED: ONE OR MORE REQUIRED ROLES MISSING');
      console.log('==================================================');
      revert('Governance verification failed: missing expected roles');
    } else {
      console.log('==================================================');
      console.log('  AUDIT PASSED: ALL REQUIRED ROLES VERIFIED OK   ');
      console.log('==================================================');
    }
  }
}
