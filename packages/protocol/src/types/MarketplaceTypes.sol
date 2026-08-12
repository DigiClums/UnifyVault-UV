// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title MarketplaceTypes
 * @notice Data structures and enumerations for the UnifyVault P2P Marketplace module
 */
library MarketplaceTypes {
  /**
   * @notice Order side (BUY or SELL)
   */
  enum OrderSide {
    BUY,
    SELL
  }

  /**
   * @notice Order lifecycle states
   */
  enum OrderStatus {
    OPEN,
    PARTIALLY_FILLED,
    FILLED,
    CANCELLED
  }

  /**
   * @notice Complete state representation of a Marketplace Limit Order
   */
  struct Order {
    uint256 orderId;
    address maker;
    OrderSide side;
    address asset; // ERC20 token address or address(0) for native ETH
    uint256 amount; // Total order crypto amount
    uint256 filledAmount; // Amount filled so far
    uint256 remainingAmount; // Amount remaining to be filled
    uint256 price; // Fiat price per unit (18-decimal fixed point or scaled)
    bytes32 fiatCurrency; // e.g. keccak256("USD"), keccak256("INR")
    uint256 minLimit; // Minimum match amount per trade (0 if no minimum)
    uint256 maxLimit; // Maximum match amount per trade (0 if no maximum)
    OrderStatus status;
    uint256 createdAt;
  }

  /**
   * @notice Record of a completed match between a BUY and SELL order
   */
  struct Match {
    uint256 matchId;
    uint256 buyOrderId;
    uint256 sellOrderId;
    address buyer;
    address seller;
    address asset;
    uint256 matchAmount;
    uint256 executionPrice;
    uint256 fiatAmount;
    bytes32 fiatCurrency;
    uint256 escrowTradeId; // Linked P2PEscrow trade ID (0 if not linked)
    uint256 timestamp;
  }
}
