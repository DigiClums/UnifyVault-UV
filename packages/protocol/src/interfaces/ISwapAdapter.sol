// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ISwapAdapter
 * @notice Interface for UnifyVault DEX Swap Adapter execution layer
 */
interface ISwapAdapter {
  struct ExactInputParams {
    address tokenIn;
    address tokenOut;
    uint24 fee; // e.g. 500 (0.05%), 3000 (0.3%), 10000 (1%) for Uniswap V3 pool fee
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 minAmountOut;
    bytes path; // Optional multi-hop encoded path
  }

  struct ExactOutputParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 deadline;
    uint256 amountOut;
    uint256 maxAmountIn;
    bytes path;
  }

  // Events
  event SwapExecuted(
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut,
    address indexed recipient
  );
  event RouterUpdated(address indexed oldRouter, address indexed newRouter, address indexed caller);

  // Custom Errors
  error ZeroAddressDetected();
  error ZeroAmountDetected();
  error SlippageLimitExceeded(uint256 expected, uint256 actual);
  error DeadlineExpired(uint256 deadline, uint256 currentTimestamp);
  error InvalidRouter();
  error SwapExecutionFailed();

  // Core Execution Methods
  function swapExactInput(ExactInputParams calldata params) external returns (uint256 amountOut);

  function swapExactOutput(ExactOutputParams calldata params) external returns (uint256 amountIn);

  function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    address recipient
  ) external returns (uint256 amountOut);

  function getExpectedOutput(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) external view returns (uint256 amountOut);

  function router() external view returns (address);
}
