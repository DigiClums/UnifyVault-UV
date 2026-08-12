// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/marketplace/Marketplace.sol';
import '../../src/escrow/P2PEscrow.sol';
import '../../src/interfaces/IMarketplace.sol';
import '../../src/types/MarketplaceTypes.sol';
import '../../src/types/EscrowTypes.sol';
import '../../src/events/Events.sol';
import '../../src/libraries/AccessRoles.sol';

contract MockMarketplaceERC20 is ERC20 {
  uint8 private _decimals;

  constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
    _decimals = decimals_;
    _mint(msg.sender, 1_000_000 * 10 ** decimals_);
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MarketplaceTest is Test {
  Marketplace public marketplace;
  P2PEscrow public escrow;
  MockMarketplaceERC20 public usdcToken;
  MockMarketplaceERC20 public wethToken;

  address public admin = address(this);
  address public treasury = address(0x888);
  address public buyerMaker = address(0x111);
  address public sellerMaker = address(0x222);
  address public buyerMaker2 = address(0x333);
  address public attacker = address(0x666);

  uint256 public constant AMOUNT_100 = 100 * 1e18;
  uint256 public constant PRICE_500_USD = 500 * 1e18; // $500 per unit
  bytes32 public constant CURRENCY_USD = keccak256('USD');
  bytes32 public constant CURRENCY_EUR = keccak256('EUR');

  function setUp() public {
    escrow = new P2PEscrow(treasury, 10); // 0.10% fee
    marketplace = new Marketplace(address(escrow));

    usdcToken = new MockMarketplaceERC20('USD Coin', 'USDC', 18);
    wethToken = new MockMarketplaceERC20('Wrapped Ether', 'WETH', 18);

    usdcToken.mint(sellerMaker, 100_000 * 1e18);
    usdcToken.mint(buyerMaker, 100_000 * 1e18);
    usdcToken.mint(buyerMaker2, 100_000 * 1e18);

    vm.deal(sellerMaker, 100 ether);
    vm.deal(buyerMaker, 100 ether);

    vm.prank(sellerMaker);
    usdcToken.approve(address(escrow), type(uint256).max);

    vm.prank(buyerMaker);
    usdcToken.approve(address(escrow), type(uint256).max);
  }

  // 1. Create BUY Order
  function test_CreateBuyOrder_Success() public {
    vm.prank(buyerMaker);
    vm.expectEmit(true, true, true, true);
    emit IMarketplace.OrderCreated(
      1,
      buyerMaker,
      MarketplaceTypes.OrderSide.BUY,
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0,
      block.timestamp
    );

    uint256 orderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    assertEq(orderId, 1);
    MarketplaceTypes.Order memory order = marketplace.getOrder(orderId);
    assertEq(order.maker, buyerMaker);
    assertEq(uint8(order.side), uint8(MarketplaceTypes.OrderSide.BUY));
    assertEq(order.amount, AMOUNT_100);
    assertEq(order.remainingAmount, AMOUNT_100);
    assertEq(order.filledAmount, 0);
    assertEq(uint8(order.status), uint8(MarketplaceTypes.OrderStatus.OPEN));
  }

  // 2. Create SELL Order
  function test_CreateSellOrder_Success() public {
    vm.prank(sellerMaker);
    uint256 orderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    assertEq(orderId, 1);
    MarketplaceTypes.Order memory order = marketplace.getOrder(orderId);
    assertEq(order.maker, sellerMaker);
    assertEq(uint8(order.side), uint8(MarketplaceTypes.OrderSide.SELL));
    assertEq(order.amount, AMOUNT_100);
  }

  // 3. Reject Zero Amount
  function test_CreateOrder_Revert_ZeroAmount() public {
    vm.prank(buyerMaker);
    vm.expectRevert(IMarketplace.InvalidOrderAmount.selector);
    marketplace.createBuyOrder(address(usdcToken), 0, PRICE_500_USD, CURRENCY_USD, 0, 0);
  }

  // 4. Reject Zero Price
  function test_CreateOrder_Revert_ZeroPrice() public {
    vm.prank(buyerMaker);
    vm.expectRevert(IMarketplace.InvalidOrderPrice.selector);
    marketplace.createBuyOrder(address(usdcToken), AMOUNT_100, 0, CURRENCY_USD, 0, 0);
  }

  // 5. Cancel Own Order
  function test_CancelOrder_Success_OwnOrder() public {
    vm.prank(buyerMaker);
    uint256 orderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(buyerMaker);
    vm.expectEmit(true, true, false, true);
    emit IMarketplace.OrderCancelled(orderId, buyerMaker, AMOUNT_100, block.timestamp);

    marketplace.cancelOrder(orderId);

    MarketplaceTypes.Order memory order = marketplace.getOrder(orderId);
    assertEq(uint8(order.status), uint8(MarketplaceTypes.OrderStatus.CANCELLED));
  }

  // 6. Reject Cancelling Another User's Order
  function test_CancelOrder_Revert_NotMaker() public {
    vm.prank(buyerMaker);
    uint256 orderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(attacker);
    vm.expectRevert(
      abi.encodeWithSelector(IMarketplace.UnauthorizedOrderCanceller.selector, orderId, attacker)
    );
    marketplace.cancelOrder(orderId);
  }

  // 7. Reject Cancelling Filled Order
  function test_CancelOrder_Revert_AlreadyFilled() public {
    (uint256 buyOrderId, ) = _setupAndMatchExact();

    vm.prank(buyerMaker);
    vm.expectRevert(
      abi.encodeWithSelector(
        IMarketplace.OrderNotActive.selector,
        buyOrderId,
        MarketplaceTypes.OrderStatus.FILLED
      )
    );
    marketplace.cancelOrder(buyOrderId);
  }

  // 8. Exact Match
  function test_MatchOrders_ExactMatch() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    (uint256 matchId, uint256 escrowTradeId) = marketplace.matchOrders(
      buyOrderId,
      sellOrderId,
      AMOUNT_100
    );

    assertEq(matchId, 1);
    assertTrue(escrowTradeId > 0);

    MarketplaceTypes.Order memory buyOrder = marketplace.getOrder(buyOrderId);
    MarketplaceTypes.Order memory sellOrder = marketplace.getOrder(sellOrderId);

    assertEq(uint8(buyOrder.status), uint8(MarketplaceTypes.OrderStatus.FILLED));
    assertEq(uint8(sellOrder.status), uint8(MarketplaceTypes.OrderStatus.FILLED));
    assertEq(buyOrder.remainingAmount, 0);
    assertEq(sellOrder.remainingAmount, 0);
  }

  // 9. Partial Match
  function test_MatchOrders_PartialMatch() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100, // 100 total
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      40 * 1e18, // 40 total
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    marketplace.matchOrders(buyOrderId, sellOrderId, 40 * 1e18);

    MarketplaceTypes.Order memory buyOrder = marketplace.getOrder(buyOrderId);
    MarketplaceTypes.Order memory sellOrder = marketplace.getOrder(sellOrderId);

    assertEq(uint8(buyOrder.status), uint8(MarketplaceTypes.OrderStatus.PARTIALLY_FILLED));
    assertEq(buyOrder.filledAmount, 40 * 1e18);
    assertEq(buyOrder.remainingAmount, 60 * 1e18);

    assertEq(uint8(sellOrder.status), uint8(MarketplaceTypes.OrderStatus.FILLED));
    assertEq(sellOrder.remainingAmount, 0);
  }

  // 10. Multiple Partial Matches
  function test_MatchOrders_MultiplePartialMatches() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      100 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    // Seller 1 sells 40
    vm.prank(sellerMaker);
    uint256 sellOrderId1 = marketplace.createSellOrder(
      address(usdcToken),
      40 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    marketplace.matchOrders(buyOrderId, sellOrderId1, 40 * 1e18);

    // Seller 2 sells 60
    address sellerMaker2 = address(0x555);
    vm.prank(sellerMaker2);
    uint256 sellOrderId2 = marketplace.createSellOrder(
      address(usdcToken),
      60 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    marketplace.matchOrders(buyOrderId, sellOrderId2, 60 * 1e18);

    MarketplaceTypes.Order memory buyOrder = marketplace.getOrder(buyOrderId);
    assertEq(uint8(buyOrder.status), uint8(MarketplaceTypes.OrderStatus.FILLED));
    assertEq(buyOrder.filledAmount, 100 * 1e18);
    assertEq(buyOrder.remainingAmount, 0);
  }

  // 11. Final Fill Changes Status To FILLED
  function test_MatchOrders_FinalFillChangesStatusToFilled() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      50 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      50 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    marketplace.matchOrders(buyOrderId, sellOrderId, 25 * 1e18);
    assertEq(
      uint8(marketplace.getOrder(buyOrderId).status),
      uint8(MarketplaceTypes.OrderStatus.PARTIALLY_FILLED)
    );

    marketplace.matchOrders(buyOrderId, sellOrderId, 25 * 1e18);
    assertEq(
      uint8(marketplace.getOrder(buyOrderId).status),
      uint8(MarketplaceTypes.OrderStatus.FILLED)
    );
  }

  // 12. Cannot Overfill BUY
  function test_MatchOrders_Revert_OverfillBuy() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      50 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      100 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        IMarketplace.MatchAmountExceedsRemaining.selector,
        60 * 1e18,
        50 * 1e18,
        100 * 1e18
      )
    );
    marketplace.matchOrders(buyOrderId, sellOrderId, 60 * 1e18);
  }

  // 13. Cannot Overfill SELL
  function test_MatchOrders_Revert_OverfillSell() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      100 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      40 * 1e18,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        IMarketplace.MatchAmountExceedsRemaining.selector,
        50 * 1e18,
        100 * 1e18,
        40 * 1e18
      )
    );
    marketplace.matchOrders(buyOrderId, sellOrderId, 50 * 1e18);
  }

  // 14. Reject Incompatible Assets
  function test_MatchOrders_Revert_IncompatibleAssets() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(wethToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        IMarketplace.IncompatibleOrderAssets.selector,
        address(usdcToken),
        address(wethToken)
      )
    );
    marketplace.matchOrders(buyOrderId, sellOrderId, AMOUNT_100);
  }

  // 15. Reject Incompatible Fiat Currency
  function test_MatchOrders_Revert_IncompatibleFiatCurrency() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_EUR,
      0,
      0
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        IMarketplace.IncompatibleFiatCurrencies.selector,
        CURRENCY_USD,
        CURRENCY_EUR
      )
    );
    marketplace.matchOrders(buyOrderId, sellOrderId, AMOUNT_100);
  }

  // 16. Reject Price Incompatible Match (BUY price < SELL price)
  function test_MatchOrders_Revert_PriceIncompatible() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      400 * 1e18, // Buyer willing to pay max $400
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      500 * 1e18, // Seller asks min $500
      CURRENCY_USD,
      0,
      0
    );

    vm.expectRevert(
      abi.encodeWithSelector(IMarketplace.PriceIncompatible.selector, 400 * 1e18, 500 * 1e18)
    );
    marketplace.matchOrders(buyOrderId, sellOrderId, AMOUNT_100);
  }

  // 17. Reject Cancelled Order Match
  function test_MatchOrders_Revert_CancelledOrderMatch() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(buyerMaker);
    marketplace.cancelOrder(buyOrderId);

    vm.expectRevert(
      abi.encodeWithSelector(
        IMarketplace.OrderNotActive.selector,
        buyOrderId,
        MarketplaceTypes.OrderStatus.CANCELLED
      )
    );
    marketplace.matchOrders(buyOrderId, sellOrderId, AMOUNT_100);
  }

  // 18. Reject Filled Order Match
  function test_MatchOrders_Revert_FilledOrderMatch() public {
    (uint256 buyOrderId, uint256 sellOrderId) = _setupAndMatchExact();

    vm.expectRevert(
      abi.encodeWithSelector(
        IMarketplace.OrderNotActive.selector,
        buyOrderId,
        MarketplaceTypes.OrderStatus.FILLED
      )
    );
    marketplace.matchOrders(buyOrderId, sellOrderId, AMOUNT_100);
  }

  // 19. Reject Self Match
  function test_MatchOrders_Revert_SelfMatch() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(buyerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.expectRevert(
      abi.encodeWithSelector(IMarketplace.SelfMatchingProhibited.selector, buyerMaker)
    );
    marketplace.matchOrders(buyOrderId, sellOrderId, AMOUNT_100);
  }

  // 20. Verify Events Emitted
  function test_Events_OrderCreatedAndMatched() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.expectEmit(true, true, true, true);
    emit IMarketplace.OrderMatched(
      1,
      buyOrderId,
      sellOrderId,
      buyerMaker,
      sellerMaker,
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      50000 * 1e18, // fiatAmount = 100 * 500
      CURRENCY_USD,
      block.timestamp
    );

    marketplace.matchOrders(buyOrderId, sellOrderId, AMOUNT_100);
  }

  // 21. Verify Remaining Amount
  function test_View_GetRemainingAmount() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    assertEq(marketplace.getRemainingAmount(buyOrderId), AMOUNT_100);
  }

  // 22. Verify Order Count
  function test_View_GetOrderCount() public {
    assertEq(marketplace.getOrderCount(), 0);

    vm.prank(buyerMaker);
    marketplace.createBuyOrder(address(usdcToken), AMOUNT_100, PRICE_500_USD, CURRENCY_USD, 0, 0);

    assertEq(marketplace.getOrderCount(), 1);
  }

  // 23. Verify Existing P2PEscrow Behavior Remains Unchanged
  function test_P2PEscrow_ExistingBehaviorUnchanged() public {
    // Direct P2PEscrow bilateral flow should work exactly as before
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyerMaker,
      seller: sellerMaker,
      asset: address(usdcToken),
      amount: AMOUNT_100,
      fiatAmount: 50000,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: 15 minutes
    });

    uint256 tradeId = escrow.createTrade(params);
    assertEq(tradeId, 1);

    vm.prank(sellerMaker);
    escrow.fundTrade(tradeId);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.FUNDED));
  }

  // 24. Integration Test: Safe Marketplace -> P2PEscrow Linkage
  function test_Integration_MarketplaceToP2PEscrowLinkage() public {
    vm.prank(buyerMaker);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    (uint256 matchId, uint256 escrowTradeId) = marketplace.matchOrders(
      buyOrderId,
      sellOrderId,
      AMOUNT_100
    );

    assertTrue(matchId > 0);
    assertTrue(escrowTradeId > 0);

    // Verify trade created on P2PEscrow contract
    EscrowTypes.Trade memory trade = escrow.getTrade(escrowTradeId);
    assertEq(trade.buyer, buyerMaker);
    assertEq(trade.seller, sellerMaker);
    assertEq(trade.asset, address(usdcToken));
    assertEq(trade.amount, AMOUNT_100);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.CREATED));

    // Seller funds escrow trade directly
    vm.prank(sellerMaker);
    escrow.fundTrade(escrowTradeId);

    trade = escrow.getTrade(escrowTradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.FUNDED));
  }

  // Helper
  function _setupAndMatchExact() internal returns (uint256 buyOrderId, uint256 sellOrderId) {
    vm.prank(buyerMaker);
    buyOrderId = marketplace.createBuyOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    vm.prank(sellerMaker);
    sellOrderId = marketplace.createSellOrder(
      address(usdcToken),
      AMOUNT_100,
      PRICE_500_USD,
      CURRENCY_USD,
      0,
      0
    );

    marketplace.matchOrders(buyOrderId, sellOrderId, AMOUNT_100);
  }
}
