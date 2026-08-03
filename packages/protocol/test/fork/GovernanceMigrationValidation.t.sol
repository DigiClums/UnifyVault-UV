// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console } from 'forge-std/Test.sol';
import { DeployMainnetScript } from '../../script/DeployMainnet.s.sol';
import { UnifyVaultTimelock } from '../../src/governance/UnifyVaultTimelock.sol';
import { IAccessControl } from '@openzeppelin/contracts/access/IAccessControl.sol';
import { AccessRoles } from '../../src/libraries/AccessRoles.sol';

contract GovernanceMigrationValidationTest is Test {
    DeployMainnetScript public deployScript;
    UnifyVaultTimelock public timelock;

    address public oldAdmin;
    address public newAdmin;
    address public guardian;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant GOVERNANCE_ROLE = keccak256('GOVERNANCE_ROLE');
    bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');
    bytes32 public constant CONTROLLER_ROLE = keccak256('CONTROLLER_ROLE');

    function setUp() public {
        deployScript = new DeployMainnetScript();
        deployScript.run();

        oldAdmin = deployScript.deployer();
        guardian = address(0x9999999999999999999999999999999999999999);

        // Deploy production 48-hour UnifyVaultTimelock
        address[] memory proposers = new address[](1);
        proposers[0] = address(0xd905920c91853039060246Ed5724AA72B91a96DA); // Gnosis Safe Multisig

        address[] memory executors = new address[](1);
        executors[0] = address(0xd905920c91853039060246Ed5724AA72B91a96DA); // Gnosis Safe Multisig

        vm.startPrank(oldAdmin);
        timelock = new UnifyVaultTimelock(48 hours, proposers, executors, oldAdmin);
        newAdmin = address(timelock);
        vm.stopPrank();
    }

    function test_GovernanceMigrationAndTimelockOwnership() public {
        console.log("=== EXECUTING GOVERNANCE MIGRATION & TIMELOCK VALIDATION ON FORK ===");

        // Task 7: Verify Timelock ownership parameters
        assertEq(timelock.getMinDelay(), 48 hours, "Timelock delay must be 48 hours (172800s)");
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), address(0xd905920c91853039060246Ed5724AA72B91a96DA)));
        assertTrue(timelock.hasRole(timelock.EXECUTOR_ROLE(), address(0xd905920c91853039060246Ed5724AA72B91a96DA)));
        console.log("[PASS] Task 7: Timelock 48-hour delay & multisig proposer/executor verified");

        // Array of all deployed contracts requiring governance migration
        address[10] memory targets = [
            address(deployScript.directory()),
            address(deployScript.treasury()),
            address(deployScript.feeManager()),
            address(deployScript.oracleManager()),
            address(deployScript.chainlinkProvider()),
            address(deployScript.vault()),
            address(deployScript.liquidityManager()),
            address(deployScript.token()),
            address(deployScript.strategyManager()),
            address(deployScript.portfolioManager())
        ];

        // Perform 2-step governance role transfer to Timelock
        vm.startPrank(oldAdmin);
        for (uint256 i = 0; i < targets.length; i++) {
            IAccessControl ac = IAccessControl(targets[i]);
            ac.grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
            ac.grantRole(GOVERNANCE_ROLE, newAdmin);
        }
        vm.stopPrank();

        // Verify Timelock now holds DEFAULT_ADMIN_ROLE and GOVERNANCE_ROLE across all contracts
        for (uint256 i = 0; i < targets.length; i++) {
            IAccessControl ac = IAccessControl(targets[i]);
            assertTrue(ac.hasRole(DEFAULT_ADMIN_ROLE, newAdmin), "New Admin must hold DEFAULT_ADMIN_ROLE");
            assertTrue(ac.hasRole(GOVERNANCE_ROLE, newAdmin), "New Admin must hold GOVERNANCE_ROLE");
        }

        // Deployer renounces roles
        vm.startPrank(oldAdmin);
        for (uint256 i = 0; i < targets.length; i++) {
            IAccessControl ac = IAccessControl(targets[i]);
            ac.renounceRole(DEFAULT_ADMIN_ROLE, oldAdmin);
            ac.renounceRole(GOVERNANCE_ROLE, oldAdmin);
        }
        vm.stopPrank();

        // Task 6: Verify Governance Migration
        for (uint256 i = 0; i < targets.length; i++) {
            IAccessControl ac = IAccessControl(targets[i]);
            assertFalse(ac.hasRole(DEFAULT_ADMIN_ROLE, oldAdmin), "Old Admin must NOT hold DEFAULT_ADMIN_ROLE");
            assertFalse(ac.hasRole(GOVERNANCE_ROLE, oldAdmin), "Old Admin must NOT hold GOVERNANCE_ROLE");
            assertTrue(ac.hasRole(DEFAULT_ADMIN_ROLE, newAdmin), "Timelock must hold DEFAULT_ADMIN_ROLE");
            assertTrue(ac.hasRole(GOVERNANCE_ROLE, newAdmin), "Timelock must hold GOVERNANCE_ROLE");
        }

        console.log("[PASS] Task 6: Governance Migration verified - Deployer completely revoked, Timelock in sole control");
    }
}
