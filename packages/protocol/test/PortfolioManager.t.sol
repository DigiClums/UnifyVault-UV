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
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';
import '../src/interfaces/IPortfolioManager.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockTokenWithDecimals is ERC20 {
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

contract PortfolioManagerTest is Test {
  ProtocolDirectory public directory;
  StrategyManager public strategyManager;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  UVBTCETHToken public token;
  PortfolioManager public portfolioManager;

  address public admin = address(0x1);
  address public user = address(0x2);

  MockTokenWithDecimals public wbtc;
  MockTokenWithDecimals public weth;
  MockTokenWithDecimals public usdc;

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    token = new UVBTCETHToken();

    wbtc = new MockTokenWithDecimals('Wrapped BTC', 'WBTC', 8);
    weth = new MockTokenWithDecimals('Wrapped ETH', 'WETH', 18);
    usdc = new MockTokenWithDecimals('USD Coin', 'USDC', 6);

    // Register Oracle Prices:
    // WBTC: $60,000 USD (scaled 18 decimals = 60000 * 1e18)
    // WETH: $3,000 USD (scaled 18 decimals = 3000 * 1e18)
    // USDC: $1.00 USD (scaled 18 decimals = 1 * 1e18)
    bytes32 btcId = bytes32(uint256(uint160(address(wbtc))));
    bytes32 ethId = bytes32(uint256(uint160(address(weth))));
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));

    oracleProvider.registerAsset(btcId, 60000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(ethId, 3000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);

    oracleManager.configureAsset(btcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(ethId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // Setup Strategy: 60% BTC (6000 BPS), 40% ETH (4000 BPS)
    address[] memory assets = new address[](2);
    assets[0] = address(wbtc);
    assets[1] = address(weth);

    uint256[] memory weights = new uint256[](2);
    weights[0] = 6000;
    weights[1] = 4000;

    strategyManager = new StrategyManager(admin, assets, weights);

    // Register Assets in Vault
    vault.registerAsset(address(wbtc), 8);
    vault.registerAsset(address(weth), 18);
    vault.registerAsset(address(usdc), 6);

    // Grant CONTROLLER_ROLE to test contract to simulate deposit accounting in vault
    vault.grantRole(vault.CONTROLLER_ROLE(), address(this));

    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    // Register in ProtocolDirectory
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
  }

  // --- Initial Deployment Tests ---

  function test_InitialSetup() public {
    assertEq(portfolioManager.strategyManager(), address(strategyManager));
    assertEq(portfolioManager.oracleManager(), address(oracleManager));
    assertEq(portfolioManager.custodyVault(), address(vault));
    assertEq(portfolioManager.indexToken(), address(token));
    assertEq(portfolioManager.directory(), address(directory));
  }

  // --- calculateAllocation Tests ---

  function test_CalculateAllocation60_40() public {
    uint256 depositAmt = 1000 * 1e6; // 1000 USDC

    (address[] memory targetAssets, uint256[] memory amounts) = portfolioManager
      .calculateAllocation(address(usdc), depositAmt);

    assertEq(targetAssets.length, 2);
    assertEq(targetAssets[0], address(wbtc));
    assertEq(targetAssets[1], address(weth));

    // 60% of 1000 USDC = 600 USDC
    // 40% of 1000 USDC = 400 USDC
    assertEq(amounts[0], 600 * 1e6);
    assertEq(amounts[1], 400 * 1e6);
  }

  function test_CalculateAllocationZeroReverts() public {
    vm.expectRevert(IPortfolioManager.ZeroAddressDetected.selector);
    portfolioManager.calculateAllocation(address(0), 1000);

    vm.expectRevert(IPortfolioManager.ZeroAmountDetected.selector);
    portfolioManager.calculateAllocation(address(usdc), 0);
  }

  // --- calculatePortfolioValue & NAV Tests ---

  function test_CalculatePortfolioValueEmptyVault() public {
    uint256 portfolioVal = portfolioManager.calculatePortfolioValue();
    assertEq(portfolioVal, 0);
  }

  function test_CalculatePortfolioValuePopulated() public {
    // Deposit 1 WBTC (8 decimals) and 10 WETH (18 decimals) into CustodyVault
    // 1 WBTC = $60,000 USD
    // 10 WETH = $30,000 USD
    // Total Portfolio Value = $90,000 USD (90000 * 1e18)
    wbtc.mint(address(this), 1 * 1e8);
    weth.mint(address(this), 10 * 1e18);

    wbtc.approve(address(vault), 1 * 1e8);
    weth.approve(address(vault), 10 * 1e18);

    vault.deposit(address(wbtc), address(this), 1 * 1e8);
    vault.deposit(address(weth), address(this), 10 * 1e18);

    uint256 totalVal = portfolioManager.calculatePortfolioValue();
    assertEq(totalVal, 90000 * 1e18);
  }

  function test_CalculateNAVGenesisCase() public {
    // Zero total shares => NAV = $1.00 USD (1e18)
    (uint256 totalVal, uint256 navPerShare) = portfolioManager.calculateNAV();

    assertEq(totalVal, 0);
    assertEq(navPerShare, 1e18);
  }

  function test_CalculateNAVPopulated() public {
    // Deposit assets = $90,000 USD
    wbtc.mint(address(this), 1 * 1e8);
    weth.mint(address(this), 10 * 1e18);

    wbtc.approve(address(vault), 1 * 1e8);
    weth.approve(address(vault), 10 * 1e18);

    vault.deposit(address(wbtc), address(this), 1 * 1e8);
    vault.deposit(address(weth), address(this), 10 * 1e18);

    // Mint 90,000 shares to user
    token.grantRole(token.CONTROLLER_ROLE(), address(this));
    token.mint(user, 90000 * 1e18);

    (uint256 totalVal, uint256 navPerShare) = portfolioManager.calculateNAV();

    assertEq(totalVal, 90000 * 1e18);
    assertEq(navPerShare, 1e18); // $1.00 USD per share

    // Simulate portfolio value increasing by 30k USD (10 WETH)
    weth.mint(address(this), 10 * 1e18);
    weth.approve(address(vault), 10 * 1e18);
    vault.deposit(address(weth), address(this), 10 * 1e18);

    (totalVal, navPerShare) = portfolioManager.calculateNAV();
    assertEq(totalVal, 120000 * 1e18); // 90k + 30k = 120k USD
    assertEq(navPerShare, 1333333333333333333); // $1.333... USD per share
  }

  // --- previewDeposit & previewRedeem Tests ---

  function test_PreviewDepositGenesis() public {
    // Deposit 1000 USDC ($1000 USD)
    IPortfolioManager.DepositPreview memory preview = portfolioManager.previewDeposit(
      address(usdc),
      1000 * 1e6
    );

    assertEq(preview.depositValueUSD, 1000 * 1e18);
    assertEq(preview.sharesToMint, 1000 * 1e18); // 1:1 genesis mint
    assertEq(preview.targetAssets.length, 2);
    assertEq(preview.allocationAmounts[0], 600 * 1e6); // 600 USDC BTC
    assertEq(preview.allocationAmounts[1], 400 * 1e6); // 400 USDC ETH
  }

  function test_PreviewRedeem() public {
    // Setup $30,000 USD vault portfolio with 30,000 shares (10 WETH @ $3,000 USD)
    weth.mint(address(this), 10 * 1e18);
    weth.approve(address(vault), 10 * 1e18);
    vault.deposit(address(weth), address(this), 10 * 1e18);

    token.grantRole(token.CONTROLLER_ROLE(), address(this));
    token.mint(user, 30000 * 1e18);

    // Redeem 3,000 shares in USDC
    IPortfolioManager.RedeemPreview memory preview = portfolioManager.previewRedeem(
      3000 * 1e18,
      address(usdc)
    );

    // 3,000 shares out of 30,000 total = 10% of portfolio = $3,000 USD value
    // USDC price = $1.00 USD => 3,000 USDC (3000 * 1e6)
    assertEq(preview.userShareUSDValue, 3000 * 1e18);
    assertEq(preview.payoutAmount, 3000 * 1e6);
  }

  // --- Governance & Module Synchronization Tests ---

  function test_SyncModulesSuccess() public {
    vm.prank(admin);
    vm.expectEmit(true, false, false, false);
    emit IPortfolioManager.StrategySynchronized(address(strategyManager));

    portfolioManager.syncModules();
  }

  function test_UnauthorizedSyncModulesRevert() public {
    vm.prank(user);
    vm.expectRevert(
      abi.encodeWithSelector(
        bytes4(keccak256('AccessControlUnauthorizedAccount(address,bytes32)')),
        user,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    portfolioManager.syncModules();
  }
}
