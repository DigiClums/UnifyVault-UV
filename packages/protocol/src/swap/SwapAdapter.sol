// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../interfaces/ISwapAdapter.sol';
import '../libraries/AccessRoles.sol';

interface IUniswapV3Router {
  struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
  }

  struct ExactInputParams {
    bytes path;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
  }

  struct ExactOutputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 deadline;
    uint256 amountOut;
    uint256 amountInMaximum;
    uint160 sqrtPriceLimitX96;
  }

  struct ExactOutputParams {
    bytes path;
    address recipient;
    uint256 deadline;
    uint256 amountOut;
    uint256 amountInMaximum;
  }

  function exactInputSingle(
    ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut);

  function exactInput(
    ExactInputParams calldata params
  ) external payable returns (uint256 amountOut);

  function exactOutputSingle(
    ExactOutputSingleParams calldata params
  ) external payable returns (uint256 amountIn);

  function exactOutput(
    ExactOutputParams calldata params
  ) external payable returns (uint256 amountIn);
}

/**
 * @title SwapAdapter
 * @notice DEX router execution layer for UnifyVault V2
 * @dev Stateless swap executor interfacing with approved DEX routers (e.g. Uniswap V3).
 * Contains NO portfolio logic, NO NAV calculation, and NO token custody.
 */
