# Phase 6 P2P Reputation Security & Architecture Specification

**Document Version:** 1.0.0  
**Phase Target:** Phase 6 — Non-Custodial Decentralized Trust & Reputation Engine  
**Target File for Future Implementation:** `packages/protocol/src/reputation/P2PReputation.sol`  
**Execution Mode:** READ-ONLY Architectural, Cryptographic & Security Specification  
**Smart Contract Mutation Status:** ZERO CODE CHANGES / ZERO STATE MUTATIONS / ZERO DEPLOYMENTS

---

## 1. Executive Summary & Core Architectural Constraint Verification

### 1.1 Architectural Isolation Guarantee

The proposed `P2PReputation.sol` module is designed with **100% strict architectural and accounting isolation**.

Under **no circumstances** will `P2PReputation.sol`:

1. Hold, lock, escrow, custody, or route any protocol tokens or native ETH.
2. Transfer, approve, mint, burn, or seize `UVBE` index share tokens.
3. Interact with or modify `UnifyVaultController`, `CustodyVault`, or `Vault NAV`.
4. Interact with or mutate `CostBasisManagerV2` or `PerformanceManager`.
5. Read or modify `Treasury` balances or fee parameters.
6. Mutate storage or state transitions in `P2PEscrowV2` or `Marketplace`.
7. Possess or require any protocol administrative (`DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, `CONTROLLER_ROLE`, `GUARDIAN_ROLE`) privileges.

### 1.2 P2PEscrowV2 Read-Only Verification Feasibility Finding

> [!IMPORTANT]
> **Definitive Architectural Determination:**  
> `P2PEscrowV2` does **NOT** need to be modified. A new contract can reliably and authoritatively verify `RELEASED` trades from `P2PEscrowV2` using **100% read-only static state queries (`STATICCALL`)**.

- **Code Verification:** `P2PEscrowV2.sol` exposes `function getTrade(uint256 tradeId) external view override returns (EscrowTypes.Trade memory)`.
- **State Immutability:** When a trade reaches `EscrowTypes.TradeState.RELEASED`, it enters a terminal, immutable state in `_trades[tradeId]`.
- **Direct Introspection:** `P2PReputation.sol` can query `IP2PEscrow(escrow).getTrade(tradeId)` in real time during rating submission to verify counterparty identities, settled volume, and terminal release state with zero escrow callbacks and zero escrow code modifications.

---

## 2. Section I: VERIFIED FROM EXISTING CODE

Every item in this section has been strictly verified from the existing codebase (`packages/protocol/src/escrow/P2PEscrowV2.sol`, `packages/protocol/src/types/EscrowTypes.sol`, `packages/protocol/src/events/Events.sol`, `packages/protocol/src/marketplace/Marketplace.sol`, `packages/protocol/src/libraries/AccessRoles.sol`).

### 2.1 Exact P2PEscrowV2 State Machine & Lifecycle

The on-chain escrow lifecycle is defined by `EscrowTypes.TradeState`:

```
   [NONE (0)]
        |
        v (createTrade)
   [CREATED (1)] -----------------------------------------> [CANCELLED (7)] (cancelUnfundedTrade)
        |
        v (fundTrade / createTrade with funding)
   [FUNDED (2)] ------------------------------------------> [REFUNDED (6)] (refund after window expiry)
        |
        v (submitPayment with UTR + EvidenceHash)
   [PAYMENT_SUBMITTED (3)] --------------------------------> [REFUNDED (6)] (voluntary buyer refund)
        |               \
        |                \ (raiseDispute)
        |                 v
        |           [DISPUTED (4)]
        |           /            \ (resolveDispute)
        |          /              v
        v         v          [REFUNDED (6)]
   [RELEASED (5)] <------------------/
```

- **`NONE (0)`**: Uninitialized or non-existent trade. Any call to `getTrade(tradeId)` reverts with `ProtocolErrors.TradeDoesNotExist(tradeId)`.
- **`CREATED (1)`**: Trade initialized with `buyer`, `seller`, `asset`, `amount`, `fiatAmount`, `fiatCurrency`, `paymentWindow`.
- **`FUNDED (2)`**: Seller deposited crypto collateral. `fundingTimestamp = block.timestamp`.
- **`PAYMENT_SUBMITTED (3)`**: Buyer submitted off-chain payment reference (UTR) and evidence hash (receipt CID/Keccak256). `paymentTimestamp = block.timestamp`.
- **`DISPUTED (4)`**: Buyer or seller raised dispute during `PAYMENT_SUBMITTED`. `disputeInitiator` recorded.
- **`RELEASED (5)`**: Terminal state. Fiat receipt confirmed by seller (`confirmAndRelease`) OR arbitrator resolved in favor of buyer (`resolveDispute(..., RELEASE_TO_BUYER)`). Net crypto transferred to buyer; protocol fee transferred to treasury.
- **`REFUNDED (6)`**: Terminal state. Crypto refunded back to seller due to payment timeout, buyer forfeiture, or dispute resolution.
- **`CANCELLED (7)`**: Terminal state. Unfunded trade cancelled.

### 2.2 Authoritative Proof of `RELEASED` State

1. **Storage Field**: `EscrowTypes.Trade.state == EscrowTypes.TradeState.RELEASED` (integer enum value `5`).
2. **Authoritative Event**: `event EscrowReleased(uint256 indexed tradeId, address indexed buyer, uint256 netPayout, uint256 feeCollected)`.
3. **Immutability Guarantee**: In `P2PEscrowV2.sol`, `_releaseInternal` sets `trade.state = EscrowTypes.TradeState.RELEASED`. There are zero code paths that allow transitioning out of `RELEASED`.

### 2.3 Trade Participant Address Extraction

`IP2PEscrow.getTrade(uint256 tradeId)` returns `EscrowTypes.Trade`:

```solidity
struct Trade {
  uint256 tradeId;
  address buyer; // Designated Buyer Address
  address seller; // Designated Seller Address
  address asset; // Token address (or address(0) for ETH)
  uint256 amount; // Crypto amount in token decimals
  uint256 fiatAmount; // Informative fiat amount expected off-chain
  bytes32 fiatCurrency; // e.g. "INR" / "USD"
  TradeState state; // Must be TradeState.RELEASED (5)
  uint256 paymentWindow; // Payment window duration in seconds
  uint256 fundingTimestamp; // Timestamp of seller collateral deposit
  uint256 paymentTimestamp; // Timestamp of buyer payment claim
  bytes32 paymentReference; // Unique UTR hash
  bytes32 evidenceHash; // Unique Receipt hash
  address disputeInitiator; // Address(0) unless disputed
}
```

- **Validation**:
  - Buyer: `trade.buyer`
  - Seller: `trade.seller`
  - Invariant: `trade.buyer != address(0) && trade.seller != address(0) && trade.buyer != trade.seller` (enforced at trade creation).

### 2.4 Refunds and Disputes Representation

- **Refunded Trades**: `trade.state == EscrowTypes.TradeState.REFUNDED` (integer `6`).
- **Disputed Trades**: `trade.state == EscrowTypes.TradeState.DISPUTED` (integer `4`). If resolved to seller, becomes `REFUNDED`; if resolved to buyer, becomes `RELEASED`.

---

## 3. Section II: DESIGN DECISIONS

### 3.1 Trust & Reputation System Architecture

```
                                  +------------------------+
                                  |      P2PEscrowV2       |
                                  |  (0xd2A5...04Bb)       |
                                  +-----------+------------+
                                              ^
                                              | staticcall getTrade(tradeId)
                                              | (Read-Only State Introspection)
                                              |
+-------------------+             +-----------+------------+
| P2P Buyer/Seller  | ----------> |     P2PReputation      | (Isolated Module)
| (Trade Rater)     | submitRating|   - No token balances  |
+-------------------+             |   - No vault custody   |
                                  |   - Trust Score Math   |
                                  +------------------------+
```

### 3.2 Dual-Sided Bilateral Rating Mechanism

- A trade has two participants: `trade.buyer` and `trade.seller`.
- Each completed `RELEASED` trade allows **both parties** to submit exactly one rating for their counterparty:
  - If `msg.sender == trade.buyer`, target is `trade.seller`, rating category is `SELLER_RATING`.
  - If `msg.sender == trade.seller`, target is `trade.buyer`, rating category is `BUYER_RATING`.
- Ratings are submitted on-chain without any centralized off-chain database.

### 3.3 Storage Structures for `P2PReputation.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { EscrowTypes } from '../types/EscrowTypes.sol';
import { IP2PEscrow } from '../interfaces/IP2PEscrow.sol';

library ReputationTypes {
  enum RatingValue {
    NONE, // 0 - Unset
    ONE_STAR, // 1 - Strongly Negative
    TWO_STAR, // 2 - Negative
    THREE_STAR, // 3 - Neutral
    FOUR_STAR, // 4 - Positive
    FIVE_STAR // 5 - Strongly Positive
  }

  enum TrustTier {
    UNRATED, // 0 Trades: Zero trust history
    PROBATIONARY, // 1-4 Trades: Low confidence
    ESTABLISHED, // 5-19 Trades: Medium confidence (Bayesian active)
    VERIFIED_MERCHANT // 20+ Trades & >= 90% positive score: High confidence
  }

  struct Rating {
    RatingValue score; // 1 to 5
    uint32 timestamp; // block.timestamp of rating submission
    bytes32 feedbackHash; // IPFS CID or cryptographic hash of textual review
  }

  struct Profile {
    uint32 totalTradesCompleted; // Total RELEASED trades where account participated
    uint32 totalRatingsReceived; // Total ratings received from counterparties
    uint64 ratingScoreSum; // Sum of rating points (1-5)
    uint32 positiveRatings; // Count of 4-star and 5-star ratings
    uint32 neutralRatings; // Count of 3-star ratings
    uint32 negativeRatings; // Count of 1-star and 2-star ratings
    uint128 totalVolumeSettled; // Cumulative token volume settled across trades
    uint32 firstTradeTimestamp; // Timestamp of first completed trade
    uint32 lastTradeTimestamp; // Timestamp of most recent completed trade
  }
}
```

### 3.4 Deterministic Bayesian Trust Score Formula

A simple arithmetic average $\frac{\sum \text{ratings}}{N}$ is vulnerable to low-volume manipulation (e.g. 1 single trade with 5 stars creates a deceptive "100% 5.0 Star" profile).

To prevent this on-chain with deterministic integer math, `P2PReputation` implements a **Bayesian Laplace-Smoothed Trust Engine**:

#### Mathematical Definition:

$$\text{TrustScore (BPS)} = \frac{\left(C \cdot R_0 + \sum \text{ScorePoints}\right)}{C + N} \times \frac{10000}{5}$$

Where:

- $N$ = `totalRatingsReceived`
- $\sum \text{ScorePoints}$ = `ratingScoreSum` (each rating is integer 1 to 5)
- $C = 5$ (Confidence Prior Weight: virtual baseline equivalent to 5 trades)
- $R_0 = 3$ (Neutral Prior Rating: 3.0 Stars = 3 points)
- Scaling: Output normalized to Basis Points ($0 \le \text{TrustScore} \le 10000$, where $10000 = 100\% = 5.0\text{ stars}$).

#### Solidity Implementation:

```solidity
function calculateTrustScore(
  uint32 totalRatings,
  uint64 scoreSum
) public pure returns (uint16 trustScoreBps) {
  if (totalRatings == 0) {
    return 0; // Unrated profile returns 0 BPS
  }

  uint256 priorWeight = 5; // C = 5
  uint256 priorScore = 3; // R0 = 3

  // (5 * 3 + scoreSum) * 10000 / ((5 + totalRatings) * 5)
  uint256 numerator = (priorWeight * priorScore + scoreSum) * 10000;
  uint256 denominator = (priorWeight + totalRatings) * 5;

  return uint16(numerator / denominator);
}
```

#### Numerical Validation of Bayesian Behavior:

1. **User with 0 trades**: Score = `0 BPS` (Unrated).
2. **User with 1 trade of 5 stars**:
   $$\text{Score} = \frac{(5 \cdot 3 + 5)}{(5 + 1) \cdot 5} \times 10000 = \frac{20}{30} \times 10000 = 6666\text{ BPS } (66.66\%)$$
   _(Prevents instant 100% trust inflation after 1 trade)_.
3. **User with 5 trades of 5 stars**:
   $$\text{Score} = \frac{(15 + 25)}{(10 \cdot 5)} \times 10000 = \frac{40}{50} \times 10000 = 8000\text{ BPS } (80.00\%)$$
4. **User with 20 trades of 5 stars**:
   $$\text{Score} = \frac{(15 + 100)}{(25 \cdot 5)} \times 10000 = \frac{115}{125} \times 10000 = 9200\text{ BPS } (92.00\%)$$
5. **User with 100 trades of 5 stars**:
   $$\text{Score} = \frac{(15 + 500)}{(105 \cdot 5)} \times 10000 = \frac{515}{525} \times 10000 = 9809\text{ BPS } (98.09\%)$$

### 3.5 Minimum-Trade Confidence Tiers

```solidity
function getTrustTier(
  uint32 completedTrades,
  uint16 trustScoreBps
) public pure returns (ReputationTypes.TrustTier) {
  if (completedTrades == 0) return ReputationTypes.TrustTier.UNRATED;
  if (completedTrades < 5) return ReputationTypes.TrustTier.PROBATIONARY;
  if (completedTrades < 20) return ReputationTypes.TrustTier.ESTABLISHED;
  if (trustScoreBps >= 9000) return ReputationTypes.TrustTier.VERIFIED_MERCHANT;
  return ReputationTypes.TrustTier.ESTABLISHED;
}
```

---

## 4. Section III: SECURITY ASSUMPTIONS

1. **`P2PEscrowV2` Integrity**: It is assumed that `P2PEscrowV2` at `0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb` enforces `trade.buyer != trade.seller` and only sets `state = RELEASED` when crypto has genuinely settled to the buyer.
2. **Terminal State Guarantee**: It is assumed that once a trade ID is `RELEASED`, its state in `P2PEscrowV2` never transitions to any other state.
3. **Trade ID Uniqueness**: It is assumed that each `tradeId` is generated via a strictly monotonic counter (`_tradeCounter++`), ensuring `tradeId` values are globally unique per escrow deployment.
4. **Off-Chain Sybil Economic Cost**: It is assumed that wash trading in `P2PEscrowV2` requires paying the protocol escrow fee (`feeBps`, default 100 BPS = 1.0%), imposing non-zero economic cost per fake trade.

---

## 5. Section IV: OPEN QUESTIONS & FUTURE SCOPE

1. **Dispute Penalty / Disputed Trade Tracking**: Should trades resolved via arbitrator with `REFUND_TO_SELLER` be recorded as a negative event against the buyer or seller?
   - _Resolution for Phase 6_: Only `RELEASED` trades qualify for positive/neutral/negative rating submission. Trades ending in `REFUNDED` are excluded from standard rating to prevent retaliatory griefing from canceled/disputed trades.
2. **Review Text Storage**: How are textual reviews stored?
   - _Resolution_: Text is stored off-chain (IPFS/Arweave); only the 32-byte cryptographic hash `bytes32 feedbackHash` is anchored on-chain.
3. **Upgradability / Multi-Escrow Binding**: Can the reputation contract support future escrow contract upgrades?
   - _Resolution_: The canonical `p2pEscrow` address is set at deployment. If multi-escrow support is needed, a registry whitelist can be configured by `GOVERNANCE_ROLE` without modifying escrow contracts.

---

## 6. Comprehensive Threat Model & Attack Matrix

| Attack Vector                        | Threat Description                                    | Mitigation Mechanism in `P2PReputation.sol`                                                                                                                | Severity                         |
| :----------------------------------- | :---------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------- |
| **Fake Ratings**                     | Submitting rating without a real trade                | `p2pEscrow.getTrade(tradeId)` is queried via `staticcall`. If trade does not exist or `state != RELEASED`, transaction reverts.                            | **CRITICAL (Blocked)**           |
| **Duplicate Ratings**                | Same user rating the same trade multiple times        | Double-spend guard: `require(!hasRated[tradeId][msg.sender])`. `hasRated` is set to `true` on first submission.                                            | **HIGH (Blocked)**               |
| **Unauthorized Ratings**             | Third-party address attempting to rate a trade        | Authorization check: `require(msg.sender == trade.buyer                                                                                                    |                                  | msg.sender == trade.seller)`. | **CRITICAL (Blocked)** |
| **Rating Before RELEASED**           | Rating an active, funded, or disputed trade           | State check: `require(trade.state == EscrowTypes.TradeState.RELEASED)`.                                                                                    | **CRITICAL (Blocked)**           |
| **Self-Rating**                      | User rating themselves                                | Target address is resolved as: `target = (msg.sender == trade.buyer) ? trade.seller : trade.buyer`. `trade.buyer != trade.seller` is guaranteed by escrow. | **HIGH (Blocked)**               |
| **Non-Participant Rating**           | Random EOA rating high-volume trades                  | Reverts with `UnauthorizedRater()` if `msg.sender != buyer && msg.sender != seller`.                                                                       | **HIGH (Blocked)**               |
| **Refunded Trade Rating**            | Submitting rating on a timed-out or cancelled trade   | Reverts because `trade.state == REFUNDED (6)` or `CANCELLED (7)`, not `RELEASED (5)`.                                                                      | **MEDIUM (Blocked)**             |
| **Sybil Wash Trading**               | Creating hundreds of $0.01 trades to inflate count    | Escrow charges 1% fee on each trade. Bayesian confidence formula dampens initial trades. Profiles track cumulative settled volume alongside trade counts.  | **MEDIUM (Mitigated)**           |
| **Low-Volume Score Inflation**       | 1 trade of 5 stars claiming 100% trust score          | Bayesian Laplace prior ($C=5, R_0=3$) mathematically caps 1-trade score at 66.66% and requires 20+ trades for Verified Merchant tier.                      | **MEDIUM (Mitigated)**           |
| **Admin Score Manipulation**         | Admin artificially changing a user's trust score      | Zero admin setter functions for reputation scores. Scores are pure on-chain deterministic calculations.                                                    | **HIGH (Blocked by Design)**     |
| **Integer Overflow**                 | Score summation arithmetic overflow                   | Solidity 0.8.24 native checked arithmetic prevents overflow. `ratingScoreSum` uses `uint64`.                                                               | **LOW (Blocked)**                |
| **Reentrancy**                       | Rater attempting reentrancy into reputation or escrow | Zero external state mutating calls or token transfers; functions follow Checks-Effects-Interactions pattern + `ReentrancyGuard`.                           | **HIGH (Blocked)**               |
| **Vault / Accounting Contamination** | Reputation interfering with NAV or cost basis         | `P2PReputation` has zero code references or links to `Controller`, `Vault`, `Treasury`, `CostBasisManager`, or `PortfolioManager`.                         | **CRITICAL (Blocked by Design)** |

---

## 7. Exact Contract Interfaces for Phase 6

### 7.1 `IP2PReputation.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ReputationTypes } from '../types/ReputationTypes.sol';

