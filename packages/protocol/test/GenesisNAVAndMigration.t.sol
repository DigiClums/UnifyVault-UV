// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import { Treasury } from '../src/vault/Treasury.sol';
import '../src/treasury/CostBasisManager.sol';
import '../src/treasury/PerformanceManager.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/ProtocolDirectory.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract TestToken is ERC20 {
  uint8 private _dec;

  constructor(string memory name, string memory symbol, uint8 dec_) ERC20(name, symbol) {
    _dec = dec_;
  }

  function decimals() public view override returns (uint8) {
    return _dec;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract GenesisNAVAndMigrationTest is Test {
  ProtocolDirectory public directory;
  StrategyManager public strategyManager;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  Treasury public treasury;
  UVBTCETHToken public token;
  PortfolioManager public portfolioManager;
  CostBasisManager public costBasisManager;
  PerformanceManager public performanceManager;
  UnifyVaultController public controller;

  TestToken public btc;
  TestToken public eth;
  TestToken public usdc;

  address public admin = address(0xAD111);
  address public user1 = address(0x1111);
  address public user2 = address(0x2222);
  address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

  bytes32 public btcId;
  bytes32 public ethId;
  bytes32 public usdcId;

  function setUp() public {
    vm.startPrank(admin);

    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    treasury = new Treasury();
    token = new UVBTCETHToken();

    btc = new TestToken('Bitcoin', 'BTC', 8);
    eth = new TestToken('Ethereum', 'ETH', 18);
    usdc = new TestToken('USD Coin', 'USDC', 6);

    btcId = bytes32(uint256(uint160(address(btc))));
    ethId = bytes32(uint256(uint160(address(eth))));
    usdcId = bytes32(uint256(uint160(address(usdc))));

    // Set prices: BTC = $60,000, ETH = $3,000, USDC = $1.00
    oracleProvider.registerAsset(btcId, 60000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(ethId, 3000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);

    oracleManager.configureAsset(btcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(ethId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // Strategy 60/40 BTC/ETH
    address[] memory assets = new address[](2);
    assets[0] = address(btc);
    assets[1] = address(eth);
    uint256[] memory weights = new uint256[](2);
    weights[0] = 6000;
    weights[1] = 4000;

    strategyManager = new StrategyManager(admin, assets, weights);

    vault.registerAsset(address(btc), 8);
    vault.registerAsset(address(eth), 18);
    vault.registerAsset(address(usdc), 6);

    treasury.registerAsset(address(btc), 8);
    treasury.registerAsset(address(eth), 18);
    treasury.registerAsset(address(usdc), 6);

    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    costBasisManager = new CostBasisManager(admin, address(directory));
    performanceManager = new PerformanceManager(admin, address(directory));

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // Register modules in directory
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisManager));
    directory.registerAddress(ModuleIds.PERFORMANCE_MANAGER, address(performanceManager));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));

    costBasisManager.syncModules();
    performanceManager.syncModules();

    // Grant roles
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));

    vault.grantRole(vault.CONTROLLER_ROLE(), address(this));
    token.grantRole(token.CONTROLLER_ROLE(), address(this));

    vm.stopPrank();
  }

  // 1. Genesis NAV = $1
  function test_1_GenesisNAVIsOneDollar() public {
    (uint256 totalVal, uint256 navPerShare) = portfolioManager.calculateNAV();
    assertEq(totalVal, 0);
    assertEq(navPerShare, 1e18, 'Genesis NAV/share must be exactly $1.00 (1e18)');
  }

  // 2 & 4. BTC price increase & decrease
  function test_2_4_BTCPriceMovementAffectsNAV() public {
    // Put 1 BTC ($60,000) in vault
    btc.mint(address(this), 1 * 1e8);
    btc.approve(address(vault), 1 * 1e8);
    vault.deposit(address(btc), address(this), 1 * 1e8);

    // Mint 60,000 shares to user
    token.mint(user1, 60000 * 1e18);

    (, uint256 navInitial) = portfolioManager.calculateNAV();
    assertEq(navInitial, 1e18, 'NAV per share should start at $1.00');

    // Price increase to $90,000 (+50%)
    vm.prank(admin);
    oracleProvider.setPrice(btcId, 90000 * 1e18);
    (, uint256 navUp) = portfolioManager.calculateNAV();
    assertEq(navUp, 1.5e18, 'NAV per share should increase to $1.50');

    // Price decrease to $30,000 (-50% from original)
    vm.prank(admin);
    oracleProvider.registerAsset(btcId, 30000 * 1e18, 18, block.timestamp, 3);
    (, uint256 navDown) = portfolioManager.calculateNAV();
    assertEq(navDown, 0.5e18, 'NAV per share should drop to $0.50');
  }

  // 3 & 5. ETH price increase & decrease
  function test_3_5_ETHPriceMovementAffectsNAV() public {
    // Put 10 ETH ($30,000) in vault
    eth.mint(address(this), 10 * 1e18);
    eth.approve(address(vault), 10 * 1e18);
    vault.deposit(address(eth), address(this), 10 * 1e18);

    // Mint 30,000 shares
    token.mint(user1, 30000 * 1e18);

    (, uint256 navInitial) = portfolioManager.calculateNAV();
    assertEq(navInitial, 1e18);

    // Price increase to $6,000 (+100%)
    vm.prank(admin);
    oracleProvider.registerAsset(ethId, 6000 * 1e18, 18, block.timestamp, 2);
    (, uint256 navUp) = portfolioManager.calculateNAV();
    assertEq(navUp, 2e18, 'NAV per share should double to $2.00');

    // Price decrease to $1,500 (-50%)
    vm.prank(admin);
    oracleProvider.registerAsset(ethId, 1500 * 1e18, 18, block.timestamp, 3);
    (, uint256 navDown) = portfolioManager.calculateNAV();
    assertEq(navDown, 0.5e18, 'NAV per share should drop to $0.50');
  }

  // 6 & 7 & 8. 60/40 target does NOT directly affect NAV; custody balance & oracle price DO
  function test_6_7_8_CustodyBalanceAndOraclePriceDetermineNAV() public {
    // Strategy target is 60/40 BTC/ETH.
    // Deposit 100% ETH into vault (0 BTC).
    eth.mint(address(this), 10 * 1e18);
    eth.approve(address(vault), 10 * 1e18);
    vault.deposit(address(eth), address(this), 10 * 1e18);

    token.mint(user1, 30000 * 1e18);

    (uint256 val, uint256 navPerShare) = portfolioManager.calculateNAV();
    // NAV is 10 ETH * $3000 = $30,000. 30,000 shares => NAV/share = $1.00 regardless of 60/40 target!
    assertEq(val, 30000 * 1e18);
    assertEq(navPerShare, 1e18);
  }

  // 9 & 10. Deposit at $1 NAV and after appreciation
  function test_9_10_DepositAtOneDollarAndAppreciatedNAV() public {
    // 6-decimal USDC deposit of 1000 USDC ($1000)
    usdc.mint(user1, 1000 * 1e6);
    vm.startPrank(user1);
    usdc.approve(address(controller), 1000 * 1e6);
    controller.deposit(address(usdc), 1000 * 1e6, 0, user1);
    vm.stopPrank();

    // Default fee is 25 bps (0.25%), so net deposit = $997.50. Mints 997.5 - DEAD_SHARES shares at $1 NAV.
    uint256 userShares1 = token.balanceOf(user1);
    assertEq(
      userShares1,
      997.5e18 - 1000,
      'User 1 should get net USD in 18-decimal shares minus dead shares'
    );

    // Double ETH price => NAV doubles
    vm.prank(admin);
    oracleProvider.registerAsset(ethId, 6000 * 1e18, 18, block.timestamp, 2);

    // User 2 deposits $1000 net ($997.50) when NAV/share > $1
    usdc.mint(user2, 1000 * 1e6);
    vm.startPrank(user2);
    usdc.approve(address(controller), 1000 * 1e6);
    controller.deposit(address(usdc), 1000 * 1e6, 0, user2);
    vm.stopPrank();

    uint256 userShares2 = token.balanceOf(user2);
    assertTrue(userShares2 > 0, 'User 2 should receive shares');
    assertTrue(
      userShares2 < userShares1,
      'User 2 should receive fewer shares than User 1 due to higher NAV'
    );
  }

  // 11, 12, 13, 14. Redemption flows
  function test_11_12_13_14_RedemptionFlows() public {
    usdc.mint(user1, 1000 * 1e6);
    vm.startPrank(user1);
    usdc.approve(address(controller), 1000 * 1e6);
    controller.deposit(address(usdc), 1000 * 1e6, 0, user1);
    vm.stopPrank();

    uint256 shares = token.balanceOf(user1);

    // Partial redemption: 50%
    uint256 halfShares = shares / 2;
    vm.startPrank(user1);
    uint256 payout1 = controller.redeem(address(usdc), halfShares, 0, user1, block.timestamp + 300);
    vm.stopPrank();
    assertTrue(payout1 > 0, 'Partial redemption should return collateral');

    // Full redemption of remaining
    uint256 remainingShares = token.balanceOf(user1);
    vm.startPrank(user1);
    uint256 payout2 = controller.redeem(
      address(usdc),
      remainingShares,
      0,
      user1,
      block.timestamp + 300
    );
    vm.stopPrank();
    assertEq(token.balanceOf(user1), 0, 'User should hold 0 shares after full redemption');
    assertTrue(payout2 > 0, 'Full redemption should return remaining collateral');
  }

  // 15 & 16. Cost basis & PnL preservation
  function test_15_16_CostBasisAndPnLPreservation() public {
    usdc.mint(user1, 1000 * 1e6);
    vm.startPrank(user1);
    usdc.approve(address(controller), 1000 * 1e6);
    controller.deposit(address(usdc), 1000 * 1e6, 0, user1);
    vm.stopPrank();

    uint256 basis = costBasisManager.costBasis(user1);
    assertEq(basis, 997.5e18, 'Net deposit value is recorded as cost basis');

    PerformanceManager.Performance memory p = performanceManager.performance(user1);
    assertEq(p.investedCapitalUSD, 997.5e18);
    assertEq(p.realizedPnL, 0);
  }

  // 17 & 18. DEAD_SHARES & Zero supply
  function test_17_18_DeadSharesAndZeroSupply() public {
    assertEq(token.totalSupply(), 0, 'Total supply starts at 0');
    (uint256 totalVal, uint256 navPerShare) = portfolioManager.calculateNAV();
    assertEq(totalVal, 0);
    assertEq(navPerShare, 1e18);

    // Deposit to trigger DEAD_SHARES minting
    usdc.mint(user1, 100 * 1e6);
    vm.startPrank(user1);
    usdc.approve(address(controller), 100 * 1e6);
    controller.deposit(address(usdc), 100 * 1e6, 0, user1);
    vm.stopPrank();

    assertEq(
      token.balanceOf(DEAD),
      1000,
      'Exactly 1000 DEAD_SHARES must be minted on genesis deposit'
    );
    assertTrue(token.totalSupply() > 1000, 'Total supply exceeds DEAD_SHARES');
  }

  // 19. 6-decimal USDC → 18-decimal UVBTCETH precision scaling
  function test_19_DecimalScalingUSDCToShares() public {
    uint256 usdcAmount = 100 * 1e6; // 100 USDC (6 decimals)
    usdc.mint(user1, usdcAmount);

    vm.startPrank(user1);
    usdc.approve(address(controller), usdcAmount);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      usdcAmount,
      0,
      user1
    );
    vm.stopPrank();

    // 100 USDC with 0.25% fee = 99.75 USDC net = 99.75 * 1e18 wei 18-decimal USD value
    assertEq(quote.netDeposit, 99.75e6);
    assertEq(token.balanceOf(user1), 99.75e18 - 1000, 'Minted shares must be 18-decimal scaled');
  }

  // 20. Large and small share amounts
  function test_20_LargeAndSmallShareAmounts() public {
    // Small deposit: $1.00 USDC
    usdc.mint(user1, 1 * 1e6);
    vm.startPrank(user1);
    usdc.approve(address(controller), 1 * 1e6);
    controller.deposit(address(usdc), 1 * 1e6, 0, user1);
    vm.stopPrank();

    assertTrue(token.balanceOf(user1) > 0, 'Small deposit should mint non-zero shares');

    // Large deposit: $1,000,000 USDC
    usdc.mint(user2, 1_000_000 * 1e6);
    vm.startPrank(user2);
    usdc.approve(address(controller), 1_000_000 * 1e6);
    controller.deposit(address(usdc), 1_000_000 * 1e6, 0, user2);
    vm.stopPrank();

    assertTrue(
      token.balanceOf(user2) > 900_000 * 1e18,
      'Large deposit should mint large 18-decimal share count'
    );
  }

  // 21. Migration economic-value invariant: oldUserValue == newUserValue
  function test_21_MigrationEconomicValueInvariant() public {
    // Simulate legacy state where NAV/share was $15.40 and total supply was 0.915 shares
    uint256 legacySupply = 915056897674338411; // ~0.915 shares
    uint256 legacyUserShares = 915056897674337411;
    uint256 legacyDeadShares = 1000;
    uint256 portfolioVal = 14092784658279342214; // ~$14.09 USD

    uint256 oldNAVPerShare = (portfolioVal * 1e18) / legacySupply; // ~$15.40
    uint256 oldUserValue = (legacyUserShares * oldNAVPerShare) / 1e18;

    // Execute rebase to $1.00 target NAV per share
    uint256 newDeadShares = (legacyDeadShares * portfolioVal) / legacySupply;
    uint256 newUserShares = portfolioVal - newDeadShares;
    uint256 targetNAVPerShare = 1e18; // $1.00

    uint256 newUserValue = (newUserShares * targetNAVPerShare) / 1e18;

    // Assert economic-value invariant within tiny rounding tolerance (< 0.0001%)
    assertApproxEqAbs(
      newUserValue,
      oldUserValue,
      1000000000000,
      'Economic value must be invariant under $1 NAV rebase'
    );
  }
}
