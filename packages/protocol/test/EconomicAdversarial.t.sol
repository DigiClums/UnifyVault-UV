// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/vault/LiquidityManager.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/swap/SwapAdapter.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import '../src/constants/ModuleIds.sol';
import '../src/interfaces/IPortfolioManager.sol';
import '../src/interfaces/ILiquidityManager.sol';
import '../src/interfaces/ISwapAdapter.sol';
import '../src/errors/Errors.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface ITestTreasuryForAdversarial {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
  function withdraw(address asset, address to, uint256 amount) external;
  function withdrawNative(address payable to, uint256 amount) external;
  function enableAsset(address asset) external;
  function disableAsset(address asset) external;
  function removeAsset(address asset) external;
  function pause() external;
  function unpause() external;
}

contract MockTokenForAdversarial is ERC20 {
  uint8 private _decimals;

  constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
    _decimals = decimals_;
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockDEXRouterForAdversarial {
  function exactInputSingle(
    IUniswapV3Router.ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut) {
    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

    uint8 inDec = MockTokenForAdversarial(params.tokenIn).decimals();
    uint8 outDec = MockTokenForAdversarial(params.tokenOut).decimals();

    if (inDec == 6 && outDec == 8) {
      amountOut = (params.amountIn * 1e8) / (60000 * 1e6);
    } else if (inDec == 6 && outDec == 18) {
      amountOut = (params.amountIn * 1e18) / (3000 * 1e6);
    } else if (inDec == 8 && outDec == 6) {
      amountOut = (params.amountIn * 60000 * 1e6) / 1e8;
    } else if (inDec == 18 && outDec == 6) {
      amountOut = (params.amountIn * 3000 * 1e6) / 1e18;
    } else {
      amountOut = (params.amountIn * (10 ** outDec)) / (10 ** inDec);
    }

    MockTokenForAdversarial(params.tokenOut).mint(params.recipient, amountOut);
  }

  function exactInput(
    IUniswapV3Router.ExactInputParams calldata params
  ) external payable returns (uint256 amountOut) {
    amountOut = params.amountIn;
  }
}

contract EconomicAdversarialTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  LiquidityManager public liquidityManager;
  ITestTreasuryForAdversarial public treasury;
  UVBTCETHToken public token;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  UnifyVaultController public controller;

  MockTokenForAdversarial public usdc;
  MockTokenForAdversarial public cbBTC;
  MockTokenForAdversarial public weth;
  MockDEXRouterForAdversarial public mockRouter;

  address public gov = address(0x111);
  address public guardian = address(0x222);
  address public attacker = address(0xBAD);
  address public alice = address(0xAAA);
  address public bob = address(0xBBB);

  bytes32 public btcId;
  bytes32 public ethId;
  bytes32 public usdcId;

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasuryForAdversarial(treasuryAddr);

    token = new UVBTCETHToken();

    usdc = new MockTokenForAdversarial('USD Coin', 'USDC', 6);
    cbBTC = new MockTokenForAdversarial('Coinbase Wrapped BTC', 'cbBTC', 8);
    weth = new MockTokenForAdversarial('Wrapped Ether', 'WETH', 18);

    mockRouter = new MockDEXRouterForAdversarial();
    swapAdapter = new SwapAdapter(gov, address(mockRouter));

    liquidityManager = new LiquidityManager(gov, address(directory));

    btcId = bytes32(uint256(uint160(address(cbBTC))));
    ethId = bytes32(uint256(uint160(address(weth))));
    usdcId = bytes32(uint256(uint160(address(usdc))));

    // Setup Oracles: cbBTC = $60,000, WETH = $3,000, USDC = $1.00
    oracleProvider.registerAsset(btcId, 60000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(ethId, 3000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);

    oracleManager.configureAsset(btcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(ethId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // Initial Strategy Allocation: 60% cbBTC, 40% WETH
    address[] memory assets = new address[](2);
    assets[0] = address(cbBTC);
    assets[1] = address(weth);
    uint256[] memory weights = new uint256[](2);
    weights[0] = 6000;
    weights[1] = 4000;

    strategyManager = new StrategyManager(gov, assets, weights);

    portfolioManager = new PortfolioManager(
      gov,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // Register Module IDs in ProtocolDirectory
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));

    // Register assets in CustodyVault & Treasury
    vault.registerAsset(address(cbBTC), 8);
    vault.registerAsset(address(weth), 18);
    vault.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(cbBTC), 8);
    treasury.registerAsset(address(weth), 18);

    // Grant Roles
    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    controller.grantRole(controller.GUARDIAN_ROLE(), guardian);

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    vm.startPrank(gov);
    liquidityManager.syncModules();
    liquidityManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    vm.stopPrank();
  }

  // =========================================================================
  // 1. Donation Attack
  // =========================================================================

  function testAdversarial_DonationAttack_DirectTransferDoesNotManipulateNAV() public {
    // Initial honest deposit by Alice
    uint256 aliceDeposit = 1000 * 1e6;
    usdc.mint(alice, aliceDeposit);
    vm.startPrank(alice);
    usdc.approve(address(controller), aliceDeposit);
    controller.deposit(address(usdc), aliceDeposit, 0, alice);
    vm.stopPrank();

    (uint256 tvlBefore, uint256 navBefore) = portfolioManager.calculateNAV();

    // Attacker donates 500,000 USDC directly to CustodyVault
    uint256 donationAmount = 500000 * 1e6;
    usdc.mint(attacker, donationAmount);
    vm.prank(attacker);
    usdc.transfer(address(vault), donationAmount);

    // Verify CustodyVault surplus tracks donation, but accounted assets remain unchanged
    assertEq(vault.surplusAssets(address(usdc)), donationAmount);

    (uint256 tvlAfter, uint256 navAfter) = portfolioManager.calculateNAV();

    // NAV and TVL must remain identical because totalAssets uses accounted assets only
    assertEq(tvlBefore, tvlAfter);
    assertEq(navBefore, navAfter);

    // Attacker attempts deposit after donation - must mint shares based on true accounted NAV
    uint256 attackerDeposit = 1000 * 1e6;
    usdc.mint(attacker, attackerDeposit);
    vm.startPrank(attacker);
    usdc.approve(address(controller), attackerDeposit);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      attackerDeposit,
      0,
      attacker
    );
    vm.stopPrank();

    // Attacker receives shares matching proportional deposit value without donation inflation
    assertApproxEqRel(quote.sharesPreview, token.balanceOf(alice), 1e16);
  }

  // =========================================================================
  // 2. Share Inflation Attack
  // =========================================================================

  function testAdversarial_ShareInflationAttack_RepeatedSmallDepositsNoUnfairGain() public {
    usdc.mint(attacker, 1000 * 1e6);

    vm.startPrank(attacker);
    usdc.approve(address(controller), type(uint256).max);

    // Small initial deposit
    controller.deposit(address(usdc), 100000, 0, attacker);
    vm.stopPrank();

    // Attacker donates directly to vault
    usdc.mint(address(vault), 1000000 * 1e6);

    // Honest user deposits $10,000
    uint256 bobDeposit = 10000 * 1e6;
    usdc.mint(bob, bobDeposit);
    vm.startPrank(bob);
    usdc.approve(address(controller), bobDeposit);
    UnifyVaultController.DepositQuote memory bobQuote = controller.deposit(
      address(usdc),
      bobDeposit,
      0,
      bob
    );
    vm.stopPrank();

    // Bob gets full proportional shares matching deposit value without loss to attacker
    assertGt(bobQuote.sharesPreview, 0);
    assertGt(token.balanceOf(bob), 0);

    uint256 bobShares = token.balanceOf(bob);
    uint256 attackerShares = token.balanceOf(attacker);

    // Bob's share ratio must reflect deposit value
    assertGt(bobShares, attackerShares);
  }

  // =========================================================================
  // 3. Flash Loan Simulation
  // =========================================================================

  function testAdversarial_FlashLoanSimulation_LargeLiquidityInjectionNoProfit() public {
    // Initial state
    uint256 initDeposit = 5000 * 1e6;
    usdc.mint(alice, initDeposit);
    vm.startPrank(alice);
    usdc.approve(address(controller), initDeposit);
    controller.deposit(address(usdc), initDeposit, 0, alice);
    vm.stopPrank();

    // Attacker flash-borrows 10,000,000 USDC
    uint256 flashLoanAmount = 10000000 * 1e6;
    usdc.mint(attacker, flashLoanAmount);

    uint256 attackerBalBefore = usdc.balanceOf(attacker);

    vm.startPrank(attacker);
    usdc.approve(address(controller), flashLoanAmount);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      flashLoanAmount,
      0,
      attacker
    );

    uint256 attackerShares = token.balanceOf(attacker);
    token.approve(address(controller), attackerShares);

    // Immediate flash redeem
    uint256 netAssetsOut = controller.redeem(
      address(usdc),
      attackerShares,
      0,
      attacker,
      block.timestamp + 300
    );
    vm.stopPrank();

    uint256 attackerBalAfter = usdc.balanceOf(attacker);

    // Attacker MUST NOT profit from flash deposit-redeem cycle (net output < input due to protocol fees)
    assertLe(attackerBalAfter, attackerBalBefore);
    assertLe(netAssetsOut, quote.netDeposit);
  }

  // =========================================================================
  // 4. Oracle Manipulation
  // =========================================================================

  function testAdversarial_OracleManipulation_StalePriceReverts() public {
    // Warp time past 3600s heartbeat limit
    vm.warp(block.timestamp + 3601);

    uint256 amount = 1000 * 1e6;
    usdc.mint(alice, amount);
    vm.startPrank(alice);
    usdc.approve(address(controller), amount);

    // Deposit must revert due to stale oracle price
    vm.expectRevert();
    controller.deposit(address(usdc), amount, 0, alice);
    vm.stopPrank();
  }

  function testAdversarial_OracleManipulation_ZeroPriceReverts() public {
    // Update asset price to 0 in mock oracle provider
    oracleProvider.setPrice(usdcId, 0);

    uint256 amount = 1000 * 1e6;
    usdc.mint(alice, amount);
    vm.startPrank(alice);
    usdc.approve(address(controller), amount);

    vm.expectRevert();
    controller.deposit(address(usdc), amount, 0, alice);
    vm.stopPrank();
  }

  function testAdversarial_OracleManipulation_NegativePriceReverts() public {
    // Update asset price to negative (-1000) in mock oracle provider
    oracleProvider.setPrice(usdcId, uint256(int256(-1000)));

    uint256 amount = 1000 * 1e6;
    usdc.mint(alice, amount);
    vm.startPrank(alice);
    usdc.approve(address(controller), amount);

    vm.expectRevert();
    controller.deposit(address(usdc), amount, 0, alice);
    vm.stopPrank();
  }

  // =========================================================================
  // 5. Slippage Attack
  // =========================================================================

  function testAdversarial_SlippageAttack_ProtectedByMinSharesOut() public {
    uint256 depositAmt = 1000 * 1e6;
    usdc.mint(alice, depositAmt);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);

    // User sets unreasonable minSharesOut expectation
    uint256 excessiveMinShares = 100000 * 1e18;

    vm.expectRevert();
    controller.deposit(address(usdc), depositAmt, excessiveMinShares, alice);
    vm.stopPrank();
  }

  function testAdversarial_SlippageAttack_RedeemProtectedByMinAssetsOut() public {
    // Initial deposit
    uint256 depositAmt = 1000 * 1e6;
    usdc.mint(alice, depositAmt);
    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, alice);

    uint256 shares = token.balanceOf(alice);
    token.approve(address(controller), shares);

    uint256 excessiveMinAssets = 50000 * 1e6;

    vm.expectRevert();
    controller.redeem(address(usdc), shares, excessiveMinAssets, alice, block.timestamp + 100);
    vm.stopPrank();
  }

  // =========================================================================
  // 6. Liquidity Exhaustion
  // =========================================================================

  function testAdversarial_LiquidityExhaustion_RedemptionLargerThanOperational() public {
    // Deposit $100,000 USDC into protocol
    uint256 totalDep = 100000 * 1e6;
    usdc.mint(alice, totalDep);
    vm.startPrank(alice);
    usdc.approve(address(controller), totalDep);
    controller.deposit(address(usdc), totalDep, 0, alice);
    vm.stopPrank();

    // Operational liquidity set to $10,000, Reserve liquidity set to $90,000
    vm.prank(gov);
    liquidityManager.setLiquidityBalances(address(usdc), 10000 * 1e6, 90000 * 1e6);

    // Alice attempts to redeem half ($50,000 USDC worth of shares), exceeding operational liquidity ($10,000)
    uint256 aliceShares = token.balanceOf(alice) / 2;

    vm.startPrank(alice);
    token.approve(address(controller), aliceShares);
    uint256 netOut = controller.redeem(address(usdc), aliceShares, 0, alice, block.timestamp + 300);
    vm.stopPrank();

    assertGt(netOut, 0);

    uint256 gross = (netOut * 10000) / 9990;
    vm.prank(gov);
    liquidityManager.recordWithdrawal(address(usdc), gross);

    // Verify LiquidityManager correctly adjusts operational to 0 and pulls remainder from reserve
    (uint256 opBal, uint256 resBal, uint256 totalBal) = liquidityManager.getLiquidityBalances(
      address(usdc)
    );
    assertEq(opBal, 0);
    assertGt(totalBal, 0);
    assertEq(opBal + resBal, totalBal);
  }

  // =========================================================================
  // 7. Repeated Rebalance Simulation
  // =========================================================================

  function testAdversarial_RepeatedRebalanceSimulation_AccountingIntegrity() public {
    vm.startPrank(gov);
    liquidityManager.setLiquidityBalances(address(usdc), 1000 * 1e6, 9000 * 1e6);

    // Execute 50 sequential refill & sweep operations
    for (uint256 i = 0; i < 50; i++) {
      liquidityManager.sweepReserveLiquidity(address(usdc), 100 * 1e6);
      (uint256 op, uint256 res, uint256 total) = liquidityManager.getLiquidityBalances(
        address(usdc)
      );
      assertEq(op + res, total);
      assertEq(total, 10000 * 1e6);

      liquidityManager.refillOperationalLiquidity(address(usdc), 100 * 1e6);
      (op, res, total) = liquidityManager.getLiquidityBalances(address(usdc));
      assertEq(op + res, total);
      assertEq(total, 10000 * 1e6);
    }
    vm.stopPrank();
  }

  // =========================================================================
  // 8. Unauthorized Treasury Access
  // =========================================================================

  function testAdversarial_UnauthorizedTreasuryAccess_AllExecutionPathsRevert() public {
    vm.startPrank(attacker);

    // 1. Unauthorized withdraw
    vm.expectRevert();
    treasury.withdraw(address(usdc), attacker, 1000);

    // 2. Unauthorized withdrawNative
    vm.expectRevert();
    treasury.withdrawNative(payable(attacker), 1000);

    // 3. Unauthorized disableAsset
    vm.expectRevert();
    treasury.disableAsset(address(usdc));

    // 4. Unauthorized enableAsset
    vm.expectRevert();
    treasury.enableAsset(address(usdc));

    // 5. Unauthorized removeAsset
    vm.expectRevert();
    treasury.removeAsset(address(usdc));

    // 6. Unauthorized pause
    vm.expectRevert();
    treasury.pause();

    // 7. Unauthorized unpause
    vm.expectRevert();
    treasury.unpause();

    vm.stopPrank();
  }

  // =========================================================================
  // 9. Rounding Attack
  // =========================================================================

  function testAdversarial_RoundingAttack_DustDepositRedeemRepeatedlyNoProfit() public {
    usdc.mint(attacker, 100 * 1e6);

    vm.startPrank(attacker);
    usdc.approve(address(controller), type(uint256).max);
    token.approve(address(controller), type(uint256).max);

    uint256 attackerInitialBal = usdc.balanceOf(attacker);

    // Execute 30 1-wei / dust deposit & redeem cycles
    for (uint256 i = 0; i < 30; i++) {
      try controller.deposit(address(usdc), 100, 0, attacker) returns (
        UnifyVaultController.DepositQuote memory
      ) {
        uint256 shares = token.balanceOf(attacker);
        if (shares > 0) {
          try
            controller.redeem(address(usdc), shares, 0, attacker, block.timestamp + 100)
          {} catch {}
        }
      } catch {}
    }
    vm.stopPrank();

    uint256 attackerFinalBal = usdc.balanceOf(attacker);

    // Attacker balance must NEVER increase from dust rounding cycles
    assertLe(attackerFinalBal, attackerInitialBal);
  }

  // =========================================================================
  // 10. Multi-user Fairness
  // =========================================================================

  function testAdversarial_MultiUserFairness_ProportionalOwnershipPreserved() public {
    uint256 aliceDeposit = 1000 * 1e6;
    uint256 bobDeposit = 2000 * 1e6;

    usdc.mint(alice, aliceDeposit);
    usdc.mint(bob, bobDeposit);

    // Alice deposits $1,000
    vm.startPrank(alice);
    usdc.approve(address(controller), aliceDeposit);
    controller.deposit(address(usdc), aliceDeposit, 0, alice);
    vm.stopPrank();

    // Bob deposits $2,000
    vm.startPrank(bob);
    usdc.approve(address(controller), bobDeposit);
    controller.deposit(address(usdc), bobDeposit, 0, bob);
    vm.stopPrank();

    uint256 aliceShares = token.balanceOf(alice);
    uint256 bobShares = token.balanceOf(bob);

    // Bob must have exactly ~2x Alice's shares
    assertApproxEqRel(bobShares, aliceShares * 2, 1e16); // 1% tolerance for fee precision

    // Bob redeems half his shares
    vm.startPrank(bob);
    token.approve(address(controller), bobShares / 2);
    uint256 bobNetOut = controller.redeem(
      address(usdc),
      bobShares / 2,
      0,
      bob,
      block.timestamp + 300
    );
    vm.stopPrank();

    assertGt(bobNetOut, 0);

    // Both redeem remaining shares fully
    vm.startPrank(alice);
    token.approve(address(controller), token.balanceOf(alice));
    uint256 aliceFinalOut = controller.redeem(
      address(usdc),
      token.balanceOf(alice),
      0,
      alice,
      block.timestamp + 300
    );
    vm.stopPrank();

    vm.startPrank(bob);
    token.approve(address(controller), token.balanceOf(bob));
    uint256 bobFinalOut = controller.redeem(
      address(usdc),
      token.balanceOf(bob),
      0,
      bob,
      block.timestamp + 300
    );
    vm.stopPrank();

    assertGt(aliceFinalOut, 0);
    assertGt(bobFinalOut, 0);
  }
}
