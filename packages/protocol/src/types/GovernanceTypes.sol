// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @notice Lifecycle states for queued governance proposals
 */
enum ProposalState {
  PENDING,
  QUEUED,
  EXECUTED,
  CANCELLED
}

/**
 * @notice Data structure holding details of queued calls
 */
struct Proposal {
  address target;
  bytes data;
  uint256 executionTime;
  ProposalState state;
}
