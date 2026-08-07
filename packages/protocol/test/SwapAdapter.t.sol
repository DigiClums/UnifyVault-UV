// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/swap/SwapAdapter.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/interfaces/ISwapAdapter.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20ForSwap is ERC20 {
  constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockUniswapV3Router {
  uint256 public multiplier = 2; // Default 1 tokenIn = 2 tokenOut
  bool public shouldRevert = false;

  function setMultiplier(uint256 newMultiplier) external {
    multiplier = newMultiplier;
  }

  function setShouldRevert(bool _revert) external {
    shouldRevert = _revert;
  }

  function exactInputSingle(
    IUniswapV3Router.ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut) {
    if (shouldRevert) revert('MockRouter: SWAP_FAILED');
    amountOut = params.amountIn * multiplier;

    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
    MockERC20ForSwap(params.tokenOut).mint(params.recipient, amountOut);
  }

  function exactInput(
    IUniswapV3Router.ExactInputParams calldata params
  ) external payable returns (uint256 amountOut) {
    if (shouldRevert) revert('MockRouter: MULTI_HOP_FAILED');
    amountOut = params.amountIn * multiplier;

    // Decode first token from path if available for mock transfer
    address tokenIn = address(bytes20(params.path[0:20]));
    address tokenOut = address(bytes20(params.path[params.path.length - 20:]));

    IERC20(tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
    MockERC20ForSwap(tokenOut).mint(params.recipient, amountOut);
  }

  function exactOutputSingle(
    IUniswapV3Router.ExactOutputSingleParams calldata params
  ) external payable returns (uint256 amountIn) {
    if (shouldRevert) revert('MockRouter: EXACT_OUT_FAILED');
    amountIn = params.amountOut / multiplier;

    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), amountIn);
    MockERC20ForSwap(params.tokenOut).mint(params.recipient, params.amountOut);
  }

  function exactOutput(
    IUniswapV3Router.ExactOutputParams calldata params
  ) external payable returns (uint256 amountIn) {
    if (shouldRevert) revert('MockRouter: EXACT_OUT_MULTI_FAILED');
    amountIn = params.amountOut / multiplier;

    address tokenIn = address(bytes20(params.path[0:20]));
    address tokenOut = address(bytes20(params.path[params.path.length - 20:]));

    IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
    MockERC20ForSwap(tokenOut).mint(params.recipient, params.amountOut);
  }
}

