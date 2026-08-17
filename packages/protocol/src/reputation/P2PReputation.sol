// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '../interfaces/IP2PReputation.sol';
import '../interfaces/IP2PEscrow.sol';
import '../types/EscrowTypes.sol';
import '../types/ReputationTypes.sol';

/**
 * @title P2PReputation
 * @notice Standalone, 100% isolated non-custodial trust and reputation engine for UnifyVault P2P trades.
 * @dev Provides decentralized, on-chain Sybil-mitigated reputation scoring for buyers and sellers.
 *
 * Architectural Invariants:
 * 1. ZERO FUNDS: Holds 0 native ETH and 0 ERC-20 tokens. Contains no payable functions or transfer methods.
 * 2. ZERO VAULT/ACCOUNTING COUPLING: Completely isolated from Vault NAV, CostBasisManager, Treasury, and Controller.
 * 3. READ-ONLY ESCROW INTROSPECTION: Verifies trade completion using staticcall against immutable P2PEscrowV2.
 * 4. DETERMINISTIC SCORING: Trust scores are pure on-chain mathematical calculations using Bayesian Laplace smoothing.
 * 5. IMMUTABLE RATINGS: Zero admin/multisig ability to modify, censor, edit, or delete ratings.
 *
 * Security Notice:
 * On-chain reputation provides Sybil MITIGATION through protocol fees, volume gates, and Bayesian priors;
 * it does not claim absolute Sybil prevention without centralized identity proofs.
 */
