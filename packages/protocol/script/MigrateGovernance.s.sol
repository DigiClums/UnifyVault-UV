// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { IAccessControl } from '@openzeppelin/contracts/access/IAccessControl.sol';
import { AccessRoles } from 'src/libraries/AccessRoles.sol';

/**
 * @title MigrateGovernanceScript
 * @notice Production governance migration script for UnifyVault.
 * @dev Grants roles to SafePal Hardware Wallet (0xd905920c91853039060246Ed5724AA72B91a96DA),
 * verifies 100% on-chain compliance with hard assertions, and generates un-broadcasted renounce transactions.
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
    bool hasGuardianRole;
  }

  function simulate() external {
    run();
  }

  function run() public {
    console.log('===========================================================');
    console.log('UNIFYVAULT PRODUCTION GOVERNANCE MIGRATION & VERIFICATION');
    console.log('Target SafePal Admin Wallet:', NEW_GOVERNANCE_ADMIN);
    console.log('Old Deployer Admin Target  :', OLD_DEPLOYER_ADMIN);
    console.log('===========================================================');

    TargetContract[] memory targets = getTargets();

    // ----------------------------------------------------
    // STAGE 1: Grant Missing Roles (Idempotent with Hard Post-Grant Assertion)
    // ----------------------------------------------------
    console.log('\n--- STAGE 1: Idempotent Role Grant Execution & Summary ---');
    for (uint256 i = 0; i < targets.length; i++) {
      if (targets[i].addr == address(0)) continue;
      IAccessControl ac = IAccessControl(targets[i].addr);

      console.log('\nContract:', targets[i].name, targets[i].addr);

      // 1. DEFAULT_ADMIN_ROLE Check & Grant
      if (!ac.hasRole(DEFAULT_ADMIN_ROLE, NEW_GOVERNANCE_ADMIN)) {
        console.log('  DEFAULT_ADMIN_ROLE: [GRANT] Missing. Broadcasting grantRole...');
        console.log('    [Pre-Broadcast] msg.sender:', msg.sender);
        vm.startBroadcast(OLD_DEPLOYER_ADMIN);
        console.log('    [Active Broadcast Sender] msg.sender:', msg.sender);
        try ac.grantRole(DEFAULT_ADMIN_ROLE, NEW_GOVERNANCE_ADMIN) {
          console.log('    [+] Executed grantRole(DEFAULT_ADMIN_ROLE)');
        } catch {
          console.log('    [-] grantRole(DEFAULT_ADMIN_ROLE) broadcast skipped/reverted');
        }
        vm.stopBroadcast();

        // Hard Assertion Post-Grant
        require(
          ac.hasRole(DEFAULT_ADMIN_ROLE, NEW_GOVERNANCE_ADMIN),
          string.concat(
            'CRITICAL: Post-grant verification failed for DEFAULT_ADMIN_ROLE on ',
            targets[i].name
          )
        );
      } else {
        console.log('  DEFAULT_ADMIN_ROLE: [SKIP] Already granted.');
      }

      // 2. GOVERNANCE_ROLE Check & Grant
      if (!ac.hasRole(GOVERNANCE_ROLE, NEW_GOVERNANCE_ADMIN)) {
        console.log('  GOVERNANCE_ROLE   : [GRANT] Missing. Broadcasting grantRole...');
        console.log('    [Pre-Broadcast] msg.sender:', msg.sender);
        vm.startBroadcast(OLD_DEPLOYER_ADMIN);
        console.log('    [Active Broadcast Sender] msg.sender:', msg.sender);
        try ac.grantRole(GOVERNANCE_ROLE, NEW_GOVERNANCE_ADMIN) {
          console.log('    [+] Executed grantRole(GOVERNANCE_ROLE)');
        } catch {
          console.log('    [-] grantRole(GOVERNANCE_ROLE) broadcast skipped/reverted');
        }
        vm.stopBroadcast();

        // Hard Assertion Post-Grant
        require(
          ac.hasRole(GOVERNANCE_ROLE, NEW_GOVERNANCE_ADMIN),
          string.concat(
            'CRITICAL: Post-grant verification failed for GOVERNANCE_ROLE on ',
            targets[i].name
          )
        );
      } else {
        console.log('  GOVERNANCE_ROLE   : [SKIP] Already granted.');
      }

      // 3. GUARDIAN_ROLE Check & Grant (if applicable)
      if (targets[i].hasGuardianRole) {
        if (!ac.hasRole(GUARDIAN_ROLE, NEW_GOVERNANCE_ADMIN)) {
          console.log('  GUARDIAN_ROLE     : [GRANT] Missing. Broadcasting grantRole...');
          console.log('    [Pre-Broadcast] msg.sender:', msg.sender);
          vm.startBroadcast(OLD_DEPLOYER_ADMIN);
          console.log('    [Active Broadcast Sender] msg.sender:', msg.sender);
          try ac.grantRole(GUARDIAN_ROLE, NEW_GOVERNANCE_ADMIN) {
            console.log('    [+] Executed grantRole(GUARDIAN_ROLE)');
          } catch {
            console.log('    [-] grantRole(GUARDIAN_ROLE) broadcast skipped/reverted');
          }
          vm.stopBroadcast();

          // Hard Assertion Post-Grant
          require(
            ac.hasRole(GUARDIAN_ROLE, NEW_GOVERNANCE_ADMIN),
            string.concat(
              'CRITICAL: Post-grant verification failed for GUARDIAN_ROLE on ',
              targets[i].name
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

    for (uint256 i = 0; i < targets.length; i++) {
      if (targets[i].addr == address(0)) continue;
      IAccessControl ac = IAccessControl(targets[i].addr);

      bool hasAdmin = ac.hasRole(DEFAULT_ADMIN_ROLE, NEW_GOVERNANCE_ADMIN);
      bool hasGov = ac.hasRole(GOVERNANCE_ROLE, NEW_GOVERNANCE_ADMIN);
      bool hasGuard =
        targets[i].hasGuardianRole ? ac.hasRole(GUARDIAN_ROLE, NEW_GOVERNANCE_ADMIN) : true;

      string memory adminMark = hasAdmin ? '      YES     ' : '      NO      ';
      string memory govMark = hasGov ? '    YES   ' : '    NO    ';
      string memory guardMark =
        targets[i].hasGuardianRole ? (hasGuard ? '   YES' : '   NO') : '   N/A';

      console.log(string.concat(padRight(targets[i].name, 28), adminMark, govMark, guardMark));

      if (!hasAdmin || !hasGov || !hasGuard) {
        allVerified = false;
      }
    }
    console.log('------------------------------------------------------------------');

    require(
      allVerified,
      'CRITICAL ABORT: On-chain role verification matrix failed for SafePal Admin!'
    );
    console.log('\n>>> 100% ON-CHAIN VERIFICATION MATRIX PASSED SUCCESSFULLY! <<<');

    // ----------------------------------------------------
    // STAGE 3: Un-Broadcasted Renounce Calldata Generation
    // ----------------------------------------------------
    console.log('\n--- STAGE 3: Generating Un-Broadcasted Renounce Calldata ---');
    console.log(
      'The following transactions are NOT signed or broadcasted. Manual review required:'
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
    }
  }

  function getTargets() internal pure returns (TargetContract[] memory) {
    TargetContract[] memory t = new TargetContract[](7);
    t[0] = TargetContract('ProtocolDirectory', 0xB5dd6d766867cB4c299AD2711068455C718EDDbc, false);
    t[1] = TargetContract('UnifyVaultController', 0x7EF5D93f83995228efFc63dbe513367a719f0633, true);
    t[2] = TargetContract('CustodyVault', 0x54696d5d00b58F27F9d8C358560ff2a7d10d409e, true);
    t[3] = TargetContract('Treasury', 0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D, true);
    t[4] = TargetContract('OracleManager', 0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635, false);
    t[5] = TargetContract('UVBTCETHToken', 0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4, true);
    t[6] = TargetContract('StrategyManager', 0x36b02ef54B06527c2fE6028C51A3DF7e4EF7b9b0, false);
    return t;
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