contract SwapAdapter is AccessControl, ISwapAdapter {
  using SafeERC20 for IERC20;

  uint24 public constant DEFAULT_FEE_TIER = 3000; // 0.3% default pool fee

  address public override router;

  /**
   * @notice SwapAdapter constructor initializing access control and router address
   * @param admin Address granted DEFAULT_ADMIN_ROLE and GOVERNANCE_ROLE
   * @param initialRouter Address of target DEX Router (e.g. Uniswap V3 SwapRouter)
   */
  constructor(address admin, address initialRouter) {
    if (admin == address(0)) revert ZeroAddressDetected();
    if (initialRouter == address(0)) revert InvalidRouter();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    router = initialRouter;
  }

  // --- External Governance Functions ---

  /**
   * @notice Updates the target DEX router address
   * @param newRouter Address of the new approved DEX router
   */
  function setRouter(address newRouter) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (newRouter == address(0)) revert InvalidRouter();
    address oldRouter = router;
    router = newRouter;
    emit RouterUpdated(oldRouter, newRouter, msg.sender);
  }

  // --- External Execution Functions ---

  /**
   * @notice Executes an exact input token swap through the configured DEX router
   * @param params ExactInputParams struct defining tokenIn, tokenOut, fee, recipient, deadline, amountIn, minAmountOut, and path
   * @return amountOut Actual output amount received from DEX router
   */
  function swapExactInput(
    ExactInputParams calldata params
  ) external override returns (uint256 amountOut) {
    return _executeSwapExactInput(params, msg.sender);
  }

  /**
   * @notice Executes an exact output token swap through the configured DEX router
   * @param params ExactOutputParams struct defining tokenIn, tokenOut, fee, recipient, deadline, amountOut, maxAmountIn, and path
   * @return amountIn Actual input amount spent from caller
   */
  function swapExactOutput(
    ExactOutputParams calldata params
  ) external override returns (uint256 amountIn) {
    return _executeSwapExactOutput(params, msg.sender);
  }

  /**
   * @notice Simplified single-hop swap convenience function
   */
  function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    address recipient
  ) external override returns (uint256 amountOut) {
    ExactInputParams memory params = ExactInputParams({
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: DEFAULT_FEE_TIER,
      recipient: recipient,
      deadline: block.timestamp + 300,
      amountIn: amountIn,
      minAmountOut: minAmountOut,
      path: ''
    });

    return _executeSwapExactInput(params, msg.sender);
  }

  /**
   * @notice Returns estimated output amount for single-hop swap
   */
  function getExpectedOutput(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) external pure override returns (uint256 amountOut) {
    if (tokenIn == address(0) || tokenOut == address(0) || amountIn == 0) return 0;
    // Basic fallback simulation estimate
    return amountIn;
  }

  // --- Internal Helper Functions ---

  function _executeSwapExactInput(
    ExactInputParams memory params,
    address payer
  ) internal returns (uint256 amountOut) {
    if (params.tokenIn == address(0) || params.tokenOut == address(0)) {
      revert ZeroAddressDetected();
    }
    if (params.amountIn == 0) revert ZeroAmountDetected();
    if (params.deadline < block.timestamp) {
      revert DeadlineExpired(params.deadline, block.timestamp);
    }
    if (router == address(0)) revert InvalidRouter();

    address recipient = params.recipient == address(0) ? payer : params.recipient;

    // 1. Pull exact input token from payer
    IERC20(params.tokenIn).safeTransferFrom(payer, address(this), params.amountIn);

    // 2. Approve DEX router
    IERC20(params.tokenIn).forceApprove(router, params.amountIn);

    // 3. Execute swap on router
    if (params.path.length > 0) {
      amountOut = IUniswapV3Router(router).exactInput(
        IUniswapV3Router.ExactInputParams({
          path: params.path,
          recipient: recipient,
          deadline: params.deadline,
          amountIn: params.amountIn,
          amountOutMinimum: params.minAmountOut
        })
      );
    } else {
      uint24 fee = params.fee == 0 ? DEFAULT_FEE_TIER : params.fee;
      amountOut = IUniswapV3Router(router).exactInputSingle(
        IUniswapV3Router.ExactInputSingleParams({
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          fee: fee,
          recipient: recipient,
          deadline: params.deadline,
          amountIn: params.amountIn,
          amountOutMinimum: params.minAmountOut,
          sqrtPriceLimitX96: 0
        })
      );
    }

    // 4. Validate slippage limit
    if (amountOut < params.minAmountOut) {
      revert SlippageLimitExceeded(params.minAmountOut, amountOut);
    }

    // 5. Reset router approval
    IERC20(params.tokenIn).forceApprove(router, 0);

    // 6. Anti-custody sweep check for any residual tokenIn or tokenOut
    _sweepResidual(params.tokenIn, payer);
    _sweepResidual(params.tokenOut, recipient);

    emit SwapExecuted(params.tokenIn, params.tokenOut, params.amountIn, amountOut, recipient);
  }

  function _executeSwapExactOutput(
    ExactOutputParams memory params,
    address payer
  ) internal returns (uint256 amountIn) {
    if (params.tokenIn == address(0) || params.tokenOut == address(0)) {
      revert ZeroAddressDetected();
    }
    if (params.amountOut == 0) revert ZeroAmountDetected();
    if (params.deadline < block.timestamp) {
      revert DeadlineExpired(params.deadline, block.timestamp);
    }
    if (router == address(0)) revert InvalidRouter();

    address recipient = params.recipient == address(0) ? payer : params.recipient;

    // 1. Pull max input token from payer
    IERC20(params.tokenIn).safeTransferFrom(payer, address(this), params.maxAmountIn);

    // 2. Approve DEX router
    IERC20(params.tokenIn).forceApprove(router, params.maxAmountIn);

    // 3. Execute swap on router
    if (params.path.length > 0) {
      amountIn = IUniswapV3Router(router).exactOutput(
        IUniswapV3Router.ExactOutputParams({
          path: params.path,
          recipient: recipient,
          deadline: params.deadline,
          amountOut: params.amountOut,
          amountInMaximum: params.maxAmountIn
        })
      );
    } else {
      uint24 fee = params.fee == 0 ? DEFAULT_FEE_TIER : params.fee;
      amountIn = IUniswapV3Router(router).exactOutputSingle(
        IUniswapV3Router.ExactOutputSingleParams({
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          fee: fee,
          recipient: recipient,
          deadline: params.deadline,
          amountOut: params.amountOut,
          amountInMaximum: params.maxAmountIn,
          sqrtPriceLimitX96: 0
        })
      );
    }

    // 4. Validate max input limit
    if (amountIn > params.maxAmountIn) {
      revert SlippageLimitExceeded(params.maxAmountIn, amountIn);
    }

    // 5. Reset router approval
    IERC20(params.tokenIn).forceApprove(router, 0);

    // 6. Return unused input tokens and sweep residuals
    _sweepResidual(params.tokenIn, payer);
    _sweepResidual(params.tokenOut, recipient);

    emit SwapExecuted(params.tokenIn, params.tokenOut, amountIn, params.amountOut, recipient);
  }

  /**
   * @dev Sweeps any leftover token balance from contract to destination to guarantee zero custody
   */
  function _sweepResidual(address tokenAddress, address destination) internal {
    uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
    if (balance > 0 && destination != address(0)) {
      IERC20(tokenAddress).safeTransfer(destination, balance);
    }
  }
}
