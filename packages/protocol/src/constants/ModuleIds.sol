// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ModuleIds
 * @notice Centralized library for all on-chain protocol module bytes32 identifiers
 */
library ModuleIds {
  bytes32 public constant ORACLE = keccak256('OracleManager');
  bytes32 public constant VAULT = keccak256('CustodyVault');
  bytes32 public constant TREASURY = keccak256('Treasury');
  bytes32 public constant TOKEN = keccak256('IndexToken');
  bytes32 public constant GOVERNANCE = keccak256('Governance');
  bytes32 public constant RISK_ENGINE = keccak256('RiskEngine');
  bytes32 public constant DEPOSIT_MANAGER = keccak256('DepositManager');
  bytes32 public constant REDEEM_MANAGER = keccak256('RedeemManager');
  bytes32 public constant REBALANCE_MANAGER = keccak256('RebalanceManager');
}