interface IP2PReputation {
  event RatingSubmitted(
    uint256 indexed tradeId,
    address indexed rater,
    address indexed target,
    uint8 score,
    bytes32 feedbackHash,
    uint256 timestamp
  );

  function submitRating(
    uint256 tradeId,
    ReputationTypes.RatingValue score,
    bytes32 feedbackHash
  ) external;

  function getProfile(address user) external view returns (ReputationTypes.Profile memory);
  function getTrustScore(address user) external view returns (uint16 scoreBps);
  function getTrustTier(address user) external view returns (ReputationTypes.TrustTier);
  function hasUserRated(uint256 tradeId, address user) external view returns (bool);
}
```

---

## 8. Test Matrix for Phase 6 Implementation

When implementation begins, the test suite (`packages/protocol/test/reputation/P2PReputation.t.sol` and `packages/protocol/test/fork/P2PReputationLiveFork.t.sol`) must validate:

### Unit Tests

1. `test_submitRating_buyerRatesSeller_success`: Buyer successfully rates seller on a RELEASED trade.
2. `test_submitRating_sellerRatesBuyer_success`: Seller successfully rates buyer on a RELEASED trade.
3. `test_revert_ratingUnreleasedTrade`: Reverts if trade is `FUNDED` or `PAYMENT_SUBMITTED`.
4. `test_revert_duplicateRating`: Reverts if same participant submits a second rating for same trade ID.
5. `test_revert_nonParticipantRating`: Reverts if caller is neither buyer nor seller.
6. `test_revert_invalidScoreZero`: Reverts if `score == RatingValue.NONE`.
7. `test_revert_invalidScoreOutOfBounds`: Reverts if `score > RatingValue.FIVE_STAR`.
8. `test_revert_refundedTrade`: Reverts if trade ended in `REFUNDED`.

### Fuzz & Invariant Tests

1. `invariant_scoreBoundedBetween0And10000`: `trustScoreBps <= 10000` for all random rating sequences.
2. `invariant_zeroFundBalances`: `address(p2pReputation).balance == 0` and token balance is zero at all times.
3. `fuzz_bayesianScoreMonotonicity`: Adding 5-star ratings strictly increases or maintains score; adding 1-star ratings strictly decreases or maintains score.

### Live Fork Verification Gate

1. `test_fork_realEscrowTradeIntrospection`: Verifies static querying against live Base Sepolia `P2PEscrowV2` (`0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb`).
2. `test_fork_accountingIsolationPreserved`: Confirms Vault NAV, UVBE Supply, and Cost Basis are 100% unaffected after 100 reputation rating cycles.

---

## 9. Deployment & Security Pre-Flight Checklist

- [x] Zero changes to existing contracts (`P2PEscrowV2`, `Marketplace`, `CustodyVault`, `Controller`, `Treasury`, `CostBasisManagerV2`).
- [x] Zero changes to production state, roles, or whitelists.
- [x] `P2PReputation` contains no payable functions, fallback, or token receiving hooks.
- [x] All rating submissions verified via read-only `IP2PEscrow.getTrade(tradeId)` calls.
- [x] Full test matrix and Bayesian trust math formally specified.
