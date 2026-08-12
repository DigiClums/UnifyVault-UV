// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '../types/MarketplaceTypes.sol';

/**
 * @title IMarketplace
 * @notice Interface for the UnifyVault Non-Custodial P2P Marketplace Protocol
 */
interface IMarketplace {
  // --- Events ---

  event OrderCreated(
    uint256 indexed orderId,
    address indexed maker,
    MarketplaceTypes.OrderSide indexed side,
    address asset,
    uint256 amount,
    uint256 price,
    bytes32 fiatCurrency,
    uint256 minLimit,
    uint256 maxLimit,
    uint256 timestamp
  );

  event OrderCancelled(
    uint256 indexed orderId,
    address indexed maker,
    uint256 remainingAmount,
    uint256 timestamp
  );

  event OrderMatched(
    uint256 indexed matchId,
    uint256 indexed buyOrderId,
    uint256 indexed sellOrderId,
    address buyer,
    address seller,
    address asset,
    uint256 matchAmount,
    uint256 executionPrice,
    uint256 fiatAmount,
    bytes32 fiatCurrency,
    uint256 timestamp
  );

  event OrderPartiallyFilled(
    uint256 indexed orderId,
    address indexed maker,
    uint256 filledAmount,
    uint256 remainingAmount
  );

  event OrderFilled(uint256 indexed orderId, address indexed maker, uint256 totalAmount);

  event EscrowTradeLinked(
    uint256 indexed matchId,
    uint256 indexed tradeId,
    uint256 indexed buyOrderId,
    uint256 sellOrderId,
    address buyer,
    address seller,
    address asset,
    uint256 matchAmount
  );

  event P2PEscrowUpdated(address indexed oldEscrow, address indexed newEscrow);
  event DefaultPaymentWindowUpdated(uint256 oldWindow, uint256 newWindow);

  // --- Custom Errors ---

  error InvalidOrderMaker();
  error InvalidOrderAmount();
  error InvalidOrderPrice();
  error InvalidAssetAddress();
  error InvalidLimits();
  error OrderDoesNotExist(uint256 orderId);
  error OrderNotActive(uint256 orderId, MarketplaceTypes.OrderStatus status);
  error UnauthorizedOrderCanceller(uint256 orderId, address caller);
  error OrderAlreadyFilled(uint256 orderId);
  error IncompatibleOrderSides(
    MarketplaceTypes.OrderSide buySide,
    MarketplaceTypes.OrderSide sellSide
  );
  error IncompatibleOrderAssets(address buyAsset, address sellAsset);
  error IncompatibleFiatCurrencies(bytes32 buyCurrency, bytes32 sellCurrency);
  error PriceIncompatible(uint256 buyPrice, uint256 sellPrice);
  error InvalidMatchAmount();
  error MatchAmountExceedsRemaining(
    uint256 matchAmount,
    uint256 buyRemaining,
    uint256 sellRemaining
  );
  error MatchAmountBelowMinLimit(uint256 matchAmount, uint256 minLimit);
  error MatchAmountAboveMaxLimit(uint256 matchAmount, uint256 maxLimit);
  error SelfMatchingProhibited(address maker);

  // --- Core API ---

  function createBuyOrder(
    address asset,
    uint256 amount,
    uint256 price,
    bytes32 fiatCurrency,
    uint256 minLimit,
    uint256 maxLimit
  ) external returns (uint256 orderId);

  function createSellOrder(
    address asset,
    uint256 amount,
    uint256 price,
    bytes32 fiatCurrency,
    uint256 minLimit,
    uint256 maxLimit
  ) external returns (uint256 orderId);

  function cancelOrder(uint256 orderId) external;

  function matchOrders(
    uint256 buyOrderId,
    uint256 sellOrderId,
    uint256 matchAmount
  ) external returns (uint256 matchId, uint256 escrowTradeId);

  // --- View Functions ---

  function getOrder(uint256 orderId) external view returns (MarketplaceTypes.Order memory);
  function getRemainingAmount(uint256 orderId) external view returns (uint256);
  function getOrderCount() external view returns (uint256);
  function getMatch(uint256 matchId) external view returns (MarketplaceTypes.Match memory);
  function getMatchCount() external view returns (uint256);
}
