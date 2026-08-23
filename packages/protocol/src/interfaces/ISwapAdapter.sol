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
  event PoolFeeUpdated(
    address indexed tokenA,
    address indexed tokenB,
    uint24 oldFee,
    uint24 newFee,
    address indexed caller
  );
  event DefaultFeeTierUpdated(uint24 oldFee, uint24 newFee, address indexed caller);

  // Custom Errors
  error ZeroAddressDetected();
  error ZeroAmountDetected();
  error SlippageLimitExceeded(uint256 expected, uint256 actual);
  error DeadlineExpired(uint256 deadline, uint256 currentTimestamp);
  error InvalidRouter();
  error InvalidFeeTier();
  error PoolDoesNotExist(address tokenA, address tokenB, uint24 fee);
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

  function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    address recipient,
    uint256 deadline
  ) external returns (uint256 amountOut);

  function getExpectedOutput(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) external view returns (uint256 amountOut);

  function quote(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) external view returns (uint256 amountOut);

  function bestRoute(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) external view returns (address targetRouter, uint256 expectedOut, bytes memory routeData);

  function supportedRouters() external view returns (address[] memory routers);

  function router() external view returns (address);

  function getPoolFee(address tokenA, address tokenB) external view returns (uint24 fee);
}
