// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title EscrowTypes
 * @notice Data structures and enumerations for the P2PEscrow protocol module
 */
library EscrowTypes {
  /**
   * @notice Lifecycle states for an Escrow Trade
   */
  enum TradeState {
    NONE, // Uninitialized
    CREATED, // Trade created, pending seller funding
    FUNDED, // Crypto deposited into escrow by seller
    PAYMENT_SUBMITTED, // Buyer submitted off-chain payment claim & evidence hash
    DISPUTED, // Dispute raised by buyer or seller
    RELEASED, // Crypto released to buyer (trade completed)
    REFUNDED, // Crypto refunded to seller
    CANCELLED // Trade cancelled prior to funding
  }

  /**
   * @notice Dispute resolution outcome
   */
  enum DisputeOutcome {
    RELEASE_TO_BUYER,
    REFUND_TO_SELLER
  }

  /**
   * @notice Parameters required to create a new P2P Trade
   */
  struct CreateTradeParams {
    address buyer;
    address seller;
    address asset; // ERC20 token address or address(0) for native ETH
    uint256 amount; // Amount of crypto asset escrowed
    uint256 fiatAmount; // Fiat amount expected off-chain (informative)
    bytes32 fiatCurrency; // e.g. keccak256("USD"), keccak256("INR")
    uint256 paymentWindow; // Duration (in seconds) buyer has to submit payment claim after funding
  }

  /**
   * @notice Complete state representation of an Escrow Trade
   */
  struct Trade {
    uint256 tradeId;
    address buyer;
    address seller;
    address asset;
    uint256 amount;
    uint256 fiatAmount;
    bytes32 fiatCurrency;
    TradeState state;
    uint256 paymentWindow;
    uint256 fundingTimestamp;
    uint256 paymentTimestamp;
    bytes32 paymentReference; // UTR or transaction ID hash
    bytes32 evidenceHash; // Cryptographic hash / IPFS CID hash of receipt
    address disputeInitiator;
  }
}
