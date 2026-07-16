// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title AccessRoles
 * @notice Centralized library defining the role hashes for RBAC authorization
 */
library AccessRoles {
  bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
  bytes32 public constant GOVERNANCE_ROLE = keccak256('GOVERNANCE_ROLE');
  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');
  bytes32 public constant CONTROLLER_ROLE = keccak256('CONTROLLER_ROLE');
  bytes32 public constant BOT_ROLE = keccak256('BOT_ROLE');
  bytes32 public constant ORACLE_OPERATOR_ROLE = keccak256('ORACLE_OPERATOR_ROLE');
}
