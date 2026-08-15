// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title Events
 * @notice Shared events library for the UnifyVault Protocol
 */
library Events {
  event MintExecuted(
    address indexed investor,
    uint256 collateralDeposited,
    uint256 indexTokensMinted,
    uint256 mintFeeCollected
  );

  event BurnExecuted(
    address indexed investor,
    uint256 indexTokensBurned,
    uint256 collateralReturned,
    uint256 burnFeeCollected
  );

  event ProtocolPaused(address indexed actor, string reason);
  event ProtocolUnpaused(address indexed actor);
  event GovernanceConfigUpdated(bytes32 indexed configKey, address indexed newTarget);
  event OraclePriceSynchronized(address indexed asset, uint256 price, uint256 timestamp);
  event AddressRegistered(bytes32 indexed id, address indexed target, address indexed caller);
  event AddressUpdated(
    bytes32 indexed id,
    address indexed oldTarget,
    address newTarget,
    address indexed caller
  );
  event AddressRemoved(bytes32 indexed id, address indexed oldTarget, address indexed caller);
  event RegistryFrozen(address indexed caller);

  // Security Hardening Monitoring Events
  event LargeDeposit(address indexed user, address indexed asset, uint256 amount, uint256 shares);
  event LargeRedeem(address indexed user, address indexed asset, uint256 shares, uint256 amount);
  event EmergencyPause(address indexed actor, string reason);
  event EmergencyResume(address indexed actor);
  event OracleFailure(address indexed asset, string reason);
  event OracleFallback(address indexed asset, address indexed fallbackProvider, uint256 price);
  event StrategyRebalanced(address indexed caller, address[] assets, uint256[] newWeights);
  event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
  event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
  event TimelockExecuted(bytes32 indexed id, address indexed target, uint256 value, bytes data);
  event TimelockQueued(
    bytes32 indexed id,
    address indexed target,
    uint256 value,
    bytes data,
    uint256 eta
  );

  // Escrow Events
  event TradeCreated(
    uint256 indexed tradeId,
    address indexed seller,
    address indexed buyer,
    address asset,
    uint256 amount,
    uint256 fiatAmount,
    bytes32 fiatCurrency,
    uint256 paymentWindow
  );
  event EscrowFunded(
    uint256 indexed tradeId,
    address indexed seller,
    uint256 amount,
    uint256 fundingTimestamp
  );
  event PaymentSubmitted(
    uint256 indexed tradeId,
    address indexed buyer,
    bytes32 paymentReference,
    bytes32 evidenceHash,
    uint256 paymentTimestamp
  );
  event DisputeRaised(uint256 indexed tradeId, address indexed initiator, bytes32 reasonHash);
  event DisputeResolved(
    uint256 indexed tradeId,
    address indexed resolver,
    uint8 outcome,
    uint256 payoutAmount
  );
  event EscrowReleased(
    uint256 indexed tradeId,
    address indexed buyer,
    uint256 netPayout,
    uint256 feeCollected
  );
  event EscrowRefunded(uint256 indexed tradeId, address indexed seller, uint256 refundAmount);
  event TradeCancelled(uint256 indexed tradeId, address indexed actor);
  event FeeConfigUpdated(uint256 oldFeeBps, uint256 newFeeBps);
  event TreasuryUpdated(address oldTreasury, address newTreasury);
}
