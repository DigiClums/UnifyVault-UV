// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '../types/EscrowTypes.sol';

/**
 * @title IP2PEscrow
 * @notice Interface for the UnifyVault Non-Custodial P2P Escrow Protocol
 */
interface IP2PEscrow {
  function createTrade(
    EscrowTypes.CreateTradeParams calldata params
  ) external payable returns (uint256 tradeId);

  function fundTrade(uint256 tradeId) external payable;

  function submitPayment(uint256 tradeId, bytes32 paymentReference, bytes32 evidenceHash) external;

  function confirmAndRelease(uint256 tradeId) external;

  function refund(uint256 tradeId) external;

  function cancelUnfundedTrade(uint256 tradeId) external;

  function raiseDispute(uint256 tradeId, bytes32 reasonHash) external;

  function resolveDispute(uint256 tradeId, EscrowTypes.DisputeOutcome outcome) external;

  function getTrade(uint256 tradeId) external view returns (EscrowTypes.Trade memory);

  function isEvidenceHashUsed(bytes32 evidenceHash) external view returns (bool);

  function isPaymentReferenceUsed(bytes32 paymentReference) external view returns (bool);
}
