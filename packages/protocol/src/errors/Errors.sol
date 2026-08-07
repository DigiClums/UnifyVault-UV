// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title Errors
 * @notice Centralized error catalog for custom Solidity errors
 */
library Errors {
  error ProtocolPaused();
  error SlippageLimitExceeded(uint256 expected, uint256 actual);
  error InvalidCollateralToken(address token);
  error MathCalculationOverflow();
  error UnauthorizedControllerCaller(address caller);
  error InsufficientReserves(address asset, uint256 requested, uint256 actual);
  error TransferExecutionFailed(address asset, address recipient, uint256 amount);
  error OraclePriceStale(address asset, uint256 priceAge, uint256 limit);
  error OraclePriceNegative(address asset, int256 price);
  error HeartbeatIntervalOutofBounds();
  error IndexTokenNotSupported(address index);
  error ZeroAddressDetected();
  error EntryAlreadyExists(bytes32 id);
  error EntryDoesNotExist(bytes32 id);
  error RegistryIsFrozen();
  error IdenticalAddressSubmitted();
  error DeadlineExpired(uint256 deadline, uint256 timestamp);
  error FeeManagerNotAvailable();

  // Oracle Provider Errors
  error AssetNotSupported(bytes32 assetId);
  error OracleProviderPriceStale(bytes32 assetId, uint256 priceAge, uint256 limit);
  error OracleProviderPriceNegative(bytes32 assetId, int256 price);

  // Security Hardening Errors
  error OracleCircuitBreakerTripped(address asset, uint256 currentPrice, uint256 lastPrice);
  error DepositExceedsTxLimit(uint256 amount, uint256 limit);
  error RedeemExceedsTxLimit(uint256 shares, uint256 limit);
  error DailyDepositCapExceeded(uint256 newTotal, uint256 cap);
  error DailyRedeemCapExceeded(uint256 newTotal, uint256 cap);
  error UnsafePricing(address asset);
  error InsufficientSwapOutput(uint256 expectedUSD, uint256 actualUSD, uint256 minUSD);
  error RouterLiquidityUnavailable(address token, uint256 requested, uint256 available);
}
