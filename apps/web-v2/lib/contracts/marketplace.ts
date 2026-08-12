import { parseAbi } from 'viem';

export const MARKETPLACE_ABI = parseAbi([
  // Core Functions
  'function createBuyOrder(address asset, uint256 amount, uint256 price, bytes32 fiatCurrency, uint256 minLimit, uint256 maxLimit) external returns (uint256 orderId)',
  'function createSellOrder(address asset, uint256 amount, uint256 price, bytes32 fiatCurrency, uint256 minLimit, uint256 maxLimit) external returns (uint256 orderId)',
  'function cancelOrder(uint256 orderId) external',
  'function matchOrders(uint256 buyOrderId, uint256 sellOrderId, uint256 matchAmount) external returns (uint256 matchId, uint256 escrowTradeId)',

  // Views
  'function getOrder(uint256 orderId) external view returns ((uint256 orderId, address maker, uint8 side, address asset, uint256 amount, uint256 filledAmount, uint256 remainingAmount, uint256 price, bytes32 fiatCurrency, uint256 minLimit, uint256 maxLimit, uint8 status, uint256 createdAt))',
  'function getRemainingAmount(uint256 orderId) external view returns (uint256)',
  'function getOrderCount() external view returns (uint256)',
  'function getMatch(uint256 matchId) external view returns ((uint256 matchId, uint256 buyOrderId, uint256 sellOrderId, address buyer, address seller, address asset, uint256 matchAmount, uint256 executionPrice, uint256 fiatAmount, bytes32 fiatCurrency, uint256 escrowTradeId, uint256 timestamp))',
  'function getMatchCount() external view returns (uint256)',
  'function p2pEscrow() external view returns (address)',

  // Events
  'event OrderCreated(uint256 indexed orderId, address indexed maker, uint8 indexed side, address asset, uint256 amount, uint256 price, bytes32 fiatCurrency, uint256 minLimit, uint256 maxLimit, uint256 timestamp)',
  'event OrderCancelled(uint256 indexed orderId, address indexed maker, uint256 remainingAmount, uint256 timestamp)',
  'event OrderMatched(uint256 indexed matchId, uint256 indexed buyOrderId, uint256 indexed sellOrderId, address buyer, address seller, address asset, uint256 matchAmount, uint256 executionPrice, uint256 fiatAmount, bytes32 fiatCurrency, uint256 timestamp)',
  'event OrderPartiallyFilled(uint256 indexed orderId, address indexed maker, uint256 filledAmount, uint256 remainingAmount)',
  'event OrderFilled(uint256 indexed orderId, address indexed maker, uint256 totalAmount)',
  'event EscrowTradeLinked(uint256 indexed matchId, uint256 indexed tradeId, uint256 indexed buyOrderId, uint256 sellOrderId, address buyer, address seller, address asset, uint256 matchAmount)',
]);

export enum OrderSide {
  BUY = 0,
  SELL = 1,
}

export enum OrderStatus {
  OPEN = 0,
  PARTIALLY_FILLED = 1,
  FILLED = 2,
  CANCELLED = 3,
}

export interface OrderDetails {
  orderId: number;
  maker: `0x${string}`;
  side: OrderSide;
  asset: `0x${string}`;
  amount: bigint;
  filledAmount: bigint;
  remainingAmount: bigint;
  price: bigint;
  fiatCurrency: string;
  minLimit: bigint;
  maxLimit: bigint;
  status: OrderStatus;
  createdAt: number;
}
