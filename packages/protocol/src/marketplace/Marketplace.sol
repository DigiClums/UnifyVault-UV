// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';

import '../interfaces/IMarketplace.sol';
import '../interfaces/IP2PEscrow.sol';
import '../types/EscrowTypes.sol';
import '../types/MarketplaceTypes.sol';
import '../libraries/AccessRoles.sol';
import '../libraries/AddressValidationLib.sol';

/**
 * @title Marketplace
 * @notice Non-custodial P2P order book and matching engine layer for UnifyVault.
 * @dev Operates above the P2PEscrow settlement engine. Users post Buy/Sell limit orders
 * without custody transfer or counterparty disclosure. Matching pairs orders and spawns
 * a dedicated settlement trade on P2PEscrow.
 */
contract Marketplace is IMarketplace, AccessControl, ReentrancyGuard, Pausable {
  uint256 public constant MIN_PAYMENT_WINDOW = 5 minutes;

  uint256 private _orderCounter;
  uint256 private _matchCounter;

  mapping(uint256 => MarketplaceTypes.Order) private _orders;
  mapping(uint256 => MarketplaceTypes.Match) private _matches;

  IP2PEscrow public p2pEscrow;
  address public override uvbeToken;
  uint256 public defaultPaymentWindow = 15 minutes;

  constructor(address initialEscrow) {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
    _grantRole(AccessRoles.GUARDIAN_ROLE, msg.sender);

    if (initialEscrow != address(0)) {
      p2pEscrow = IP2PEscrow(initialEscrow);
    }
  }

  /**
   * @notice Creates a public BUY limit order
   * @dev Non-custodial: does not transfer crypto assets to Marketplace.
   */
  function createBuyOrder(
    address asset,
    uint256 amount,
    uint256 price,
    bytes32 fiatCurrency,
    uint256 minLimit,
    uint256 maxLimit
  ) external override nonReentrant whenNotPaused returns (uint256 orderId) {
    return
      _createOrderInternal(
        MarketplaceTypes.OrderSide.BUY,
        asset,
        amount,
        price,
        fiatCurrency,
        minLimit,
        maxLimit
      );
  }

  /**
   * @notice Creates a public SELL limit order
   * @dev Non-custodial: does not transfer crypto assets to Marketplace.
   */
  function createSellOrder(
    address asset,
    uint256 amount,
    uint256 price,
    bytes32 fiatCurrency,
    uint256 minLimit,
    uint256 maxLimit
  ) external override nonReentrant whenNotPaused returns (uint256 orderId) {
    return
      _createOrderInternal(
        MarketplaceTypes.OrderSide.SELL,
        asset,
        amount,
        price,
        fiatCurrency,
        minLimit,
        maxLimit
      );
  }

  function _createOrderInternal(
    MarketplaceTypes.OrderSide side,
    address asset,
    uint256 amount,
    uint256 price,
    bytes32 fiatCurrency,
    uint256 minLimit,
    uint256 maxLimit
  ) private returns (uint256 orderId) {
    if (msg.sender == address(0)) revert InvalidOrderMaker();
    if (asset == address(0)) revert InvalidAssetAddress();
    if (uvbeToken != address(0) && asset != uvbeToken)
      revert IncompatibleOrderAssets(asset, uvbeToken);
    if (amount == 0) revert InvalidOrderAmount();
    if (price == 0) revert InvalidOrderPrice();
    if (fiatCurrency == bytes32(0)) revert IncompatibleFiatCurrencies(bytes32(0), bytes32(0));

    if (minLimit > 0 && amount < minLimit) revert InvalidLimits();
    if (maxLimit > 0 && minLimit > maxLimit) revert InvalidLimits();

    _orderCounter++;
    orderId = _orderCounter;

    _orders[orderId] = MarketplaceTypes.Order({
      orderId: orderId,
      maker: msg.sender,
      side: side,
      asset: asset,
      amount: amount,
      filledAmount: 0,
      remainingAmount: amount,
      price: price,
      fiatCurrency: fiatCurrency,
      minLimit: minLimit,
      maxLimit: maxLimit,
      status: MarketplaceTypes.OrderStatus.OPEN,
      createdAt: block.timestamp
    });

    emit OrderCreated(
      orderId,
      msg.sender,
      side,
      asset,
      amount,
      price,
      fiatCurrency,
      minLimit,
      maxLimit,
      block.timestamp
    );
  }

  /**
   * @notice Cancels an OPEN or PARTIALLY_FILLED order owned by the caller
   * @param orderId Target order ID
   */
  function cancelOrder(uint256 orderId) external override nonReentrant whenNotPaused {
    MarketplaceTypes.Order storage order = _orders[orderId];
    if (order.orderId == 0) revert OrderDoesNotExist(orderId);
    if (msg.sender != order.maker) {
      revert UnauthorizedOrderCanceller(orderId, msg.sender);
    }
    if (
      order.status != MarketplaceTypes.OrderStatus.OPEN &&
      order.status != MarketplaceTypes.OrderStatus.PARTIALLY_FILLED
    ) {
      revert OrderNotActive(orderId, order.status);
    }

    order.status = MarketplaceTypes.OrderStatus.CANCELLED;

    emit OrderCancelled(orderId, msg.sender, order.remainingAmount, block.timestamp);
  }

  /**
   * @notice Matches a BUY order and SELL order for a specified crypto amount
   * @dev Price rule: buyOrder.price >= sellOrder.price must hold.
   * Execution Price: Earlier created order sets execution price (maker price rule).
   * Spawns P2PEscrow trade if P2PEscrow contract is set.
   * @param buyOrderId Target BUY order ID
   * @param sellOrderId Target SELL order ID
   * @param matchAmount Crypto amount to match
   * @return matchId Unique identifier for this match
   * @return escrowTradeId ID of spawned P2PEscrow trade (0 if not linked)
   */
  function matchOrders(
    uint256 buyOrderId,
    uint256 sellOrderId,
    uint256 matchAmount
  ) external override nonReentrant whenNotPaused returns (uint256 matchId, uint256 escrowTradeId) {
    if (buyOrderId == 0) revert OrderDoesNotExist(buyOrderId);
    if (sellOrderId == 0) revert OrderDoesNotExist(sellOrderId);
    if (matchAmount == 0) revert InvalidMatchAmount();

    MarketplaceTypes.Order storage buyOrder = _orders[buyOrderId];
    MarketplaceTypes.Order storage sellOrder = _orders[sellOrderId];

    if (buyOrder.orderId == 0) revert OrderDoesNotExist(buyOrderId);
    if (sellOrder.orderId == 0) revert OrderDoesNotExist(sellOrderId);

    // 1. Order Side & Active Status Verification
    if (
      buyOrder.side != MarketplaceTypes.OrderSide.BUY ||
      sellOrder.side != MarketplaceTypes.OrderSide.SELL
    ) {
      revert IncompatibleOrderSides(buyOrder.side, sellOrder.side);
    }
    if (
      buyOrder.status != MarketplaceTypes.OrderStatus.OPEN &&
      buyOrder.status != MarketplaceTypes.OrderStatus.PARTIALLY_FILLED
    ) {
      revert OrderNotActive(buyOrderId, buyOrder.status);
    }
    if (
      sellOrder.status != MarketplaceTypes.OrderStatus.OPEN &&
      sellOrder.status != MarketplaceTypes.OrderStatus.PARTIALLY_FILLED
    ) {
      revert OrderNotActive(sellOrderId, sellOrder.status);
    }

    // 2. Prohibit Self-Matching
    if (buyOrder.maker == sellOrder.maker) {
      revert SelfMatchingProhibited(buyOrder.maker);
    }

    // 3. Asset & Currency Compatibility
    if (buyOrder.asset != sellOrder.asset) {
      revert IncompatibleOrderAssets(buyOrder.asset, sellOrder.asset);
    }
    if (buyOrder.fiatCurrency != sellOrder.fiatCurrency) {
      revert IncompatibleFiatCurrencies(buyOrder.fiatCurrency, sellOrder.fiatCurrency);
    }

    // 4. Price Compatibility Rule: BUY price >= SELL price
    if (buyOrder.price < sellOrder.price) {
      revert PriceIncompatible(buyOrder.price, sellOrder.price);
    }

    // 5. Match Amount & Remaining Bounds Verification
    if (matchAmount > buyOrder.remainingAmount || matchAmount > sellOrder.remainingAmount) {
      revert MatchAmountExceedsRemaining(
        matchAmount,
        buyOrder.remainingAmount,
        sellOrder.remainingAmount
      );
    }

    // Check min/max limits for Buy Order
    if (buyOrder.minLimit > 0 && matchAmount < buyOrder.minLimit) {
      revert MatchAmountBelowMinLimit(matchAmount, buyOrder.minLimit);
    }
    if (buyOrder.maxLimit > 0 && matchAmount > buyOrder.maxLimit) {
      revert MatchAmountAboveMaxLimit(matchAmount, buyOrder.maxLimit);
    }

    // Check min/max limits for Sell Order
    if (sellOrder.minLimit > 0 && matchAmount < sellOrder.minLimit) {
      revert MatchAmountBelowMinLimit(matchAmount, sellOrder.minLimit);
    }
    if (sellOrder.maxLimit > 0 && matchAmount > sellOrder.maxLimit) {
      revert MatchAmountAboveMaxLimit(matchAmount, sellOrder.maxLimit);
    }

    // 6. Deterministic Execution Price: Resting (earlier created) order sets price
    uint256 executionPrice =
      buyOrder.createdAt <= sellOrder.createdAt ? buyOrder.price : sellOrder.price;

    // 7. Calculate Fiat Amount based on asset decimals
    uint256 fiatAmount = _calculateFiatAmount(buyOrder.asset, matchAmount, executionPrice);

    // 8. Update Buy Order State
    buyOrder.filledAmount += matchAmount;
    buyOrder.remainingAmount -= matchAmount;
    if (buyOrder.remainingAmount == 0) {
      buyOrder.status = MarketplaceTypes.OrderStatus.FILLED;
      emit OrderFilled(buyOrderId, buyOrder.maker, buyOrder.amount);
    } else {
      buyOrder.status = MarketplaceTypes.OrderStatus.PARTIALLY_FILLED;
      emit OrderPartiallyFilled(
        buyOrderId,
        buyOrder.maker,
        buyOrder.filledAmount,
        buyOrder.remainingAmount
      );
    }

    // 9. Update Sell Order State
    sellOrder.filledAmount += matchAmount;
    sellOrder.remainingAmount -= matchAmount;
    if (sellOrder.remainingAmount == 0) {
      sellOrder.status = MarketplaceTypes.OrderStatus.FILLED;
      emit OrderFilled(sellOrderId, sellOrder.maker, sellOrder.amount);
    } else {
      sellOrder.status = MarketplaceTypes.OrderStatus.PARTIALLY_FILLED;
      emit OrderPartiallyFilled(
        sellOrderId,
        sellOrder.maker,
        sellOrder.filledAmount,
        sellOrder.remainingAmount
      );
    }

    // 10. Record Match
    _matchCounter++;
    matchId = _matchCounter;

    _matches[matchId] = MarketplaceTypes.Match({
      matchId: matchId,
      buyOrderId: buyOrderId,
      sellOrderId: sellOrderId,
      buyer: buyOrder.maker,
      seller: sellOrder.maker,
      asset: buyOrder.asset,
      matchAmount: matchAmount,
      executionPrice: executionPrice,
      fiatAmount: fiatAmount,
      fiatCurrency: buyOrder.fiatCurrency,
      escrowTradeId: 0,
      timestamp: block.timestamp
    });

    emit OrderMatched(
      matchId,
      buyOrderId,
      sellOrderId,
      buyOrder.maker,
      sellOrder.maker,
      buyOrder.asset,
      matchAmount,
      executionPrice,
      fiatAmount,
      buyOrder.fiatCurrency,
      block.timestamp
    );

    // 11. Spawn P2PEscrow Trade if P2PEscrow is configured
    if (address(p2pEscrow) != address(0)) {
      EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
        buyer: buyOrder.maker,
        seller: sellOrder.maker,
        asset: buyOrder.asset,
        amount: matchAmount,
        fiatAmount: fiatAmount,
        fiatCurrency: buyOrder.fiatCurrency,
        paymentWindow: defaultPaymentWindow
      });

      escrowTradeId = p2pEscrow.createTrade(params);
      _matches[matchId].escrowTradeId = escrowTradeId;

      emit EscrowTradeLinked(
        matchId,
        escrowTradeId,
        buyOrderId,
        sellOrderId,
        buyOrder.maker,
        sellOrder.maker,
        buyOrder.asset,
        matchAmount
      );
    }
  }

  /**
   * @notice Takes an active resting limit order directly in a single atomic transaction
   * @dev Eliminates race condition of creating an unwanted counter-order first.
   * If target is a BUY order: caller (msg.sender) is the SELLER, order.maker is the BUYER.
   * If target is a SELL order: caller (msg.sender) is the BUYER, order.maker is the SELLER.
   * @param orderId Target resting order ID
   * @param takeAmount Crypto amount to fill
   * @return matchId Unique match ID
   * @return escrowTradeId Spawned P2PEscrow trade ID
   */
  function takeOrder(
    uint256 orderId,
    uint256 takeAmount
  ) external override nonReentrant whenNotPaused returns (uint256 matchId, uint256 escrowTradeId) {
    if (orderId == 0) revert OrderDoesNotExist(orderId);
    if (takeAmount == 0) revert InvalidMatchAmount();

    MarketplaceTypes.Order storage order = _orders[orderId];
    if (order.orderId == 0) revert OrderDoesNotExist(orderId);

    // 1. Active Status Verification
    if (
      order.status != MarketplaceTypes.OrderStatus.OPEN &&
      order.status != MarketplaceTypes.OrderStatus.PARTIALLY_FILLED
    ) {
      revert OrderNotActive(orderId, order.status);
    }

    // 2. Prohibit Self-Matching
    if (order.maker == msg.sender) {
      revert SelfMatchingProhibited(order.maker);
    }

    // 3. Amount & Limits Verification
    if (takeAmount > order.remainingAmount) {
      revert MatchAmountExceedsRemaining(takeAmount, order.remainingAmount, order.remainingAmount);
    }
    if (order.minLimit > 0 && takeAmount < order.minLimit) {
      revert MatchAmountBelowMinLimit(takeAmount, order.minLimit);
    }
    if (order.maxLimit > 0 && takeAmount > order.maxLimit) {
      revert MatchAmountAboveMaxLimit(takeAmount, order.maxLimit);
    }

    // 4. Execution Price & Fiat Amount (Resting order determines price)
    uint256 executionPrice = order.price;
    uint256 fiatAmount = _calculateFiatAmount(order.asset, takeAmount, executionPrice);

    // 5. Update Order State
    order.filledAmount += takeAmount;
    order.remainingAmount -= takeAmount;
    if (order.remainingAmount == 0) {
      order.status = MarketplaceTypes.OrderStatus.FILLED;
      emit OrderFilled(orderId, order.maker, order.amount);
    } else {
      order.status = MarketplaceTypes.OrderStatus.PARTIALLY_FILLED;
      emit OrderPartiallyFilled(orderId, order.maker, order.filledAmount, order.remainingAmount);
    }

    // 6. Determine Buyer & Seller
    address buyer;
    address seller;
    uint256 buyOrderId;
    uint256 sellOrderId;

    if (order.side == MarketplaceTypes.OrderSide.BUY) {
      buyer = order.maker;
      seller = msg.sender;
      buyOrderId = orderId;
      sellOrderId = 0;
    } else {
      seller = order.maker;
      buyer = msg.sender;
      buyOrderId = 0;
      sellOrderId = orderId;
    }

    // 7. Record Match
    _matchCounter++;
    matchId = _matchCounter;

    _matches[matchId] = MarketplaceTypes.Match({
      matchId: matchId,
      buyOrderId: buyOrderId,
      sellOrderId: sellOrderId,
      buyer: buyer,
      seller: seller,
      asset: order.asset,
      matchAmount: takeAmount,
      executionPrice: executionPrice,
      fiatAmount: fiatAmount,
      fiatCurrency: order.fiatCurrency,
      escrowTradeId: 0,
      timestamp: block.timestamp
    });

    emit OrderMatched(
      matchId,
      buyOrderId,
      sellOrderId,
      buyer,
      seller,
      order.asset,
      takeAmount,
      executionPrice,
      fiatAmount,
      order.fiatCurrency,
      block.timestamp
    );

    // 8. Spawn P2PEscrow Trade
    if (address(p2pEscrow) != address(0)) {
      EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: order.asset,
        amount: takeAmount,
        fiatAmount: fiatAmount,
        fiatCurrency: order.fiatCurrency,
        paymentWindow: defaultPaymentWindow
      });

      escrowTradeId = p2pEscrow.createTrade(params);
      _matches[matchId].escrowTradeId = escrowTradeId;

      emit EscrowTradeLinked(
        matchId,
        escrowTradeId,
        buyOrderId,
        sellOrderId,
        buyer,
        seller,
        order.asset,
        takeAmount
      );
    }
  }

  function _calculateFiatAmount(
    address asset,
    uint256 amount,
    uint256 price
  ) private view returns (uint256) {
    uint8 decimals = 18;
    if (asset != address(0)) {
      try IERC20Metadata(asset).decimals() returns (uint8 d) {
        decimals = d;
      } catch {
        decimals = 18;
      }
    }
    return (amount * price) / (10 ** decimals);
  }

  // --- Admin & Governance Config ---

  function setUvbeToken(
    address newUvbeToken
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    AddressValidationLib.validateNonZeroAddress(newUvbeToken);
    address oldToken = uvbeToken;
    uvbeToken = newUvbeToken;
    emit UvbeTokenUpdated(oldToken, newUvbeToken);
  }

  function setP2PEscrow(address newEscrow) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    address oldEscrow = address(p2pEscrow);
    p2pEscrow = IP2PEscrow(newEscrow);
    emit P2PEscrowUpdated(oldEscrow, newEscrow);
  }

  function setDefaultPaymentWindow(
    uint256 newWindow
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (newWindow < MIN_PAYMENT_WINDOW) revert InvalidLimits();
    uint256 oldWindow = defaultPaymentWindow;
    defaultPaymentWindow = newWindow;
    emit DefaultPaymentWindowUpdated(oldWindow, newWindow);
  }

  function pause() external onlyRole(AccessRoles.GUARDIAN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }

  // --- View Functions ---

  function getOrder(
    uint256 orderId
  ) external view override returns (MarketplaceTypes.Order memory) {
    MarketplaceTypes.Order memory order = _orders[orderId];
    if (order.orderId == 0) revert OrderDoesNotExist(orderId);
    return order;
  }

  function getRemainingAmount(uint256 orderId) external view override returns (uint256) {
    MarketplaceTypes.Order memory order = _orders[orderId];
    if (order.orderId == 0) revert OrderDoesNotExist(orderId);
    return order.remainingAmount;
  }

  function getOrderCount() external view override returns (uint256) {
    return _orderCounter;
  }

  function getMatch(
    uint256 matchId
  ) external view override returns (MarketplaceTypes.Match memory) {
    MarketplaceTypes.Match memory m = _matches[matchId];
    if (m.matchId == 0) revert OrderDoesNotExist(matchId);
    return m;
  }

  function getMatchCount() external view override returns (uint256) {
    return _matchCounter;
  }
}
