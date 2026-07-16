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
}
