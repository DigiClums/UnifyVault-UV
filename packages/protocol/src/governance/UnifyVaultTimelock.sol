// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/governance/TimelockController.sol';

/**
 * @title UnifyVaultTimelock
 * @notice 48-hour TimelockController for UnifyVault V2 Protocol Governance
 * @dev Enforces 48-hour delay on all administrative and governance execution.
 * Gnosis Safe is configured as proposer, and Timelock itself is executor/admin.
 */
contract UnifyVaultTimelock is TimelockController {
  uint256 public constant TIMELOCK_DELAY = 48 hours;

  event TimelockQueued(
    bytes32 indexed id,
    address indexed target,
    uint256 value,
    bytes data,
    uint256 eta
  );
  event TimelockExecuted(
    bytes32 indexed id,
    address indexed target,
    uint256 value,
    bytes data
  );

  /**
   * @param minDelay Minimum delay in seconds (must be 48 hours = 172800)
   * @param proposers List of addresses with PROPOSER_ROLE (e.g. Gnosis Safe)
   * @param executors List of addresses with EXECUTOR_ROLE (e.g. Timelock address / open)
   * @param admin Initial admin address (renounced after setup)
   */
  constructor(
    uint256 minDelay,
    address[] memory proposers,
    address[] memory executors,
    address admin
  ) TimelockController(minDelay, proposers, executors, admin) {}

  /**
   * @notice Overridden schedule to emit TimelockQueued monitoring event
   */
  function schedule(
    address target,
    uint256 value,
    bytes calldata data,
    bytes32 predecessor,
    bytes32 salt,
    uint256 delay
  ) public override onlyRole(PROPOSER_ROLE) {
    super.schedule(target, value, data, predecessor, salt, delay);
    bytes32 id = hashOperation(target, value, data, predecessor, salt);
    emit TimelockQueued(id, target, value, data, block.timestamp + delay);
  }

  /**
   * @notice Overridden execute to emit TimelockExecuted monitoring event
   */
  function execute(
    address target,
    uint256 value,
    bytes calldata payload,
    bytes32 predecessor,
    bytes32 salt
  ) public payable override onlyRoleOrOpenRole(EXECUTOR_ROLE) {
    bytes32 id = hashOperation(target, value, payload, predecessor, salt);
    super.execute(target, value, payload, predecessor, salt);
    emit TimelockExecuted(id, target, value, payload);
  }
}
