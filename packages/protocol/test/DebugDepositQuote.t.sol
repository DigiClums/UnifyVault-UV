// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import 'forge-std/console2.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';

contract MockUSDC is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {}
  function decimals() public pure override returns (uint8) {
    return 6;
  }
  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockWBTC is ERC20 {
  constructor() ERC20('Wrapped BTC', 'WBTC') {}
  function decimals() public pure override returns (uint8) {
    return 8;
  }
  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockWETH is ERC20 {
  constructor() ERC20('Wrapped ETH', 'WETH') {}
  function decimals() public pure override returns (uint8) {
    return 18;
  }
  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract DebugDepositQuoteTest is Test {
  UnifyVaultController public controller;
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  UVBTCETHToken public token;
  PortfolioManager public portfolioManager;
  StrategyManager public strategyManager;

  MockUSDC public usdc;
  MockWBTC public wbtc;
  MockWETH public weth;

  address public user = address(0x222);

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    token = new UVBTCETHToken();

    usdc = new MockUSDC();
    wbtc = new MockWBTC();
    weth = new MockWETH();

    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    token.grantRole(token.CONTROLLER_ROLE(), address(this));

    // Register oracle feeds
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    bytes32 wbtcId = bytes32(uint256(uint160(address(wbtc))));
    bytes32 wethId = bytes32(uint256(uint160(address(weth))));

    oracleProvider.registerAsset(usdcId, 1 * 10 ** 18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(wbtcId, 60000 * 10 ** 18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(wethId, 3000 * 10 ** 18, 18, block.timestamp, 1);

    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(wbtcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(wethId, address(oracleProvider), address(0), 3600, true);

    vault.registerAsset(address(usdc), 6);
    vault.registerAsset(address(wbtc), 8);
    vault.registerAsset(address(weth), 18);

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(this), // mock treasury
      address(token)
    );

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    address[] memory initialAssets = new address[](0);
    uint256[] memory initialWeights = new uint256[](0);
    strategyManager = new StrategyManager(address(this), initialAssets, initialWeights);
    portfolioManager = new PortfolioManager(
      address(this),
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));

    portfolioManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    strategyManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));

    address[] memory assets = new address[](2);
    assets[0] = address(wbtc);
    assets[1] = address(weth);
    uint256[] memory weights = new uint256[](2);
    weights[0] = 5000;
    weights[1] = 5000;

    strategyManager.setStrategy(assets, weights);

    portfolioManager.syncModules();
  }

  function testDebugDepositQuoteExecution() public {
    uint256 depositAmount = 31_620_000; // 31.62 USDC (6 decimals)
    uint256 netDeposit = 31_540_950; // 31.54095 USDC (6 decimals)

    uint256 depositPrice = oracleManager.getAssetPrice(address(usdc));
    uint8 depositDecimals = usdc.decimals();
    uint256 depositValueUSD = (netDeposit * depositPrice) / (10 ** depositDecimals);

    (uint256 portfolioValueUSD, uint256 navPerShare) = portfolioManager.calculateNAV();
    uint256 totalSupply = token.totalSupply();

    IPortfolioManager.DepositPreview memory preview = portfolioManager.previewDeposit(
      address(usdc),
      netDeposit
    );
    uint256 sharesToMint = preview.sharesToMint;

    UnifyVaultController.DepositQuote memory quote = controller.getDepositQuote(
      address(usdc),
      depositAmount,
      0,
      user
    );

    console2.log('--------------------------------------------------');
    console2.log('DEPOSIT QUOTE EXECUTION TELEMETRY:');
    console2.log('depositAmountRaw:', depositAmount);
    console2.log('netDepositRaw:', netDeposit);
    console2.log('depositPrice:', depositPrice);
    console2.log('depositValueUSD:', depositValueUSD);
    console2.log('portfolioValueUSD:', portfolioValueUSD);
    console2.log('totalSupply:', totalSupply);
    console2.log('navPerShare:', navPerShare);
    console2.log('sharesToMint:', sharesToMint);
    console2.log('quote.sharesPreview:', quote.sharesPreview);
    console2.log('--------------------------------------------------');

    assertGt(quote.sharesPreview, 30 * 1e18);
  }
}
