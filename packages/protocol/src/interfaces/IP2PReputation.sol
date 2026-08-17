// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ReputationTypes } from '../types/ReputationTypes.sol';

/**
 * @title IP2PReputation
 * @notice Public interface for the UnifyVault Isolated Non-Custodial P2P Reputation Engine.
 */
interface IP2PReputation {
  /**
   * @notice Emitted when a verified rating is successfully submitted for a settled trade.
   */
  event RatingSubmitted(
    uint256 indexed tradeId,
    address indexed rater,
    address indexed target,
    uint8 score,
    bytes32 feedbackHash,
    ReputationTypes.ParticipantRole roleRated,
    uint256 timestamp
  );

  /**
   * @notice Submits a 1-to-5 star rating for the counterparty of a RELEASED escrow trade.
   * @param tradeId The unique identifier of the settled escrow trade.
   * @param score Integer rating value from ONE_STAR (1) to FIVE_STAR (5).
   * @param feedbackHash Cryptographic hash or IPFS CID of optional textual feedback.
   */
  function submitRating(
    uint256 tradeId,
    ReputationTypes.RatingValue score,
    bytes32 feedbackHash
  ) external;

  /**
   * @notice Returns the full reputation profile of a given user address.
   */
  function getProfile(
    address user
  ) external view returns (ReputationTypes.UserReputationProfile memory);

  /**
   * @notice Computes the Bayesian-smoothed trust score for a user acting as a Buyer (in BPS, 0 to 10000).
   */
  function getBuyerTrustScore(address user) external view returns (uint16);

  /**
   * @notice Computes the Bayesian-smoothed trust score for a user acting as a Seller (in BPS, 0 to 10000).
   */
  function getSellerTrustScore(address user) external view returns (uint16);

  /**
   * @notice Computes the combined Bayesian-smoothed trust score across both roles (in BPS, 0 to 10000).
   */
  function getCombinedTrustScore(address user) external view returns (uint16);

  /**
   * @notice Returns the confidence / trust tier for a user in the Buyer role.
   */
  function getBuyerTrustTier(address user) external view returns (ReputationTypes.TrustTier);

  /**
   * @notice Returns the confidence / trust tier for a user in the Seller role.
   */
  function getSellerTrustTier(address user) external view returns (ReputationTypes.TrustTier);

  /**
   * @notice Checks whether a specific participant has already rated a given trade ID.
   */
  function hasUserRated(uint256 tradeId, address user) external view returns (bool);

  /**
   * @notice Retrieves the submitted rating record for a given trade and rater.
   */
  function getTradeRating(
    uint256 tradeId,
    address rater
  ) external view returns (ReputationTypes.Rating memory);

  /**
   * @notice Returns the immutable canonical P2PEscrowV2 contract address.
   */
  function p2pEscrow() external view returns (address);
}
