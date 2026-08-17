// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/reputation/P2PReputation.sol';
import '../../src/types/EscrowTypes.sol';
import '../../src/types/ReputationTypes.sol';
import { Errors as ProtocolErrors } from '../../src/errors/Errors.sol';

contract MockReputationERC20 is ERC20 {
  constructor() ERC20('Mock Token', 'MOCK') {
    _mint(msg.sender, 10000000 * 1e18);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract P2PReputationTest is Test {
  P2PEscrowV2 public escrow;
  P2PReputation public reputation;
  MockReputationERC20 public token;

  address public admin = address(this);
  address public treasury = address(0x888);
  address public arbitrator = address(0x999);
  address public seller = address(0x111);
  address public buyer = address(0x222);
  address public attacker = address(0x666);
  address public honestBuyer2 = address(0x333);

  uint256 public constant TRADE_AMOUNT = 100 * 1e18;
  uint256 public constant FIAT_AMOUNT = 100 * 1e2;
  bytes32 public constant CURRENCY_INR = keccak256('INR');
  uint256 public constant PAYMENT_WINDOW = 15 minutes;

  bytes32 public constant SAMPLE_FEEDBACK_1 = keccak256('FAST_PAYMENT_GREAT_BUYER');
  bytes32 public constant SAMPLE_FEEDBACK_2 = keccak256('QUICK_RELEASE_TRUSTED_SELLER');

  event RatingSubmitted(
    uint256 indexed tradeId,
    address indexed rater,
    address indexed target,
    uint8 score,
    bytes32 feedbackHash,
    ReputationTypes.ParticipantRole roleRated,
    uint256 timestamp
  );

  function setUp() public {
    escrow = new P2PEscrowV2(treasury, 100); // 1.00% fee
    reputation = new P2PReputation(address(escrow));
    token = new MockReputationERC20();

    escrow.grantRole(AccessRoles.ARBITRATOR_ROLE, arbitrator);

    token.mint(seller, 1000000 * 1e18);
    token.mint(buyer, 1000000 * 1e18);

    vm.prank(seller);
    token.approve(address(escrow), type(uint256).max);

    vm.prank(buyer);
    token.approve(address(escrow), type(uint256).max);
  }

  // --- Helper to create a settled RELEASED trade ---
  function _createAndReleaseTrade(
    address _seller,
    address _buyer,
    uint256 _amount,
    bytes32 _utr,
    bytes32 _evidence
  ) internal returns (uint256 tradeId) {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: _buyer,
      seller: _seller,
      asset: address(token),
      amount: _amount,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_INR,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(_seller);
    tradeId = escrow.createTrade(params);

    vm.prank(_buyer);
    escrow.submitPayment(tradeId, _utr, _evidence);

    vm.prank(_seller);
    escrow.confirmAndRelease(tradeId);

    EscrowTypes.Trade memory t = escrow.getTrade(tradeId);
    assertEq(uint8(t.state), uint8(EscrowTypes.TradeState.RELEASED));
  }

  // =========================================================================
  // 1. Core Rating Tests: Buyer Rates Seller & Seller Rates Buyer
  // =========================================================================

  function test_BuyerRatesSeller_Success() public {
    uint256 tradeId = _createAndReleaseTrade(
      seller,
      buyer,
      TRADE_AMOUNT,
      keccak256('UTR_1'),
      keccak256('EVID_1')
    );

    vm.expectEmit(true, true, true, true);
    emit RatingSubmitted(
      tradeId,
      buyer,
      seller,
      uint8(ReputationTypes.RatingValue.FIVE_STAR),
      SAMPLE_FEEDBACK_1,
      ReputationTypes.ParticipantRole.SELLER,
      block.timestamp
    );

    vm.prank(buyer);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);

    assertTrue(reputation.hasUserRated(tradeId, buyer));
    assertFalse(reputation.hasUserRated(tradeId, seller));

    ReputationTypes.UserReputationProfile memory prof = reputation.getProfile(seller);
    assertEq(prof.totalTradesAsSeller, 1);
    assertEq(prof.sellerStats.ratingsCount, 1);
    assertEq(prof.sellerStats.scoreSum, 5);
    assertEq(prof.sellerStats.positiveCount, 1);
    assertEq(prof.sellerStats.neutralCount, 0);
    assertEq(prof.sellerStats.negativeCount, 0);
    assertEq(prof.sellerStats.volumeSettled, TRADE_AMOUNT);

    // Check Bayesian Score (1 rating of 5 stars = 6666 BPS)
    uint16 sellerScore = reputation.getSellerTrustScore(seller);
    assertEq(sellerScore, 6666);
    assertEq(
      uint8(reputation.getSellerTrustTier(seller)),
      uint8(ReputationTypes.TrustTier.PROBATIONARY)
    );
  }

  function test_SellerRatesBuyer_Success() public {
    uint256 tradeId = _createAndReleaseTrade(
      seller,
      buyer,
      TRADE_AMOUNT,
      keccak256('UTR_2'),
      keccak256('EVID_2')
    );

    vm.expectEmit(true, true, true, true);
    emit RatingSubmitted(
      tradeId,
      seller,
      buyer,
      uint8(ReputationTypes.RatingValue.FOUR_STAR),
      SAMPLE_FEEDBACK_2,
      ReputationTypes.ParticipantRole.BUYER,
      block.timestamp
    );

    vm.prank(seller);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FOUR_STAR, SAMPLE_FEEDBACK_2);

    assertTrue(reputation.hasUserRated(tradeId, seller));

    ReputationTypes.UserReputationProfile memory prof = reputation.getProfile(buyer);
    assertEq(prof.totalTradesAsBuyer, 1);
    assertEq(prof.buyerStats.ratingsCount, 1);
    assertEq(prof.buyerStats.scoreSum, 4);
    assertEq(prof.buyerStats.positiveCount, 1);

    // Bayesian Score: (5*3 + 4)*10000 / (6*5) = 190000 / 30 = 6333 BPS
    uint16 buyerScore = reputation.getBuyerTrustScore(buyer);
    assertEq(buyerScore, 6333);
    assertEq(
      uint8(reputation.getBuyerTrustTier(buyer)),
      uint8(ReputationTypes.TrustTier.PROBATIONARY)
    );
  }

  // =========================================================================
  // 2. Bilateral Rating Test (Both parties rate each other on same trade)
  // =========================================================================

  function test_BilateralRating_BothPartiesRate_Success() public {
    uint256 tradeId = _createAndReleaseTrade(
      seller,
      buyer,
      TRADE_AMOUNT,
      keccak256('UTR_BI'),
      keccak256('EVID_BI')
    );

    // Buyer rates Seller 5 stars
    vm.prank(buyer);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);

    // Seller rates Buyer 4 stars
    vm.prank(seller);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FOUR_STAR, SAMPLE_FEEDBACK_2);

    assertTrue(reputation.hasUserRated(tradeId, buyer));
    assertTrue(reputation.hasUserRated(tradeId, seller));

    assertEq(reputation.getProfile(seller).sellerStats.ratingsCount, 1);
    assertEq(reputation.getProfile(buyer).buyerStats.ratingsCount, 1);
  }

  // =========================================================================
  // 3. Security Revert Tests: Duplicate, Non-Participant, Invalid Score
  // =========================================================================

  function test_Revert_DuplicateRating() public {
    uint256 tradeId = _createAndReleaseTrade(
      seller,
      buyer,
      TRADE_AMOUNT,
      keccak256('UTR_DUP'),
      keccak256('EVID_DUP')
    );

    vm.prank(buyer);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);

    // Second rating by same buyer on same trade must revert
    vm.prank(buyer);
    vm.expectRevert(abi.encodeWithSelector(P2PReputation.AlreadyRated.selector, tradeId, buyer));
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FOUR_STAR, SAMPLE_FEEDBACK_1);
  }

  function test_Revert_NonParticipantRating() public {
    uint256 tradeId = _createAndReleaseTrade(
      seller,
      buyer,
      TRADE_AMOUNT,
      keccak256('UTR_NON'),
      keccak256('EVID_NON')
    );

    vm.prank(attacker);
    vm.expectRevert(P2PReputation.UnauthorizedRater.selector);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);
  }

  function test_Revert_InvalidScore_ZeroOrOutOfBounds() public {
    uint256 tradeId = _createAndReleaseTrade(
      seller,
      buyer,
      TRADE_AMOUNT,
      keccak256('UTR_SCR'),
      keccak256('EVID_SCR')
    );

    // Score NONE (0)
    vm.prank(buyer);
    vm.expectRevert(P2PReputation.InvalidScore.selector);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.NONE, SAMPLE_FEEDBACK_1);

    // Score > 5 via low-level call reverts during ABI decode or execution
    vm.prank(buyer);
    (bool success, ) = address(reputation).call(
      abi.encodeWithSelector(
        P2PReputation.submitRating.selector,
        tradeId,
        uint8(6),
        SAMPLE_FEEDBACK_1
      )
    );
    assertFalse(success);
  }

  // =========================================================================
  // 4. Pre-Release & Non-Released State Revert Tests
  // =========================================================================

  function test_Revert_RatingPreRelease_CreatedState() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_INR,
      paymentWindow: PAYMENT_WINDOW
    });

    // Created but unfunded
    vm.prank(buyer);
    uint256 tradeId = escrow.createTrade(params);

    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(
        P2PReputation.TradeNotReleased.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.CREATED)
      )
    );
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);
  }

  function test_Revert_RatingPreRelease_FundedState() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_INR,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(seller);
    uint256 tradeId = escrow.createTrade(params);

    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(
        P2PReputation.TradeNotReleased.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.FUNDED)
      )
    );
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);
  }

  function test_Revert_RatingPreRelease_PaymentSubmittedState() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_INR,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(seller);
    uint256 tradeId = escrow.createTrade(params);

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR_PS'), keccak256('EVID_PS'));

    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(
        P2PReputation.TradeNotReleased.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.PAYMENT_SUBMITTED)
      )
    );
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);
  }

  function test_Revert_RatingRefundedTrade() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_INR,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(seller);
    uint256 tradeId = escrow.createTrade(params);

    // Fast forward past payment window to trigger refund
    vm.warp(block.timestamp + PAYMENT_WINDOW + 1);

    vm.prank(seller);
    escrow.refund(tradeId);

    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(
        P2PReputation.TradeNotReleased.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.REFUNDED)
      )
    );
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);
  }

  function test_Revert_RatingCancelledTrade() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_INR,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(buyer);
    uint256 tradeId = escrow.createTrade(params);

    vm.prank(buyer);
    escrow.cancelUnfundedTrade(tradeId);

    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(
        P2PReputation.TradeNotReleased.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.CANCELLED)
      )
    );
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);
  }

  function test_Revert_RatingDisputedTrade() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_INR,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(seller);
    uint256 tradeId = escrow.createTrade(params);

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR_DISP'), keccak256('EVID_DISP'));

    vm.prank(seller);
    escrow.raiseDispute(tradeId, keccak256('PAYMENT_NOT_RECEIVED'));

    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(
        P2PReputation.TradeNotReleased.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.DISPUTED)
      )
    );
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);
  }

  function test_DisputeResolvedToBuyer_CanBeRated() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_INR,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(seller);
    uint256 tradeId = escrow.createTrade(params);

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR_DISP_RES'), keccak256('EVID_DISP_RES'));

    vm.prank(seller);
    escrow.raiseDispute(tradeId, keccak256('PAYMENT_NOT_RECEIVED'));

    // Arbitrator resolves to buyer -> RELEASED
    vm.prank(arbitrator);
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER);

    // Trade is now RELEASED, buyer can rate
    vm.prank(buyer);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);

    assertTrue(reputation.hasUserRated(tradeId, buyer));
  }

  // =========================================================================
  // 5. Mathematical Bayesian Trust Score Progression & Confidence Tiers
  // =========================================================================

  function test_BayesianScoreProgression() public {
    assertEq(reputation.calculateTrustScore(0, 0), 0); // 0 ratings

    // 1 rating of 5 stars: (15 + 5)*10000 / (6*5) = 200000 / 30 = 6666 BPS
    assertEq(reputation.calculateTrustScore(1, 5), 6666);

    // 5 ratings of 5 stars: (15 + 25)*10000 / (10*5) = 400000 / 50 = 8000 BPS
    assertEq(reputation.calculateTrustScore(5, 25), 8000);

    // 20 ratings of 5 stars: (15 + 100)*10000 / (25*5) = 1150000 / 125 = 9200 BPS
    assertEq(reputation.calculateTrustScore(20, 100), 9200);

    // 100 ratings of 5 stars: (15 + 500)*10000 / (105*5) = 5150000 / 525 = 9809 BPS
    assertEq(reputation.calculateTrustScore(100, 500), 9809);

    // 5 ratings of 1 star: (15 + 5)*10000 / (10*5) = 200000 / 50 = 4000 BPS
    assertEq(reputation.calculateTrustScore(5, 5), 4000);
  }

  function test_ConfidenceTiers_ProgressionAndMerchantThreshold() public {
    // 0 ratings -> UNRATED
    assertEq(uint8(reputation.computeTier(0, 0, 0)), uint8(ReputationTypes.TrustTier.UNRATED));

    // 1-4 ratings -> PROBATIONARY
    assertEq(
      uint8(reputation.computeTier(1, 6666, 100 * 1e18)),
      uint8(ReputationTypes.TrustTier.PROBATIONARY)
    );
    assertEq(
      uint8(reputation.computeTier(4, 7500, 100 * 1e18)),
      uint8(ReputationTypes.TrustTier.PROBATIONARY)
    );

    // 5-19 ratings -> ESTABLISHED
    assertEq(
      uint8(reputation.computeTier(5, 8000, 100 * 1e18)),
      uint8(ReputationTypes.TrustTier.ESTABLISHED)
    );
    assertEq(
      uint8(reputation.computeTier(19, 9100, 100 * 1e18)),
      uint8(ReputationTypes.TrustTier.ESTABLISHED)
    );

    // 20 ratings with high score but INSUFFICIENT volume (< 100 tokens) -> ESTABLISHED (Not Verified Merchant)
    assertEq(
      uint8(reputation.computeTier(20, 9200, 50 * 1e18)),
      uint8(ReputationTypes.TrustTier.ESTABLISHED)
    );

    // 20 ratings with high score AND sufficient volume (>= 100 tokens) -> VERIFIED_MERCHANT
    assertEq(
      uint8(reputation.computeTier(20, 9200, 100 * 1e18)),
      uint8(ReputationTypes.TrustTier.VERIFIED_MERCHANT)
    );

    // 20 ratings with sufficient volume but LOW score (< 9000 BPS) -> ESTABLISHED
    assertEq(
      uint8(reputation.computeTier(20, 8500, 500 * 1e18)),
      uint8(ReputationTypes.TrustTier.ESTABLISHED)
    );
  }

  // =========================================================================
  // 6. Buyer vs Seller Profile Isolation
  // =========================================================================

  function test_BuyerAndSellerStats_CompleteDecoupling() public {
    uint256 tradeId = _createAndReleaseTrade(
      seller,
      buyer,
      TRADE_AMOUNT,
      keccak256('UTR_ISO'),
      keccak256('EVID_ISO')
    );

    // Buyer rates seller 5 stars
    vm.prank(buyer);
    reputation.submitRating(tradeId, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);

    ReputationTypes.UserReputationProfile memory sProf = reputation.getProfile(seller);
    assertEq(sProf.sellerStats.ratingsCount, 1);
    assertEq(sProf.buyerStats.ratingsCount, 0); // Buyer stats must be untouched!
    assertEq(reputation.getSellerTrustScore(seller), 6666);
    assertEq(reputation.getBuyerTrustScore(seller), 0); // 0 BPS unrated buyer
  }

  // =========================================================================
  // 7. Sybil Micro-Trade Mitigation Test
  // =========================================================================

  function test_SybilMicroTrade_VolumeGatingMitigation() public {
    // Attacker does 20 micro-trades of 1 wei
    for (uint256 i = 1; i <= 20; i++) {
      uint256 tid = _createAndReleaseTrade(
        seller,
        buyer,
        1, // 1 wei
        keccak256(abi.encodePacked('UTR_SYBIL_', i)),
        keccak256(abi.encodePacked('EVID_SYBIL_', i))
      );

      vm.prank(buyer);
      reputation.submitRating(tid, ReputationTypes.RatingValue.FIVE_STAR, SAMPLE_FEEDBACK_1);
    }

    ReputationTypes.UserReputationProfile memory prof = reputation.getProfile(seller);
    assertEq(prof.sellerStats.ratingsCount, 20);
    assertEq(prof.sellerStats.volumeSettled, 20); // only 20 wei total volume!

    // Trust score is high (9200 BPS)
    uint16 score = reputation.getSellerTrustScore(seller);
    assertEq(score, 9200);

    // BUT Tier remains ESTABLISHED because volume < 100 * 1e18!
    assertEq(
      uint8(reputation.getSellerTrustTier(seller)),
      uint8(ReputationTypes.TrustTier.ESTABLISHED)
    );
  }

  // =========================================================================
  // 8. Invariant & Fuzz Tests
  // =========================================================================

  function testFuzz_CalculateTrustScore_AlwaysBounded(uint32 count, uint64 scoreMultiplier) public {
    vm.assume(count > 0 && count <= 1_000_000);
    // Score sum cannot exceed count * 5
    uint64 sum = uint64(bound(scoreMultiplier, 1, uint256(count) * 5));

    uint16 score = reputation.calculateTrustScore(count, sum);
    assertTrue(score <= 10000, 'Score must be bounded by 10000 BPS');
  }

  function test_Invariant_ZeroFundsHeld() public {
    assertEq(address(reputation).balance, 0, 'P2PReputation must hold zero native ETH');
    assertEq(token.balanceOf(address(reputation)), 0, 'P2PReputation must hold zero ERC20 tokens');
  }

  function test_Revert_ZeroAddressConstructor() public {
    vm.expectRevert(P2PReputation.ZeroAddressDetected.selector);
    new P2PReputation(address(0));
  }
}
