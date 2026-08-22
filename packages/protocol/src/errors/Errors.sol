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
  error SwapOutputExceedsMaximum(uint256 maxAmountOut, uint256 actualAmountOut);
  error OracleDeviationExceeded(
    address tokenIn,
    address tokenOut,
    uint256 expectedOut,
    uint256 actualOut,
    uint256 deviationBps
  );
  error InvalidSwapParameters(address tokenIn, address tokenOut, uint256 amountIn);

  // Escrow Errors
  error InvalidTradeParty();
  error InvalidTradeState(uint256 tradeId, uint8 currentState, uint8 expectedState);
  error TradePaymentWindowExpired(uint256 tradeId, uint256 deadline, uint256 currentTimestamp);
  error TradePaymentWindowActive(uint256 tradeId, uint256 deadline, uint256 currentTimestamp);
  error EvidenceHashAlreadyUsed(bytes32 evidenceHash);
  error InvalidEvidenceHash();
  error InvalidPaymentReference();
  error MinimumPaymentWindowNotMet(uint256 provided, uint256 minimum);
  error TradeAlreadyFunded(uint256 tradeId);
  error TradeNotFunded(uint256 tradeId);
  error FeeExceedsMaximum(uint256 feeBps, uint256 maxBps);
  error IncorrectNativeAmount(uint256 expected, uint256 actual);
  error TradeDoesNotExist(uint256 tradeId);
  error UnauthorizedDisputeResolver(address caller);
  error PaymentReferenceAlreadyUsed(bytes32 paymentReference);
}
