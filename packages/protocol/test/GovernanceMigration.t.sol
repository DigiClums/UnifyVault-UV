// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console } from 'forge-std/Test.sol';
import { ProtocolDirectory } from 'src/ProtocolDirectory.sol';
import { UnifyVaultController } from 'src/controller/UnifyVaultController.sol';
import { CustodyVault } from 'src/vault/CustodyVault.sol';
import { Treasury } from 'src/vault/Treasury.sol';
import { OracleManager } from 'src/oracle/OracleManager.sol';
import { UVBTCETHToken } from 'src/token/UVBTCETHToken.sol';
import {
  GovernanceMigrationHelper,
  MigrationConfig,
  TargetContract,
  VmExt
} from 'script/mainnet/helpers/GovernanceMigrationHelper.sol';
import { GrantAdminRolesScript } from 'script/mainnet/GrantAdminRoles.s.sol';
import { VerifyGovernanceScript } from 'script/mainnet/VerifyGovernance.s.sol';
import { RenounceOldAdminScript } from 'script/mainnet/RenounceOldAdmin.s.sol';
import { Strings } from '@openzeppelin/contracts/utils/Strings.sol';

contract GovernanceMigrationTest is Test {
  ProtocolDirectory public directory;
  CustodyVault public vault;
  Treasury public treasury;
  OracleManager public oracle;
  UVBTCETHToken public token;

  address public oldAdmin;
  address public newAdmin = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public guardian = 0xd905920c91853039060246Ed5724AA72B91a96DA;

  string public configPath = 'script/mainnet/config/base_sepolia.json';

  function setUp() public {
    oldAdmin = address(this);

    directory = new ProtocolDirectory();
    vault = new CustodyVault();
    treasury = new Treasury();
    oracle = new OracleManager();
    token = new UVBTCETHToken();
  }

  function test_LoadConfig() public {
    MigrationConfig memory config = GovernanceMigrationHelper.loadConfig(address(vm));
    assertEq(config.newAdmin, newAdmin, 'newAdmin mismatch');
    assertTrue(config.contracts.length > 0, 'No contracts loaded');
  }

  function test_GovernanceMigrationLifecycle() public {
    // Test helper checkRole
    assertTrue(
      GovernanceMigrationHelper.checkRole(
        address(vault),
        GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
        oldAdmin
      )
    );
    assertFalse(
      GovernanceMigrationHelper.checkRole(
        address(vault),
        GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
        newAdmin
      )
    );

    // 1. Grant Roles
    vault.grantRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, newAdmin);
    vault.grantRole(GovernanceMigrationHelper.GOVERNANCE_ROLE, newAdmin);
    vault.grantRole(GovernanceMigrationHelper.GUARDIAN_ROLE, guardian);

    assertTrue(
      GovernanceMigrationHelper.checkRole(
        address(vault),
        GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
        newAdmin
      )
    );
    assertTrue(
      GovernanceMigrationHelper.checkRole(
        address(vault),
        GovernanceMigrationHelper.GOVERNANCE_ROLE,
        newAdmin
      )
    );
    assertTrue(
      GovernanceMigrationHelper.checkRole(
        address(vault),
        GovernanceMigrationHelper.GUARDIAN_ROLE,
        guardian
      )
    );

    // 2. Renounce Roles
    vault.renounceRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, oldAdmin);
    vault.renounceRole(GovernanceMigrationHelper.GOVERNANCE_ROLE, oldAdmin);

    assertFalse(
      GovernanceMigrationHelper.checkRole(
        address(vault),
        GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE,
        oldAdmin
      )
    );
    assertFalse(
      GovernanceMigrationHelper.checkRole(
        address(vault),
        GovernanceMigrationHelper.GOVERNANCE_ROLE,
        oldAdmin
      )
    );
  }

  function test_FullScriptMigration() public {
    address broadcaster = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;

    // Grant roles to broadcaster on vault and treasury
    vault.grantRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, broadcaster);
    vault.grantRole(GovernanceMigrationHelper.GOVERNANCE_ROLE, broadcaster);
    vault.grantRole(GovernanceMigrationHelper.GUARDIAN_ROLE, broadcaster);
    vault.grantRole(GovernanceMigrationHelper.CONTROLLER_ROLE, broadcaster);

    treasury.grantRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, broadcaster);
    treasury.grantRole(GovernanceMigrationHelper.GOVERNANCE_ROLE, broadcaster);
    treasury.grantRole(GovernanceMigrationHelper.GUARDIAN_ROLE, broadcaster);
    treasury.grantRole(GovernanceMigrationHelper.CONTROLLER_ROLE, broadcaster);

    string memory json = string.concat(
      '{"newAdmin":"',
      Strings.toHexString(newAdmin),
      '","oldAdmin":"',
      Strings.toHexString(broadcaster),
      '","guardian":"',
      Strings.toHexString(guardian),
      '","confirmRenounce":true,"contracts":{"CustodyVault":"',
      Strings.toHexString(address(vault)),
      '","Treasury":"',
      Strings.toHexString(address(treasury)),
      '"}}'
    );

    string memory testConfigPath = 'script/mainnet/config/test_config.json';
    VmExt vmExt = VmExt(address(vm));
    vmExt.writeFile(testConfigPath, json);
    vmExt.setEnv('CONFIG_PATH', testConfigPath);

    // Step 1: Grant Admin Roles
    GrantAdminRolesScript grantScript = new GrantAdminRolesScript();
    grantScript.run();

    // Step 2: Renounce Old Admin
    RenounceOldAdminScript renounceScript = new RenounceOldAdminScript();
    renounceScript.run();

    // Step 3: Verify Governance
    VerifyGovernanceScript verifyScript = new VerifyGovernanceScript();
    verifyScript.run();

    // Verify post-renounce state: broadcaster owns ZERO roles
    assertFalse(vault.hasRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, broadcaster));
    assertFalse(vault.hasRole(GovernanceMigrationHelper.GOVERNANCE_ROLE, broadcaster));
    assertFalse(vault.hasRole(GovernanceMigrationHelper.GUARDIAN_ROLE, broadcaster));
    assertFalse(vault.hasRole(GovernanceMigrationHelper.CONTROLLER_ROLE, broadcaster));

    assertFalse(treasury.hasRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, broadcaster));
    assertFalse(treasury.hasRole(GovernanceMigrationHelper.GOVERNANCE_ROLE, broadcaster));
    assertFalse(treasury.hasRole(GovernanceMigrationHelper.GUARDIAN_ROLE, broadcaster));
    assertFalse(treasury.hasRole(GovernanceMigrationHelper.CONTROLLER_ROLE, broadcaster));

    assertTrue(vault.hasRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, newAdmin));
    assertTrue(treasury.hasRole(GovernanceMigrationHelper.DEFAULT_ADMIN_ROLE, newAdmin));

    vmExt.removeFile(testConfigPath);
    vmExt.setEnv('CONFIG_PATH', 'script/mainnet/config/base_sepolia.json');
  }
}
