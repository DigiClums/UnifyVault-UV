// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/ProtocolDirectory.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20Decimals is ERC20 {
  uint8 private _dec;

  constructor(string memory name, string memory symbol, uint8 dec) ERC20(name, symbol) {
    _dec = dec;
  }

  function decimals() public view override returns (uint8) {
    return _dec;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract RedemptionDecimalScalingTest is Test {
  ProtocolDirectory public directory;
  StrategyManager public strategyManager;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  UVBTCETHToken public token;
  PortfolioManager public portfolioManager;
  UnifyVaultController public controller;

  address public admin = address(this);
  address public user = address(0x42);
  address public treasury = address(0x99);

  MockERC20Decimals public cbBTC;
  MockERC20Decimals public WETH;
  MockERC20Decimals public USDC;

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    token = new UVBTCETHToken();

    // Token Decimals: cbBTC = 8, WETH = 18, USDC = 6
    cbBTC = new MockERC20Decimals('cbBTC', 'cbBTC', 8);
    WETH = new MockERC20Decimals('Wrapped ETH', 'WETH', 18);
    USDC = new MockERC20Decimals('USD Coin', 'USDC', 6);

    // Register Chainlink 8-decimal raw feeds in MockOracleProvider normalized to 18 decimals in OracleManager
    // BTC = $64,887, ETH = $1,913, USDC = $1.00
    bytes32 btcId = bytes32(uint256(uint160(address(cbBTC))));
    bytes32 ethId = bytes32(uint256(uint160(address(WETH))));
    bytes32 usdcId = bytes32(uint256(uint160(address(USDC))));

    // Raw Chainlink 8-decimal answers
    oracleProvider.registerAsset(btcId, 64887 * 1e8, 8, block.timestamp, 1);
    oracleProvider.registerAsset(ethId, 1913 * 1e8, 8, block.timestamp, 1);
    oracleProvider.registerAsset(usdcId, 1 * 1e8, 8, block.timestamp, 1);

    oracleManager.configureAsset(btcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(ethId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // Strategy 60% BTC / 40% ETH
    address[] memory assets = new address[](2);
    assets[0] = address(cbBTC);
    assets[1] = address(WETH);

    uint256[] memory weights = new uint256[](2);
    weights[0] = 6000; // 60%
    weights[1] = 4000; // 40%

    strategyManager = new StrategyManager(admin, assets, weights);

    vault.registerAsset(address(cbBTC), 8);
    vault.registerAsset(address(WETH), 18);
    vault.registerAsset(address(USDC), 6);

    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    vm.etch(treasury, hex'6000');
    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      treasury,
      address(token)
    );

    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(keccak256('UnifyVaultController'), address(controller));
  }

  // --- Regression Tests ---

  /**
   * @notice A. Redeem 1 UVBTCETH (Genesis/Bootstrap State when totalShares = 1000 dead shares)
   */
  function test_Regression_Redeem1Share_Bootstrap() public {
    // Simulate initial vault state with 1 satoshi cbBTC and 1 wei WETH (total val ~$0.648 USD)
    cbBTC.mint(address(vault), 1);
    WETH.mint(address(vault), 1);

    // Initial totalShares = 1000 (bootstrap DEAD_SHARES)
    token.grantRole(token.CONTROLLER_ROLE(), address(this));
    token.mint(address(0xDEAD), 1000);

    IPortfolioManager.RedeemPreview memory preview = portfolioManager.previewRedeem(
      1e18,
      address(USDC)
    );

    // 1 UVBTCETH at initial genesis NAV ($1.00 USD) = 1,000,000 USDC units (6 decimals)
    assertEq(preview.userShareUSDValue, 1e18); // $1.00 USD
    assertEq(preview.payoutAmount, 1e6); // 1.00 USDC

    // Assert value is nowhere near $648 Billion
    assertTrue(preview.userShareUSDValue < 1000 * 1e18, 'Value must be sane (around $1 USD)');
    assertTrue(preview.payoutAmount < 1000 * 1e6, 'Payout must be around 1 USDC');
  }

  /**
   * @notice Regression test specifically checking that 1 share redemption NEVER produces $648,026,062,859.01
   */
  function test_Regression_ExactObservedBugValueNotProduced() public {
    cbBTC.mint(address(vault), 1);
    WETH.mint(address(vault), 1);

    token.grantRole(token.CONTROLLER_ROLE(), address(this));
    token.mint(address(0xDEAD), 1000);

    // Call previewRedeem on Controller
    uint256 netAssetsOut = controller.previewRedeem(address(USDC), 1e18);

    // Exact bug value observed was ~635,065,541,601 USDC units (or 635,065,541,601,831,804 in 18 decimals)
    uint256 buggyValueThreshold = 100000000 * 1e6; // $100 Million
    assertTrue(
      netAssetsOut < buggyValueThreshold,
      'Redeem quote must NOT produce hundreds of billions'
    );

    // Call getRedeemQuote
    UnifyVaultController.RedeemQuote memory quote = controller.getRedeemQuote(
      address(USDC),
      1e18,
      user
    );
    assertTrue(
      quote.grossValueUSD < buggyValueThreshold * 1e12,
      'Gross USD value must NOT be hundreds of billions'
    );
  }

  /**
   * @notice B. Redeem 10 UVBTCETH
   */
  function test_Regression_Redeem10Shares() public {
    token.grantRole(token.CONTROLLER_ROLE(), address(this));
    token.mint(address(0xDEAD), 1000);

    IPortfolioManager.RedeemPreview memory preview = portfolioManager.previewRedeem(
      10 * 1e18,
      address(USDC)
    );

    assertEq(preview.userShareUSDValue, 10 * 1e18); // $10.00 USD
    assertEq(preview.payoutAmount, 10 * 1e6); // 10.00 USDC
  }

  /**
   * @notice C. Partial Redeem (0.5 UVBTCETH)
   */
  function test_Regression_PartialRedeem() public {
    token.grantRole(token.CONTROLLER_ROLE(), address(this));
    token.mint(address(0xDEAD), 1000);

    IPortfolioManager.RedeemPreview memory preview = portfolioManager.previewRedeem(
      0.5 * 1e18,
      address(USDC)
    );

    assertEq(preview.userShareUSDValue, 0.5 * 1e18); // $0.50 USD
    assertEq(preview.payoutAmount, 0.5 * 1e6); // 0.50 USDC
  }

  /**
   * @notice D. Full Redeem in populated vault
   */
  function test_Regression_FullRedeemPopulatedVault() public {
    // User deposits 1,000 USDC ($1,000 USD)
    // 60% cbBTC ($600 USD = 0.00924684 cbBTC)
    // 40% WETH ($400 USD = 0.20909566 WETH)
    uint256 btcAmount = (uint256(600 * 1e18) * 1e8) / (uint256(64887) * 1e18); // ~924684 satoshis
    uint256 ethAmount = (uint256(400 * 1e18) * 1e18) / (uint256(1913) * 1e18); // ~0.209 WETH

    cbBTC.mint(address(vault), btcAmount);
    WETH.mint(address(vault), ethAmount);

    token.grantRole(token.CONTROLLER_ROLE(), address(this));
    token.mint(address(0xDEAD), 1000);
    token.mint(user, 1000 * 1e18); // 1000 shares minted to user

    // User previews redeeming all 1000 shares
    IPortfolioManager.RedeemPreview memory preview = portfolioManager.previewRedeem(
      1000 * 1e18,
      address(USDC)
    );

    // Total portfolio value = ~$1000 USD
    // User share USD value = ~$1000 USD
    // USDC payout = ~$1000 USDC (1000 * 1e6)
    assertTrue(preview.userShareUSDValue > 999 * 1e18 && preview.userShareUSDValue < 1001 * 1e18);
    assertTrue(preview.payoutAmount > 999 * 1e6 && preview.payoutAmount < 1001 * 1e6);
  }

  /**
   * @notice E & F & G & H: Verify 6-decimal USDC payout, 18-decimal shares, 8-decimal Chainlink feeds, 60/40 strategy
   */
  function test_Regression_DecimalsAndStrategyIntegrity() public {
    // 1. Oracle normalized price check
    assertEq(oracleManager.getAssetPrice(address(cbBTC)), 64887 * 1e18); // 18 decimals
    assertEq(oracleManager.getAssetPrice(address(WETH)), 1913 * 1e18); // 18 decimals
    assertEq(oracleManager.getAssetPrice(address(USDC)), 1 * 1e18); // 18 decimals

    // 2. Strategy target weights
    (address[] memory targetAssets, uint256[] memory weights) = strategyManager.getTargetWeights();
    assertEq(targetAssets[0], address(cbBTC));
    assertEq(targetAssets[1], address(WETH));
    assertEq(weights[0], 6000); // 60%
    assertEq(weights[1], 4000); // 40%

    token.grantRole(token.CONTROLLER_ROLE(), address(this));
    token.mint(address(0xDEAD), 1000);

    // 3. Controller getRedeemQuote struct return validation
    UnifyVaultController.RedeemQuote memory quote = controller.getRedeemQuote(
      address(USDC),
      1e18,
      user
    );

    assertEq(quote.asset, address(USDC));
    assertEq(quote.receiver, user);
    assertEq(quote.shares, 1e18);
    assertEq(quote.grossCollateral, 1e6); // 1.00 USDC (6 decimals)
    assertEq(quote.grossValueUSD, 1e18); // $1.00 USD (18 decimals)
    assertEq(quote.protocolFee, 20000); // 2% fee of 1.00 USDC = 0.02 USDC (20000 units)
    assertEq(quote.netPayout, 980000); // 0.98 USDC (980000 units)
  }
}
