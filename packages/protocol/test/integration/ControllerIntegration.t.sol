// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/oracle/OracleManager.sol';
import '../../src/oracle/MockOracleProvider.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/strategy/StrategyManager.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/swap/SwapAdapter.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/libraries/FeeLib.sol';
import '../../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface ITestTreasuryForController {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockUSDCForController is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {}

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract ControllerIntegrationTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  ITestTreasuryForController public treasury;
  UVBTCETHToken public token;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  UnifyVaultController public controller;

  MockUSDCForController public usdc;

  address public admin = address(0x1);
  address public user = address(0x2);

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasuryForController(treasuryAddr);

    token = new UVBTCETHToken();
    usdc = new MockUSDCForController();

    // Register USDC Oracle ($1.00 USD)
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // Register Strategy with 100% USDC
    address[] memory assets = new address[](1);
    assets[0] = address(usdc);
    uint256[] memory weights = new uint256[](1);
    weights[0] = 10000;

    strategyManager = new StrategyManager(admin, assets, weights);

    // Setup PortfolioManager and SwapAdapter
    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );
    swapAdapter = new SwapAdapter(admin, address(0x999));

    // Setup Controller
    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // Register all Module IDs in ProtocolDirectory
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));

    // Configure Vault & Treasury
    vault.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(usdc), 6);

    // Grant Controller roles
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Mint USDC to user
    usdc.mint(user, 10000 * 1e6);
  }

  function test_FullV2DepositOrchestration() public {
    uint256 depositAmt = 1000 * 1e6;
    uint256 fee = FeeLib.calculateDepositFee(depositAmt);
    uint256 netDeposit = depositAmt - fee;

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      user
    );
    vm.stopPrank();

    // Verify Deposit Quote & Share Minting
    assertEq(quote.depositAmount, depositAmt);
    assertEq(quote.protocolFee, fee);
    assertEq(quote.netDeposit, netDeposit);
    assertEq(token.balanceOf(user), quote.sharesPreview);

    // Verify Collateral & Fee Routing
    assertEq(vault.totalAssets(address(usdc)), netDeposit);
    assertEq(usdc.balanceOf(address(treasury)), fee);

    // Verify Controller Stateless Invariant (zero balance remaining)
    assertEq(usdc.balanceOf(address(controller)), 0);
  }

  function test_FullV2RedeemOrchestration() public {
    uint256 depositAmt = 1000 * 1e6;

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();

    uint256 userShares = token.balanceOf(user);

    // User redeems all shares
    vm.startPrank(user);
    token.approve(address(controller), userShares);
    uint256 netRedeemed = controller.redeem(
      address(usdc),
      userShares,
      0,
      user,
      block.timestamp + 100
    );
    vm.stopPrank();

    // Shares burned from user
    assertEq(token.balanceOf(user), 0);
    assertGt(netRedeemed, 0);

    // Verify Controller Stateless Invariant
    assertEq(usdc.balanceOf(address(controller)), 0);
  }

  function test_ControllerModuleResolution() public {
    assertEq(controller.portfolioManager(), address(portfolioManager));
    assertEq(controller.strategyManager(), address(strategyManager));
    assertEq(controller.swapAdapter(), address(swapAdapter));
  }
}
