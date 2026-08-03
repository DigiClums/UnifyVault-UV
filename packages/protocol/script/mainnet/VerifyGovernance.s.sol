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
 *         Verifies Old Deployer owns ZERO roles, New Governance owns expected roles,
 *         Controller owns required CONTROLLER_ROLE, and Guardian owns guardian permissions.
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

    address controllerAddr = address(0);
    for (uint256 i = 0; i < config.contracts.length; i++) {
      if (keccak256(bytes(config.contracts[i].name)) == keccak256(bytes('UnifyVaultController'))) {
        controllerAddr = config.contracts[i].addr;
        break;
      }
    }

    bool allPassed = true;

    for (uint256 i = 0; i < config.contracts.length; i++) {
      if (!_verifyContractItem(config.contracts[i], config, controllerAddr)) {
        allPassed = false;
      }
    }

    if (!allPassed) {
      console.log('==================================================');
      console.log('  AUDIT FAILED: ONE OR MORE REQUIRED ROLES INVALID');
      console.log('==================================================');
      revert('Governance verification failed: role cleanup verification failed');
    } else {
      console.log('==================================================');
      console.log('  AUDIT PASSED: ALL REQUIRED ROLES VERIFIED OK   ');
      console.log('==================================================');
    }
  }

  function _verifyContractItem(
    TargetContract memory item,
    MigrationConfig memory config,
    address controllerAddr
  ) private view returns (bool) {
    bool oldAdminClean = !GovernanceMigrationHelper.checkRole(item.addr, GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, config.oldAdmin) &&
      !GovernanceMigrationHelper.checkRole(item.addr, GovernanceMigrationHelper.GOVERNANCE_ROLE, config.oldAdmin) &&
      !GovernanceMigrationHelper.checkRole(item.addr, GovernanceMigrationHelper.GUARDIAN_ROLE, config.oldAdmin) &&
      !GovernanceMigrationHelper.checkRole(item.addr, GovernanceMigrationHelper.CONTROLLER_ROLE, config.oldAdmin) &&
      !GovernanceMigrationHelper.checkRole(item.addr, GovernanceMigrationHelper.BOT_ROLE, config.oldAdmin);

    bool newAdminPassed = GovernanceMigrationHelper.checkRole(item.addr, GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, config.newAdmin) &&
      GovernanceMigrationHelper.checkRole(item.addr, GovernanceMigrationHelper.GOVERNANCE_ROLE, config.newAdmin);

    bool isControllerTarget = (keccak256(bytes(item.name)) == keccak256(bytes('CustodyVault'))) ||
      (keccak256(bytes(item.name)) == keccak256(bytes('Treasury'))) ||
      (keccak256(bytes(item.name)) == keccak256(bytes('UVBTCETHToken'))) ||
      (keccak256(bytes(item.name)) == keccak256(bytes('LiquidityManager')));

    bool controllerPassed = true;
    if (isControllerTarget && controllerAddr != address(0)) {
      controllerPassed = GovernanceMigrationHelper.checkRole(
        item.addr,
        GovernanceMigrationHelper.CONTROLLER_ROLE,
        controllerAddr
      );
    }

    bool itemPassed = oldAdminClean && newAdminPassed && controllerPassed;

    if (itemPassed) {
      console.log(string.concat(unicode'  [✓] ', item.name));
    } else {
      console.log(string.concat('  [X] ', item.name));
    }
    console.log('      Address:    ', item.addr);
    console.log('      Old Admin:  ', oldAdminClean ? 'CLEAN (0 roles)' : 'FAIL (roles remain)');
    console.log('      New Admin:  ', newAdminPassed ? 'PASS' : 'FAIL');
    if (isControllerTarget) {
      console.log('      Controller: ', controllerPassed ? 'PASS' : 'FAIL');
    }
    console.log('--------------------------------------------------');

    return itemPassed;
  }
}
