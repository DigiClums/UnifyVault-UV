// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { IAccessControl } from '@openzeppelin/contracts/access/IAccessControl.sol';
import {
  GovernanceMigrationHelper,
  MigrationConfig,
  TargetContract
} from './mainnet/helpers/GovernanceMigrationHelper.sol';

/**
 * @title MigrateGovernanceScript
 * @notice Production governance migration script for UnifyVault V2 Timelock.
 * @dev Grants roles to UnifyVaultTimelock, verifies compliance, and generates un-broadcasted renounce calldata.
 */
contract MigrateGovernanceScript is Script {
  bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
  bytes32 public constant GOVERNANCE_ROLE = keccak256('GOVERNANCE_ROLE');
  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');

  function simulate() external {
    run();
  }

  function run() public {
    MigrationConfig memory config = GovernanceMigrationHelper.loadConfig(address(vm));

    require(config.newAdmin != address(0), 'MigrateGovernance: Invalid newAdmin address');
    require(config.oldAdmin != address(0), 'MigrateGovernance: Invalid oldAdmin address');
    require(config.contracts.length > 0, 'MigrateGovernance: No contracts configured');

    console.log('===========================================================');
    console.log('UNIFYVAULT PRODUCTION TIMELOCK GOVERNANCE MIGRATION & VERIFICATION');
    console.log('Target Timelock Admin Wallet:', config.newAdmin);
    console.log('Old Deployer Admin Target    :', config.oldAdmin);
    console.log('===========================================================');

    // ----------------------------------------------------
    // STAGE 1: Grant Missing Roles (Idempotent with Hard Post-Grant Assertion)
    // ----------------------------------------------------
    console.log('\n--- STAGE 1: Idempotent Role Grant Execution & Summary ---');
    for (uint256 i = 0; i < config.contracts.length; i++) {
      TargetContract memory item = config.contracts[i];
      if (item.addr == address(0) || item.addr.code.length == 0) continue;
      IAccessControl ac = IAccessControl(item.addr);

      console.log('\nContract:', item.name, item.addr);

      // 1. DEFAULT_ADMIN_ROLE Check & Grant
      if (!ac.hasRole(DEFAULT_ADMIN_ROLE, config.newAdmin)) {
        console.log('  DEFAULT_ADMIN_ROLE: [GRANT] Missing. Broadcasting grantRole...');
        vm.startBroadcast(config.oldAdmin);
        try ac.grantRole(DEFAULT_ADMIN_ROLE, config.newAdmin) {
          console.log('    [+] Executed grantRole(DEFAULT_ADMIN_ROLE)');
        } catch {
          console.log('    [-] grantRole(DEFAULT_ADMIN_ROLE) broadcast skipped/reverted');
        }
        vm.stopBroadcast();

        // Hard Assertion Post-Grant
        require(
          ac.hasRole(DEFAULT_ADMIN_ROLE, config.newAdmin),
          string.concat(
            'CRITICAL: Post-grant verification failed for DEFAULT_ADMIN_ROLE on ',
            item.name
          )
        );
      } else {
        console.log('  DEFAULT_ADMIN_ROLE: [SKIP] Already granted.');
      }

      // 2. GOVERNANCE_ROLE Check & Grant
      if (!ac.hasRole(GOVERNANCE_ROLE, config.newAdmin)) {
        console.log('  GOVERNANCE_ROLE   : [GRANT] Missing. Broadcasting grantRole...');
        vm.startBroadcast(config.oldAdmin);
        try ac.grantRole(GOVERNANCE_ROLE, config.newAdmin) {
          console.log('    [+] Executed grantRole(GOVERNANCE_ROLE)');
        } catch {
          console.log('    [-] grantRole(GOVERNANCE_ROLE) broadcast skipped/reverted');
        }
        vm.stopBroadcast();

        // Hard Assertion Post-Grant
        require(
          ac.hasRole(GOVERNANCE_ROLE, config.newAdmin),
          string.concat(
            'CRITICAL: Post-grant verification failed for GOVERNANCE_ROLE on ',
            item.name
          )
        );
      } else {
        console.log('  GOVERNANCE_ROLE   : [SKIP] Already granted.');
      }

      // 3. GUARDIAN_ROLE Check & Grant (if applicable)
      if (
        GovernanceMigrationHelper.checkRole(item.addr, GUARDIAN_ROLE, config.oldAdmin) ||
        GovernanceMigrationHelper.checkRole(item.addr, GUARDIAN_ROLE, config.newAdmin) ||
        (config.guardian != address(0) &&
          GovernanceMigrationHelper.checkRole(item.addr, GUARDIAN_ROLE, config.guardian))
      ) {
        address guardianTarget = config.guardian != address(0) ? config.guardian : config.newAdmin;
        if (!ac.hasRole(GUARDIAN_ROLE, guardianTarget)) {
          console.log('  GUARDIAN_ROLE     : [GRANT] Missing. Broadcasting grantRole...');
          vm.startBroadcast(config.oldAdmin);
          try ac.grantRole(GUARDIAN_ROLE, guardianTarget) {
            console.log('    [+] Executed grantRole(GUARDIAN_ROLE)');
          } catch {
            console.log('    [-] grantRole(GUARDIAN_ROLE) broadcast skipped/reverted');
          }
          vm.stopBroadcast();

          // Hard Assertion Post-Grant
          require(
            ac.hasRole(GUARDIAN_ROLE, guardianTarget),
            string.concat(
              'CRITICAL: Post-grant verification failed for GUARDIAN_ROLE on ',
              item.name
            )
          );
        } else {
          console.log('  GUARDIAN_ROLE     : [SKIP] Already granted.');
        }
      } else {
        console.log('  GUARDIAN_ROLE     : [N/A] Not applicable for this contract.');
      }
    }

    // ----------------------------------------------------
    // STAGE 2: On-Chain Role Matrix & Hard Verification
    // ----------------------------------------------------
    console.log('\n==================================================================');
    console.log('FINAL VERIFIED ON-CHAIN ROLE MATRIX');
    console.log('==================================================================');
    console.log('Contract                     DEFAULT_ADMIN   GOVERNANCE   GUARDIAN');
    console.log('------------------------------------------------------------------');

    bool allVerified = true;

    for (uint256 i = 0; i < config.contracts.length; i++) {
      TargetContract memory item = config.contracts[i];
      if (item.addr == address(0) || item.addr.code.length == 0) continue;
      IAccessControl ac = IAccessControl(item.addr);

      bool hasAdmin = ac.hasRole(DEFAULT_ADMIN_ROLE, config.newAdmin);
      bool hasGov = ac.hasRole(GOVERNANCE_ROLE, config.newAdmin);
      address guardianTarget = config.guardian != address(0) ? config.guardian : config.newAdmin;
      bool hasGuard = ac.hasRole(GUARDIAN_ROLE, guardianTarget);

      string memory adminMark = hasAdmin ? '      YES     ' : '      NO      ';
      string memory govMark = hasGov ? '    YES   ' : '    NO    ';
      string memory guardMark = hasGuard ? '   YES' : '   N/A';

      console.log(string.concat(padRight(item.name, 28), adminMark, govMark, guardMark));

      if (!hasAdmin || !hasGov) {
        allVerified = false;
      }
    }
    console.log('------------------------------------------------------------------');

    require(
      allVerified,
      'CRITICAL ABORT: On-chain role verification matrix failed for Timelock Admin!'
    );
    console.log('\n>>> 100% ON-CHAIN VERIFICATION MATRIX PASSED SUCCESSFULLY! <<<');

    // ----------------------------------------------------
    // STAGE 3: Un-Broadcasted Renounce Calldata Generation
    // ----------------------------------------------------
    console.log('\n--- STAGE 3: Generating Un-Broadcasted Renounce Calldata ---');
    console.log(
      'The following transactions are NOT signed or broadcasted. Manual review required:'
    );

    for (uint256 i = 0; i < config.contracts.length; i++) {
      TargetContract memory item = config.contracts[i];
      if (item.addr == address(0) || item.addr.code.length == 0) continue;
      console.log('\nContract:', item.name, item.addr);
      console.log('  Renounce DEFAULT_ADMIN_ROLE Calldata:');
      console.logBytes(
        abi.encodeWithSelector(
          IAccessControl.renounceRole.selector,
          DEFAULT_ADMIN_ROLE,
          config.oldAdmin
        )
      );
    }
  }

  function padRight(string memory str, uint256 len) internal pure returns (string memory) {
    bytes memory strBytes = bytes(str);
    if (strBytes.length >= len) return str;
    bytes memory padded = new bytes(len);
    for (uint256 i = 0; i < len; i++) {
      if (i < strBytes.length) {
        padded[i] = strBytes[i];
      } else {
        padded[i] = ' ';
      }
    }
    return string(padded);
  }
}