contract SwapAdapterTest is Test {
  SwapAdapter public swapAdapter;
  MockUniswapV3Router public mockRouter;

  MockERC20ForSwap public tokenA;
  MockERC20ForSwap public tokenB;

  address public admin = address(0x1);
  address public user = address(0x2);

  function setUp() public {
    mockRouter = new MockUniswapV3Router();
    tokenA = new MockERC20ForSwap('Token A', 'TKA');
    tokenB = new MockERC20ForSwap('Token B', 'TKB');

    swapAdapter = new SwapAdapter(admin, address(mockRouter));

    tokenA.mint(user, 1000 * 1e18);
  }

  // --- Initial Deployment Tests ---

  function test_InitialSetup() public {
    assertEq(swapAdapter.router(), address(mockRouter));
    assertTrue(swapAdapter.hasRole(swapAdapter.DEFAULT_ADMIN_ROLE(), admin));
    assertTrue(swapAdapter.hasRole(AccessRoles.GOVERNANCE_ROLE, admin));
  }

  function test_ConstructorInvalidRouterRevert() public {
    vm.expectRevert(ISwapAdapter.InvalidRouter.selector);
    new SwapAdapter(admin, address(0));
  }

  // --- Success Path Tests ---

  function test_SwapExactInputSingleSuccess() public {
    uint256 amountIn = 100 * 1e18;
    uint256 expectedOut = 200 * 1e18;

    vm.startPrank(user);
    tokenA.approve(address(swapAdapter), amountIn);

    ISwapAdapter.ExactInputParams memory params = ISwapAdapter.ExactInputParams({
      tokenIn: address(tokenA),
      tokenOut: address(tokenB),
      fee: 3000,
      recipient: user,
      deadline: block.timestamp + 100,
      amountIn: amountIn,
      minAmountOut: expectedOut,
      path: ''
    });

    uint256 actualOut = swapAdapter.swapExactInput(params);
    vm.stopPrank();

    assertEq(actualOut, expectedOut);
    assertEq(tokenB.balanceOf(user), expectedOut);

    // No custody verification: swapAdapter balance must be zero
    assertEq(tokenA.balanceOf(address(swapAdapter)), 0);
    assertEq(tokenB.balanceOf(address(swapAdapter)), 0);
  }

  function test_SwapExactInputMultiHopSuccess() public {
    uint256 amountIn = 50 * 1e18;
    uint256 expectedOut = 100 * 1e18;

    bytes memory path = abi.encodePacked(address(tokenA), uint24(3000), address(tokenB));

    vm.startPrank(user);
    tokenA.approve(address(swapAdapter), amountIn);

    ISwapAdapter.ExactInputParams memory params = ISwapAdapter.ExactInputParams({
      tokenIn: address(tokenA),
      tokenOut: address(tokenB),
      fee: 3000,
      recipient: user,
      deadline: block.timestamp + 100,
      amountIn: amountIn,
      minAmountOut: expectedOut,
      path: path
    });

    uint256 actualOut = swapAdapter.swapExactInput(params);
    vm.stopPrank();

    assertEq(actualOut, expectedOut);
    assertEq(tokenB.balanceOf(user), expectedOut);
  }

  function test_SwapExactOutputSuccess() public {
    uint256 targetOut = 200 * 1e18;
    uint256 maxIn = 100 * 1e18;

    vm.startPrank(user);
    tokenA.approve(address(swapAdapter), maxIn);

    ISwapAdapter.ExactOutputParams memory params = ISwapAdapter.ExactOutputParams({
      tokenIn: address(tokenA),
      tokenOut: address(tokenB),
      fee: 3000,
      recipient: user,
      deadline: block.timestamp + 100,
      amountOut: targetOut,
      maxAmountIn: maxIn,
      path: ''
    });

    uint256 actualIn = swapAdapter.swapExactOutput(params);
    vm.stopPrank();

    assertEq(actualIn, 100 * 1e18);
    assertEq(tokenB.balanceOf(user), targetOut);
    assertEq(tokenA.balanceOf(address(swapAdapter)), 0);
  }

  function test_ConvenienceSwapSuccess() public {
    uint256 amountIn = 10 * 1e18;

    vm.startPrank(user);
    tokenA.approve(address(swapAdapter), amountIn);
    uint256 amountOut = swapAdapter.swap(
      address(tokenA),
      address(tokenB),
      amountIn,
      20 * 1e18,
      user
    );
    vm.stopPrank();

    assertEq(amountOut, 20 * 1e18);
    assertEq(tokenB.balanceOf(user), 20 * 1e18);
  }

  // --- Slippage Failure Tests ---

  function test_SlippageFailureRevert() public {
    uint256 amountIn = 100 * 1e18;
    uint256 minOutTooHigh = 300 * 1e18; // Actual will be 200

    vm.startPrank(user);
    tokenA.approve(address(swapAdapter), amountIn);

    ISwapAdapter.ExactInputParams memory params = ISwapAdapter.ExactInputParams({
      tokenIn: address(tokenA),
      tokenOut: address(tokenB),
      fee: 3000,
      recipient: user,
      deadline: block.timestamp + 100,
      amountIn: amountIn,
      minAmountOut: minOutTooHigh,
      path: ''
    });

    vm.expectRevert(
      abi.encodeWithSelector(ISwapAdapter.SlippageLimitExceeded.selector, minOutTooHigh, 200 * 1e18)
    );
    swapAdapter.swapExactInput(params);
    vm.stopPrank();
  }

  // --- Zero Amount & Deadline Reverts ---

  function test_ZeroAmountRevert() public {
    vm.startPrank(user);
    ISwapAdapter.ExactInputParams memory params = ISwapAdapter.ExactInputParams({
      tokenIn: address(tokenA),
      tokenOut: address(tokenB),
      fee: 3000,
      recipient: user,
      deadline: block.timestamp + 100,
      amountIn: 0,
      minAmountOut: 0,
      path: ''
    });

    vm.expectRevert(ISwapAdapter.ZeroAmountDetected.selector);
    swapAdapter.swapExactInput(params);
    vm.stopPrank();
  }

  function test_DeadlineExpiredRevert() public {
    uint256 pastDeadline = block.timestamp - 1;

    vm.startPrank(user);
    tokenA.approve(address(swapAdapter), 100);

    ISwapAdapter.ExactInputParams memory params = ISwapAdapter.ExactInputParams({
      tokenIn: address(tokenA),
      tokenOut: address(tokenB),
      fee: 3000,
      recipient: user,
      deadline: pastDeadline,
      amountIn: 100,
      minAmountOut: 1,
      path: ''
    });

    vm.expectRevert(
      abi.encodeWithSelector(ISwapAdapter.DeadlineExpired.selector, pastDeadline, block.timestamp)
    );
    swapAdapter.swapExactInput(params);
    vm.stopPrank();
  }

  // --- Governance & Unauthorized Access Tests ---

  function test_SetRouterSuccess() public {
    address newRouterAddr = address(0x999);

    vm.prank(admin);
    vm.expectEmit(true, true, true, true);
    emit ISwapAdapter.RouterUpdated(address(mockRouter), newRouterAddr, admin);

    swapAdapter.setRouter(newRouterAddr);
    assertEq(swapAdapter.router(), newRouterAddr);
  }

  function test_SetRouterInvalidAddressRevert() public {
    vm.prank(admin);
    vm.expectRevert(ISwapAdapter.InvalidRouter.selector);
    swapAdapter.setRouter(address(0));
  }

  function test_UnauthorizedSetRouterRevert() public {
    vm.prank(user);
    vm.expectRevert(
      abi.encodeWithSelector(
        bytes4(keccak256('AccessControlUnauthorizedAccount(address,bytes32)')),
        user,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    swapAdapter.setRouter(address(0x999));
  }
}
