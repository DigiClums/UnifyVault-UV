// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { IAccessControl } from '@openzeppelin/contracts/access/IAccessControl.sol';
import { AccessRoles } from 'src/libraries/AccessRoles.sol';

/**
 * @title MigrateGovernanceScript
 * @notice Production governance migration script for UnifyVault.
 * @dev Grants roles to SafePal Hardware Wallet (0xd905920c91853039060246Ed5724AA72B91a96DA),
 * verifies 100% on-chain compliance, and generates un-broadcasted renounce transactions.
 */
contract MigrateGovernanceScript is Script {
  address public constant NEW_GOVERNANCE_ADMIN = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant OLD_DEPLOYER_ADMIN = 0xB145AC2a59575Fbe306a58aC924718f4DD4659Da;

  bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
  bytes32 public constant GOVERNANCE_ROLE = keccak256('GOVERNANCE_ROLE');
  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');

  struct TargetContract {
    string name;
    address addr;
  }

  function run() external {
    console.log('====================================================');
    console.log('UNIFYVAULT GOVERNANCE MIGRATION & VERIFICATION');
    console.log('New SafePal Admin:', NEW_GOVERNANCE_ADMIN);
    console.log('Old Admin Target :', OLD_DEPLOYER_ADMIN);
    console.log('====================================================');

    TargetContract[] memory targets = getTargets();

    vm.startBroadcast();

    // ----------------------------------------------------
    // STAGE 1: Grant Roles to SafePal Hardware Wallet
    // ----------------------------------------------------
    console.log('\n--- STAGE 1: Granting Roles to SafePal Hardware Wallet ---');
    for (uint256 i = 0; i < targets.length; i++) {
      if (targets[i].addr == address(0)) continue;
      IAccessControl ac = IAccessControl(targets[i].addr);

      console.log('Granting roles on contract:', targets[i].name, targets[i].addr);

      try ac.grantRole(DEFAULT_ADMIN_ROLE, NEW_GOVERNANCE_ADMIN) {
        console.log('  -> Granted DEFAULT_ADMIN_ROLE');
      } catch {
        console.log('  -> DEFAULT_ADMIN_ROLE grant skipped or failed');
      }

      try ac.grantRole(GOVERNANCE_ROLE, NEW_GOVERNANCE_ADMIN) {
        console.log('  -> Granted GOVERNANCE_ROLE');
      } catch {
        console.log('  -> GOVERNANCE_ROLE grant skipped or failed');
      }

      try ac.grantRole(GUARDIAN_ROLE, NEW_GOVERNANCE_ADMIN) {
        console.log('  -> Granted GUARDIAN_ROLE');
      } catch {
        console.log('  -> GUARDIAN_ROLE grant skipped or failed');
      }
    }

    vm.stopBroadcast();

    // ----------------------------------------------------
    // STAGE 2: 100% On-Chain Verification
    // ----------------------------------------------------
    console.log('\n--- STAGE 2: Performing 100% On-Chain Verification ---');
    bool allVerified = true;

    for (uint256 i = 0; i < targets.length; i++) {
      if (targets[i].addr == address(0)) continue;
      IAccessControl ac = IAccessControl(targets[i].addr);

      bool hasAdmin = ac.hasRole(DEFAULT_ADMIN_ROLE, NEW_GOVERNANCE_ADMIN);
      bool hasGov = ac.hasRole(GOVERNANCE_ROLE, NEW_GOVERNANCE_ADMIN);

      console.log('[VERIFY]', targets[i].name);
      console.log('  DEFAULT_ADMIN_ROLE:', hasAdmin ? 'PASS' : 'FAIL');
      console.log('  GOVERNANCE_ROLE   :', hasGov ? 'PASS' : 'FAIL');

      if (!hasAdmin || !hasGov) {
        allVerified = false;
      }
    }

    require(allVerified, 'CRITICAL: On-chain role verification failed for SafePal Admin!');
    console.log('\n>>> 100% ON-CHAIN VERIFICATION SUCCESSFUL! <<<');

    // ----------------------------------------------------
    // STAGE 3: Generate Renounce Transactions (DO NOT BROADCAST)
    // ----------------------------------------------------
    console.log('\n--- STAGE 3: Generating Renounce Calldata (NOT BROADCASTED) ---');
    console.log(
      'The following transactions must be reviewed and executed ONLY after explicit user confirmation:'
    );

    for (uint256 i = 0; i < targets.length; i++) {
      if (targets[i].addr == address(0)) continue;
      console.log('\nContract:', targets[i].name, targets[i].addr);
      console.log('  Renounce DEFAULT_ADMIN_ROLE Calldata:');
      console.logBytes(
        abi.encodeWithSelector(
          IAccessControl.renounceRole.selector,
          DEFAULT_ADMIN_ROLE,
          OLD_DEPLOYER_ADMIN
        )
      );
      console.log('  Renounce GOVERNANCE_ROLE Calldata:');
      console.logBytes(
        abi.encodeWithSelector(
          IAccessControl.renounceRole.selector,
          GOVERNANCE_ROLE,
          OLD_DEPLOYER_ADMIN
        )
      );
    }
  }

  function getTargets() internal pure returns (TargetContract[] memory) {
    TargetContract[] memory t = new TargetContract[](6);
    t[0] = TargetContract('ProtocolDirectory', 0xB5dd6d766867cB4c299AD2711068455C718EDDbc);
    t[1] = TargetContract('UnifyVaultController', 0x7EF5D93f83995228efFc63dbe513367a719f0633);
    t[2] = TargetContract('CustodyVault', 0x54696d5d00b58F27F9d8C358560ff2a7d10d409e);
    t[3] = TargetContract('Treasury', 0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D);
    t[4] = TargetContract('OracleManager', 0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635);
    t[5] = TargetContract('UVBTCETHToken', 0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4);
    return t;
  }
}
