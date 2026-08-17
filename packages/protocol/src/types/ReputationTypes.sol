// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ReputationTypes
 * @notice Data structures, enums, and metric types for the P2P Decentralized Reputation Engine.
 */
library ReputationTypes {
  /**
   * @notice 1-to-5 Star rating scale
   */
  enum RatingValue {
    NONE, // 0: Invalid / unrated
    ONE_STAR, // 1: Strongly Negative
    TWO_STAR, // 2: Negative
    THREE_STAR, // 3: Neutral
    FOUR_STAR, // 4: Positive
    FIVE_STAR // 5: Strongly Positive
  }

  /**
   * @notice Reputation and trust confidence tiers
   */
  enum TrustTier {
    UNRATED, // 0 Ratings: No trust history
    PROBATIONARY, // 1-4 Ratings: Low confidence / probationary
    ESTABLISHED, // 5-19 Ratings: Medium confidence (Bayesian smoothing active)
    VERIFIED_MERCHANT // 20+ Ratings & >= 9000 BPS Trust Score & >= Min Volume: High confidence merchant
  }

  /**
   * @notice Identifies the evaluated participant role in a trade
   */
  enum ParticipantRole {
    BUYER, // Rated when acting as the buyer
    SELLER // Rated when acting as the seller
  }

  /**
   * @notice Complete record of a single submitted rating
   */
  struct Rating {
    RatingValue score; // Integer star rating (1 to 5)
    uint32 timestamp; // block.timestamp of rating submission
    bytes32 feedbackHash; // IPFS CID / cryptographic hash of review text
    address rater; // Address of the participant submitting the rating
    address target; // Address of the counterparty being rated
    ParticipantRole roleRated; // Role of target when rated (BUYER or SELLER)
  }

  /**
   * @notice Cumulative reputation metrics partitioned by participant role
   */
  struct RoleReputation {
    uint32 ratingsCount; // Total ratings received in this specific role
    uint64 scoreSum; // Sum of star scores received (1-5 points each)
    uint32 positiveCount; // Count of 4-star and 5-star ratings
    uint32 neutralCount; // Count of 3-star ratings
    uint32 negativeCount; // Count of 1-star and 2-star ratings
    uint128 volumeSettled; // Cumulative token/crypto amount settled in this role
  }

  /**
   * @notice Complete isolated reputation profile of a P2P participant
   */
  struct UserReputationProfile {
    uint32 totalTradesAsBuyer; // Settled trades completed as Buyer
    uint32 totalTradesAsSeller; // Settled trades completed as Seller
    RoleReputation buyerStats; // Reputation metrics earned as Buyer
    RoleReputation sellerStats; // Reputation metrics earned as Seller
    uint32 firstTradeTimestamp; // Timestamp of first recorded trade rating
    uint32 lastTradeTimestamp; // Timestamp of most recent trade rating
  }
}