contract P2PReputation is IP2PReputation, ReentrancyGuard {
  // --- Constants ---
  uint256 public constant BAYESIAN_PRIOR_WEIGHT = 5; // C = 5 virtual baseline ratings
  uint256 public constant BAYESIAN_PRIOR_SCORE = 3; // R0 = 3.0 neutral baseline stars
  uint256 public constant MAX_BPS = 10000; // 100.00%
  uint256 public constant SCALE_FACTOR = 5; // 5-star maximum rating

  uint32 public constant MERCHANT_MIN_RATINGS = 20; // Minimum ratings to qualify for merchant tier
  uint16 public constant MERCHANT_MIN_TRUST_SCORE = 9000; // 90.00% minimum trust score for merchant tier
  uint128 public constant MERCHANT_MIN_SETTLED_VOLUME = 100 * 1e18; // 100 unit minimum volume threshold

  // --- Immutable Dependencies ---
  address public immutable override p2pEscrow;

  // --- Storage ---
  // tradeId => raterAddress => hasRated
  mapping(uint256 => mapping(address => bool)) private _hasRated;

  // tradeId => raterAddress => Rating
  mapping(uint256 => mapping(address => ReputationTypes.Rating)) private _ratings;

  // userAddress => UserReputationProfile
  mapping(address => ReputationTypes.UserReputationProfile) private _profiles;

  // Track if trade was already counted toward participant completed trade count: tradeId => recorded
  mapping(uint256 => bool) private _tradeCounted;

  // --- Custom Errors ---
  error ZeroAddressDetected();
  error InvalidScore();
  error UnauthorizedRater();
  error SelfRatingForbidden();
  error TradeNotReleased(uint256 tradeId, uint8 currentState);
  error AlreadyRated(uint256 tradeId, address rater);

  /**
   * @notice Initializes the reputation engine bound immutably to canonical P2PEscrowV2.
   * @param _p2pEscrow Address of the canonical P2PEscrowV2 contract.
   */
  constructor(address _p2pEscrow) {
    if (_p2pEscrow == address(0)) revert ZeroAddressDetected();
    p2pEscrow = _p2pEscrow;
  }

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
  ) external override nonReentrant {
    // 1. Validate Score Range (1 to 5 Stars)
    if (
      score < ReputationTypes.RatingValue.ONE_STAR || score > ReputationTypes.RatingValue.FIVE_STAR
    ) {
      revert InvalidScore();
    }

    // 2. Validate Duplicate Rating Prevention
    if (_hasRated[tradeId][msg.sender]) {
      revert AlreadyRated(tradeId, msg.sender);
    }

    // 3. Introspect Escrow State (Staticcall to P2PEscrowV2)
    EscrowTypes.Trade memory trade = IP2PEscrow(p2pEscrow).getTrade(tradeId);

    // 4. Verify Trade Is In Terminal RELEASED State
    if (trade.state != EscrowTypes.TradeState.RELEASED) {
      revert TradeNotReleased(tradeId, uint8(trade.state));
    }

    // 5. Verify Counterparty Identification & Authorization
    address rater = msg.sender;
    address target;
    ReputationTypes.ParticipantRole roleRated;

    if (rater == trade.buyer) {
      target = trade.seller;
      roleRated = ReputationTypes.ParticipantRole.SELLER;
    } else if (rater == trade.seller) {
      target = trade.buyer;
      roleRated = ReputationTypes.ParticipantRole.BUYER;
    } else {
      revert UnauthorizedRater();
    }

    if (target == rater || target == address(0)) {
      revert SelfRatingForbidden();
    }

    // 6. Mark Rating as Submitted for (tradeId, rater)
    _hasRated[tradeId][rater] = true;

    // 7. Store Detailed Rating Record
    _ratings[tradeId][rater] = ReputationTypes.Rating({
      score: score,
      timestamp: uint32(block.timestamp),
      feedbackHash: feedbackHash,
      rater: rater,
      target: target,
      roleRated: roleRated
    });

    // 8. Update Target Counterparty Reputation Profile
    uint8 numericScore = uint8(score);
    _updateProfile(target, roleRated, numericScore, trade.amount, tradeId);

    // 9. Emit Authoritative Rating Event
    emit RatingSubmitted(
      tradeId,
      rater,
      target,
      numericScore,
      feedbackHash,
      roleRated,
      block.timestamp
    );
  }

  /**
   * @dev Updates profile statistics for target counterparty upon rating submission.
   */
  function _updateProfile(
    address target,
    ReputationTypes.ParticipantRole roleRated,
    uint8 numericScore,
    uint256 tradeAmount,
    uint256 tradeId
  ) private {
    ReputationTypes.UserReputationProfile storage profile = _profiles[target];

    // Initialize timestamps
    if (profile.firstTradeTimestamp == 0) {
      profile.firstTradeTimestamp = uint32(block.timestamp);
    }
    profile.lastTradeTimestamp = uint32(block.timestamp);

    // Update completed trades count if this trade hasn't been counted for this target yet
    if (!_tradeCounted[tradeId]) {
      // First rating for this trade records trade completion for both buyer & seller
      EscrowTypes.Trade memory trade = IP2PEscrow(p2pEscrow).getTrade(tradeId);
      _profiles[trade.buyer].totalTradesAsBuyer++;
      _profiles[trade.seller].totalTradesAsSeller++;
      _tradeCounted[tradeId] = true;
    }

    // Update Role-Specific Ratings & Volume
    ReputationTypes.RoleReputation storage stats =
      (roleRated == ReputationTypes.ParticipantRole.SELLER)
        ? profile.sellerStats
        : profile.buyerStats;

    stats.ratingsCount++;
    stats.scoreSum += numericScore;
    stats.volumeSettled += uint128(tradeAmount);

    if (numericScore >= 4) {
      stats.positiveCount++;
    } else if (numericScore == 3) {
      stats.neutralCount++;
    } else {
      stats.negativeCount++;
    }
  }

  // --- View Methods ---

  /**
   * @notice Returns the full reputation profile of a given user address.
   */
  function getProfile(
    address user
  ) external view override returns (ReputationTypes.UserReputationProfile memory) {
    return _profiles[user];
  }

  /**
   * @notice Computes the Bayesian-smoothed trust score for a user acting as a Buyer (in BPS, 0 to 10000).
   */
  function getBuyerTrustScore(address user) external view override returns (uint16) {
    ReputationTypes.RoleReputation memory stats = _profiles[user].buyerStats;
    return calculateTrustScore(stats.ratingsCount, stats.scoreSum);
  }

  /**
   * @notice Computes the Bayesian-smoothed trust score for a user acting as a Seller (in BPS, 0 to 10000).
   */
  function getSellerTrustScore(address user) external view override returns (uint16) {
    ReputationTypes.RoleReputation memory stats = _profiles[user].sellerStats;
    return calculateTrustScore(stats.ratingsCount, stats.scoreSum);
  }

  /**
   * @notice Computes the combined Bayesian-smoothed trust score across both roles (in BPS, 0 to 10000).
   */
  function getCombinedTrustScore(address user) external view override returns (uint16) {
    ReputationTypes.UserReputationProfile memory p = _profiles[user];
    uint32 totalRatings = p.buyerStats.ratingsCount + p.sellerStats.ratingsCount;
    uint64 totalScoreSum = p.buyerStats.scoreSum + p.sellerStats.scoreSum;
    return calculateTrustScore(totalRatings, totalScoreSum);
  }

  /**
   * @notice Returns the confidence / trust tier for a user in the Buyer role.
   */
  function getBuyerTrustTier(
    address user
  ) external view override returns (ReputationTypes.TrustTier) {
    ReputationTypes.RoleReputation memory stats = _profiles[user].buyerStats;
    uint16 score = calculateTrustScore(stats.ratingsCount, stats.scoreSum);
    return computeTier(stats.ratingsCount, score, stats.volumeSettled);
  }

  /**
   * @notice Returns the confidence / trust tier for a user in the Seller role.
   */
  function getSellerTrustTier(
    address user
  ) external view override returns (ReputationTypes.TrustTier) {
    ReputationTypes.RoleReputation memory stats = _profiles[user].sellerStats;
    uint16 score = calculateTrustScore(stats.ratingsCount, stats.scoreSum);
    return computeTier(stats.ratingsCount, score, stats.volumeSettled);
  }

  /**
   * @notice Deterministic Bayesian Laplace smoothed trust score calculation.
   * Formula: ((C * R0 + sumScores) * 10000) / ((C + N) * 5)
   * Where C = 5 (prior weight), R0 = 3 (neutral baseline stars).
   * @param ratingsCount Total ratings received by the user.
   * @param scoreSum Sum of rating points (1-5 each).
   * @return trustScoreBps Trust score in basis points (0 to 10000).
   */
  function calculateTrustScore(
    uint32 ratingsCount,
    uint64 scoreSum
  ) public pure returns (uint16 trustScoreBps) {
    if (ratingsCount == 0) {
      return 0; // Unrated profile returns 0 BPS
    }

    uint256 numerator = (BAYESIAN_PRIOR_WEIGHT * BAYESIAN_PRIOR_SCORE + scoreSum) * MAX_BPS;
    uint256 denominator = (BAYESIAN_PRIOR_WEIGHT + ratingsCount) * SCALE_FACTOR;

    return uint16(numerator / denominator);
  }

  /**
   * @notice Computes the trust tier given rating count, Bayesian score, and cumulative settled volume.
   */
  function computeTier(
    uint32 ratingsCount,
    uint16 scoreBps,
    uint128 volumeSettled
  ) public pure returns (ReputationTypes.TrustTier) {
    if (ratingsCount == 0) {
      return ReputationTypes.TrustTier.UNRATED;
    }
    if (ratingsCount < 5) {
      return ReputationTypes.TrustTier.PROBATIONARY;
    }
    if (ratingsCount < MERCHANT_MIN_RATINGS) {
      return ReputationTypes.TrustTier.ESTABLISHED;
    }
    if (scoreBps >= MERCHANT_MIN_TRUST_SCORE && volumeSettled >= MERCHANT_MIN_SETTLED_VOLUME) {
      return ReputationTypes.TrustTier.VERIFIED_MERCHANT;
    }
    return ReputationTypes.TrustTier.ESTABLISHED;
  }

  /**
   * @notice Checks whether a specific participant has already rated a given trade ID.
   */
  function hasUserRated(uint256 tradeId, address user) external view override returns (bool) {
    return _hasRated[tradeId][user];
  }

  /**
   * @notice Retrieves the submitted rating record for a given trade and rater.
   */
  function getTradeRating(
    uint256 tradeId,
    address rater
  ) external view override returns (ReputationTypes.Rating memory) {
    return _ratings[tradeId][rater];
  }
}
