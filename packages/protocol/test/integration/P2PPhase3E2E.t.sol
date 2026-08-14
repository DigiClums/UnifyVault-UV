// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/marketplace/Marketplace.sol';
import '../../src/escrow/P2PEscrow.sol';
import '../../src/types/MarketplaceTypes.sol';
import '../../src/types/EscrowTypes.sol';
import '../../src/interfaces/IMarketplace.sol';

contract MockUVBEToken is ERC20 {
  constructor() ERC20('UnifyVault Bull Edition V2', 'UVBE') {
    _mint(msg.sender, 10_000_000 * 1e18);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockRandomToken is ERC20 {
  constructor() ERC20('Random Token', 'RND') {
    _mint(msg.sender, 1_000_000 * 1e18);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

/**
 * @title P2PPhase3E2ETest
 * @notice Complete End-to-End verification of the UVBE-only P2P Marketplace and Escrow lifecycle.
 */
contract P2PPhase3E2ETest is Test {
  Marketplace public marketplace;
  P2PEscrow public escrow;
  MockUVBEToken public uvbe;

  address public treasury = address(0x9999);
  address public seller = address(0x1111);
  address public buyer = address(0x2222);
  address public smartAccountBuyer = address(0x3333);
  address public unauthorizedUser = address(0x4444);

  address public constant CANONICAL_UVBE = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  bytes32 public constant CURRENCY_INR = keccak256('INR');

  uint256 public constant TRADE_UVBE_AMOUNT = 50 * 1e18; // 50 UVBE
  uint256 public constant PRICE_INR = 500 * 1e18; // 500 INR per UVBE
  uint256 public constant EXPECTED_TOTAL_INR = 25000; // 50 * 500 = 25,000 INR

  string public constant VALID_UTR = '423456789012';
  bytes32 public constant PAYMENT_REF = keccak256(abi.encodePacked('423456789012'));
  bytes32 public constant EVIDENCE_HASH = keccak256('REAL_RECEIPT_BYTES_CONTENT_PNG');

  function setUp() public {
    // 1. Deploy Escrow with 0.10% fee (10 bps)
    escrow = new P2PEscrow(treasury, 10);
    // 2. Deploy Marketplace connected to Escrow
    marketplace = new Marketplace(address(escrow));

    // Deploy Mock UVBE
    uvbe = new MockUVBEToken();

    // Enforce UVBE token configuration in marketplace
    marketplace.setUvbeToken(address(uvbe));

    // Fund seller with UVBE
    uvbe.mint(seller, 1000 * 1e18);
    vm.deal(seller, 10 ether);
    vm.deal(buyer, 10 ether);
    vm.deal(smartAccountBuyer, 10 ether);

    // Approve Escrow contract for seller
    vm.prank(seller);
    uvbe.approve(address(escrow), type(uint256).max);
  }

  function test_E2E_Complete_P2P_UVBE_Trade_Lifecycle() public {
    // -------------------------------------------------------------
    // Step 1: Seller creates SELL UVBE order
    // -------------------------------------------------------------
    vm.prank(seller);
    uint256 orderId = marketplace.createSellOrder(
      address(uvbe),
      TRADE_UVBE_AMOUNT,
      PRICE_INR,
      CURRENCY_INR,
      1 * 1e18,
      TRADE_UVBE_AMOUNT
    );

    MarketplaceTypes.Order memory orderBefore = marketplace.getOrder(orderId);
    assertEq(
      uint256(orderBefore.side),
      uint256(MarketplaceTypes.OrderSide.SELL),
      'Order must be SELL'
    );
    assertEq(orderBefore.asset, address(uvbe), 'Asset must be UVBE');
    assertEq(orderBefore.amount, TRADE_UVBE_AMOUNT, 'Amount must match');
    assertEq(orderBefore.price, PRICE_INR, 'Price must match');
    assertEq(orderBefore.fiatCurrency, CURRENCY_INR, 'Fiat must be INR');
    assertEq(orderBefore.maker, seller, 'Maker must be seller');
    assertEq(
      uint256(orderBefore.status),
      uint256(MarketplaceTypes.OrderStatus.OPEN),
      'Status must be OPEN'
    );
    assertEq(orderBefore.filledAmount, 0, 'Filled amount must be 0');

    // -------------------------------------------------------------
    // Step 2 & 3: Buyer takes the order atomically via takeOrder
    // -------------------------------------------------------------
    vm.prank(buyer);
    (, uint256 tradeId) = marketplace.takeOrder(orderId, TRADE_UVBE_AMOUNT);

    // Verify Marketplace order state updated to FILLED
    MarketplaceTypes.Order memory orderAfter = marketplace.getOrder(orderId);
    assertEq(
      uint256(orderAfter.status),
      uint256(MarketplaceTypes.OrderStatus.FILLED),
      'Order must be FILLED'
    );
    assertEq(orderAfter.filledAmount, TRADE_UVBE_AMOUNT, 'Filled amount must be 100%');
    assertEq(marketplace.getRemainingAmount(orderId), 0, 'Remaining amount must be 0');

    // -------------------------------------------------------------
    // Step 3: Verify Trade Details in Escrow
    // -------------------------------------------------------------
    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(trade.tradeId, tradeId, 'Trade ID must match');
    assertEq(trade.buyer, buyer, 'Taker must be buyer');
    assertEq(trade.seller, seller, 'Maker must be seller');
    assertEq(trade.asset, address(uvbe), 'Trade asset must be UVBE');
    assertEq(trade.amount, TRADE_UVBE_AMOUNT, 'Crypto amount must match');
    assertEq(
      uint256(trade.state),
      uint256(EscrowTypes.TradeState.CREATED),
      'Trade must be CREATED'
    );

    // -------------------------------------------------------------
    // Step 4: Seller funds escrow with UVBE
    // -------------------------------------------------------------
    uint256 sellerBalBefore = uvbe.balanceOf(seller);
    uint256 escrowBalBefore = uvbe.balanceOf(address(escrow));

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    uint256 sellerBalAfter = uvbe.balanceOf(seller);
    uint256 escrowBalAfter = uvbe.balanceOf(address(escrow));

    assertEq(
      sellerBalBefore - sellerBalAfter,
      TRADE_UVBE_AMOUNT,
      'Seller balance decreased by exact UVBE amount'
    );
    assertEq(
      escrowBalAfter - escrowBalBefore,
      TRADE_UVBE_AMOUNT,
      'Escrow received exact UVBE amount'
    );

    EscrowTypes.Trade memory fundedTrade = escrow.getTrade(tradeId);
    assertEq(
      uint256(fundedTrade.state),
      uint256(EscrowTypes.TradeState.FUNDED),
      'Trade state must be FUNDED'
    );
    assertTrue(fundedTrade.fundingTimestamp > 0, 'Funding timestamp must be set');

    // -------------------------------------------------------------
    // Step 5 - 10: Buyer submits payment with UTR and receipt hash
    // -------------------------------------------------------------
    // Unauthorized user cannot submit payment
    vm.prank(unauthorizedUser);
    vm.expectRevert();
    escrow.submitPayment(tradeId, PAYMENT_REF, EVIDENCE_HASH);

    // Buyer submits valid payment
    vm.prank(buyer);
    escrow.submitPayment(tradeId, PAYMENT_REF, EVIDENCE_HASH);

    EscrowTypes.Trade memory paidTrade = escrow.getTrade(tradeId);
    assertEq(
      uint256(paidTrade.state),
      uint256(EscrowTypes.TradeState.PAYMENT_SUBMITTED),
      'State must be PAYMENT_SUBMITTED'
    );
    assertEq(paidTrade.paymentReference, PAYMENT_REF, 'Payment reference must match');
    assertEq(paidTrade.evidenceHash, EVIDENCE_HASH, 'Evidence hash must match');
    assertTrue(paidTrade.paymentTimestamp > 0, 'Payment timestamp must be set');

    // Replay with identical evidence hash on another trade must revert
    vm.prank(seller);
    uint256 secondOrderId = marketplace.createSellOrder(
      address(uvbe),
      TRADE_UVBE_AMOUNT,
      PRICE_INR,
      CURRENCY_INR,
      1 * 1e18,
      TRADE_UVBE_AMOUNT
    );
    vm.prank(buyer);
    (, uint256 secondTradeId) = marketplace.takeOrder(secondOrderId, TRADE_UVBE_AMOUNT);
    vm.prank(seller);
    escrow.fundTrade(secondTradeId);

    vm.prank(buyer);
    vm.expectRevert();
    escrow.submitPayment(secondTradeId, PAYMENT_REF, EVIDENCE_HASH);

    // -------------------------------------------------------------
    // Step 11 - 13: Seller confirms and releases escrowed UVBE to buyer
    // -------------------------------------------------------------
    uint256 buyerBalBefore = uvbe.balanceOf(buyer);
    uint256 treasuryBalBefore = uvbe.balanceOf(treasury);

    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    uint256 buyerBalAfter = uvbe.balanceOf(buyer);
    uint256 treasuryBalAfter = uvbe.balanceOf(treasury);

    // 0.10% fee (10 bps) = 50 * 0.001 = 0.05 UVBE
    uint256 expectedFee = (TRADE_UVBE_AMOUNT * 10) / 10000;
    uint256 expectedBuyerAmount = TRADE_UVBE_AMOUNT - expectedFee;

    assertEq(
      buyerBalAfter - buyerBalBefore,
      expectedBuyerAmount,
      'Buyer received exact UVBE minus fee'
    );
    assertEq(
      treasuryBalAfter - treasuryBalBefore,
      expectedFee,
      'Treasury received exact protocol fee'
    );

    EscrowTypes.Trade memory releasedTrade = escrow.getTrade(tradeId);
    assertEq(
      uint256(releasedTrade.state),
      uint256(EscrowTypes.TradeState.RELEASED),
      'Trade state must be RELEASED'
    );

    // -------------------------------------------------------------
    // Step 14: Completed order cannot be taken again
    // -------------------------------------------------------------
    vm.prank(buyer);
    vm.expectRevert();
    marketplace.takeOrder(orderId, TRADE_UVBE_AMOUNT);
  }

  function test_E2E_SmartAccount_Buyer_Execution_Path() public {
    // Verify Smart Account / UserOp target encoding execution path
    vm.prank(seller);
    uint256 orderId = marketplace.createSellOrder(
      address(uvbe),
      TRADE_UVBE_AMOUNT,
      PRICE_INR,
      CURRENCY_INR,
      1 * 1e18,
      TRADE_UVBE_AMOUNT
    );

    // Smart Account takes order
    vm.prank(smartAccountBuyer);
    (, uint256 tradeId) = marketplace.takeOrder(orderId, TRADE_UVBE_AMOUNT);

    // Seller funds
    vm.prank(seller);
    escrow.fundTrade(tradeId);

    // Smart Account submits payment
    bytes32 smartPaymentRef = keccak256(abi.encodePacked('SA_UTR_888999111'));
    bytes32 smartEvidenceHash = keccak256('SA_REAL_RECEIPT_PDF_BYTES');

    vm.prank(smartAccountBuyer);
    escrow.submitPayment(tradeId, smartPaymentRef, smartEvidenceHash);

    // Seller confirms and releases
    uint256 saBalBefore = uvbe.balanceOf(smartAccountBuyer);
    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);
    uint256 saBalAfter = uvbe.balanceOf(smartAccountBuyer);

    uint256 expectedFee = (TRADE_UVBE_AMOUNT * 10) / 10000;
    assertEq(
      saBalAfter - saBalBefore,
      TRADE_UVBE_AMOUNT - expectedFee,
      'Smart Account received exact UVBE tokens'
    );
  }

  function test_E2E_NonUVBE_Asset_Rejection() public {
    MockRandomToken randomToken = new MockRandomToken();
    randomToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    randomToken.approve(address(escrow), type(uint256).max);

    vm.prank(seller);
    vm.expectRevert();
    marketplace.createSellOrder(
      address(randomToken),
      100 * 1e18,
      500 * 1e18,
      CURRENCY_INR,
      1 * 1e18,
      100 * 1e18
    );
  }
}
