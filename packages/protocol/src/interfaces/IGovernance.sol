// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IGovernance
 * @notice Interface for the UnifyVault Governance Module
 */
interface IGovernance {
  function executeProposal(address target, bytes calldata data) external payable;
  function queueProposal(bytes32 proposalId) external;
}
