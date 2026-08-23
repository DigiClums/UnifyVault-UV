// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../interfaces/ISwapAdapter.sol';
import '../libraries/AccessRoles.sol';

interface IUniswapV3Factory {
  function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapV3Router02 {
  struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
  }

  struct ExactInputParams {
    bytes path;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
  }

  struct ExactOutputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 amountOut;
    uint256 amountInMaximum;
    uint160 sqrtPriceLimitX96;
  }

  struct ExactOutputParams {
    bytes path;
    address recipient;
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

  function factory() external view returns (address);
}

interface IUniswapV3Router is IUniswapV3Router02 {}

/**
 * @title SwapAdapter
 * @notice DEX router execution layer for UnifyVault V2 supporting Uniswap V3 SwapRouter02
 * @dev Stateless swap executor interfacing with approved DEX routers (e.g. Uniswap V3 SwapRouter02).
 * Supports configurable token-pair fee tiers (e.g. 500 for USDC/WETH & USDC/cbBTC on Base Mainnet).
 * Contains NO portfolio logic, NO NAV calculation, and NO token custody.
 */
contract SwapAdapter is AccessControl, ISwapAdapter {
  using SafeERC20 for IERC20;

  uint24 public constant FEE_LOWEST = 100; // 0.01%
  uint24 public constant FEE_LOW = 500; // 0.05%
  uint24 public constant FEE_MEDIUM = 3000; // 0.3%
  uint24 public constant FEE_HIGH = 10000; // 1%

  address public immutable override router;
  address public immutable factory;

  uint24 public defaultFeeTier;

  // Pair specific pool fee tier mapping: tokenA => tokenB => feeTier (symmetric)
  mapping(address => mapping(address => uint24)) private _poolFees;

  /**
   * @notice SwapAdapter constructor initializing access control, immutable router address and default fee tier (500 by default)
   * @param admin Address granted DEFAULT_ADMIN_ROLE and GOVERNANCE_ROLE
   * @param initialRouter Address of target DEX Router (Uniswap V3 SwapRouter02)
   */
  constructor(address admin, address initialRouter) {
    if (admin == address(0)) revert ZeroAddressDetected();
    if (initialRouter == address(0)) revert InvalidRouter();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    router = initialRouter;
    defaultFeeTier = FEE_LOW; // 500 (0.05%) default

    address f = address(0);
    try IUniswapV3Router02(initialRouter).factory() returns (address routerFactory) {
      f = routerFactory;
    } catch {}
    factory = f;
  }

  // --- External Governance Functions ---

  /**
   * @notice Configures the specific fee tier for a pair of tokens
   * @param tokenA First token address
   * @param tokenB Second token address
   * @param fee Uniswap V3 pool fee tier (100, 500, 3000, or 10000)
   */
  function setPoolFee(
    address tokenA,
    address tokenB,
    uint24 fee
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (tokenA == address(0) || tokenB == address(0)) revert ZeroAddressDetected();
    if (tokenA == tokenB) revert ZeroAddressDetected();
    if (!_isValidFeeTier(fee)) revert InvalidFeeTier();

    if (factory != address(0)) {
      address pool = IUniswapV3Factory(factory).getPool(tokenA, tokenB, fee);
      if (pool == address(0)) revert PoolDoesNotExist(tokenA, tokenB, fee);
    }

    uint24 oldFee = _poolFees[tokenA][tokenB];
    _poolFees[tokenA][tokenB] = fee;
    _poolFees[tokenB][tokenA] = fee;

    emit PoolFeeUpdated(tokenA, tokenB, oldFee, fee, msg.sender);
  }

  /**
   * @notice Updates the default fee tier for pairs without specific configuration
   * @param newDefaultFee Default fee tier (100, 500, 3000, 10000)
   */
  function setDefaultFeeTier(uint24 newDefaultFee) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (!_isValidFeeTier(newDefaultFee)) revert InvalidFeeTier();
    uint24 oldFee = defaultFeeTier;
    defaultFeeTier = newDefaultFee;
    emit DefaultFeeTierUpdated(oldFee, newDefaultFee, msg.sender);
  }

  /**
   * @notice Returns the configured fee tier for a token pair (or defaultFeeTier if unconfigured)
   */
  function getPoolFee(address tokenA, address tokenB) public view override returns (uint24 fee) {
    uint24 configured = _poolFees[tokenA][tokenB];
    return configured > 0 ? configured : defaultFeeTier;
  }

  // --- External Execution Functions ---

  /**
   * @notice Executes an exact input token swap through the configured DEX router
   */
  function swapExactInput(
    ExactInputParams calldata params
  ) external override returns (uint256 amountOut) {
    return _executeSwapExactInput(params, msg.sender);
  }

  /**
   * @notice Executes an exact output token swap through the configured DEX router
   */
  function swapExactOutput(
    ExactOutputParams calldata params
  ) external override returns (uint256 amountIn) {
    return _executeSwapExactOutput(params, msg.sender);
  }

  /**
   * @notice Simplified single-hop swap convenience function used by UnifyVaultController
   */
  function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    address recipient
  ) external override returns (uint256 amountOut) {
    uint24 fee = getPoolFee(tokenIn, tokenOut);
    ExactInputParams memory params = ExactInputParams({
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: fee,
      recipient: recipient,
      deadline: block.timestamp + 1800,
      amountIn: amountIn,
      minAmountOut: minAmountOut,
      path: ''
    });

    return _executeSwapExactInput(params, msg.sender);
  }

  function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    address recipient,
    uint256 deadline
  ) external override returns (uint256 amountOut) {
    uint24 fee = getPoolFee(tokenIn, tokenOut);
    ExactInputParams memory params = ExactInputParams({
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: fee,
      recipient: recipient,
      deadline: deadline == 0 ? block.timestamp + 1800 : deadline,
      amountIn: amountIn,
      minAmountOut: minAmountOut,
      path: ''
    });

    return _executeSwapExactInput(params, msg.sender);
  }

  function getExpectedOutput(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) public pure override returns (uint256 amountOut) {
    if (tokenIn == address(0) || tokenOut == address(0) || amountIn == 0) return 0;
    return amountIn;
  }

  function quote(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) external pure override returns (uint256 amountOut) {
    return getExpectedOutput(tokenIn, tokenOut, amountIn);
  }

  function bestRoute(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  )
    external
    view
    override
    returns (address targetRouter, uint256 expectedOut, bytes memory routeData)
  {
    return (router, getExpectedOutput(tokenIn, tokenOut, amountIn), '');
  }

  function supportedRouters() external view override returns (address[] memory routers) {
    routers = new address[](1);
    routers[0] = router;
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

    // 3. Track balance before swap and execute swap on router
    uint256 recipientBalBefore = IERC20(params.tokenOut).balanceOf(recipient);

    if (params.path.length > 0) {
      amountOut = IUniswapV3Router02(router).exactInput(
        IUniswapV3Router02.ExactInputParams({
          path: params.path,
          recipient: recipient,
          amountIn: params.amountIn,
          amountOutMinimum: params.minAmountOut
        })
      );
    } else {
      uint24 fee = params.fee == 0 ? getPoolFee(params.tokenIn, params.tokenOut) : params.fee;
      amountOut = IUniswapV3Router02(router).exactInputSingle(
        IUniswapV3Router02.ExactInputSingleParams({
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          fee: fee,
          recipient: recipient,
          amountIn: params.amountIn,
          amountOutMinimum: params.minAmountOut,
          sqrtPriceLimitX96: 0
        })
      );
    }

    uint256 recipientBalAfter = IERC20(params.tokenOut).balanceOf(recipient);
    uint256 actualReceived = recipientBalAfter - recipientBalBefore;

    // 4. Validate slippage limit against actual received balance
    if (actualReceived < params.minAmountOut) {
      revert SlippageLimitExceeded(params.minAmountOut, actualReceived);
    }
    amountOut = actualReceived;

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
      amountIn = IUniswapV3Router02(router).exactOutput(
        IUniswapV3Router02.ExactOutputParams({
          path: params.path,
          recipient: recipient,
          amountOut: params.amountOut,
          amountInMaximum: params.maxAmountIn
        })
      );
    } else {
      uint24 fee = params.fee == 0 ? getPoolFee(params.tokenIn, params.tokenOut) : params.fee;
      amountIn = IUniswapV3Router02(router).exactOutputSingle(
        IUniswapV3Router02.ExactOutputSingleParams({
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          fee: fee,
          recipient: recipient,
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

  function _isValidFeeTier(uint24 fee) internal pure returns (bool) {
    return fee == FEE_LOWEST || fee == FEE_LOW || fee == FEE_MEDIUM || fee == FEE_HIGH;
  }
}
