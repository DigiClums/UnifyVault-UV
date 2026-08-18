// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/interfaces/IPortfolioManager.sol';
import '../../src/token/UVBEV2.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20WithDecimals is ERC20 {
  uint8 private _customDecimals;

  constructor(string memory name, string memory symbol, uint8 dec) ERC20(name, symbol) {
    _customDecimals = dec;
  }

  function decimals() public view override returns (uint8) {
    return _customDecimals;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockCustodyVault {
  mapping(address => uint256) public assetBalances;

  function setBalance(address asset, uint256 balance) external {
    assetBalances[asset] = balance;
  }

  function totalAssets(address asset) external view returns (uint256) {
    return assetBalances[asset];
  }
}

contract MockOracle {
  mapping(address => uint256) public assetPricesUSD;

  function setAssetPrice(address asset, uint256 priceUSD) external {
    assetPricesUSD[asset] = priceUSD;
  }

  function getAssetPrice(address asset) external view returns (uint256) {
    return assetPricesUSD[asset];
  }
}

contract MockStrategyManager {
  address[] public supportedAssets;
  uint256[] public targetWeights;

  function setSupportedAssets(address[] memory assets, uint256[] memory weights) external {
    supportedAssets = assets;
    targetWeights = weights;
  }

  function getSupportedAssets() external view returns (address[] memory) {
    return supportedAssets;
  }

  function getTargetWeights() external view returns (address[] memory, uint256[] memory) {
    return (supportedAssets, targetWeights);
  }
}

/**
 * @title PortfolioManagerPriceGettersTest
 * @notice Formal verification test suite for CoinGecko Virtual Price getters:
 *         currentUVPrice() [0xadecbe53] and sharePrice() [0x87269729]
 */
contract PortfolioManagerPriceGettersTest is Test {
  PortfolioManager public pm;
  UVBEV2 public uvbe;
  MockCustodyVault public vault;
  MockOracle public oracle;
  MockStrategyManager public strategy;

  MockERC20WithDecimals public weth;
  MockERC20WithDecimals public cbBTC;
  MockERC20WithDecimals public usdc;

  address public admin = address(0xAA11);
  address public directory = address(0xDD22);

  function setUp() public {
    vm.startPrank(admin);

    // 1. Deploy index token (18 decimals)
    uvbe = new UVBEV2(admin);

    // 2. Deploy collateral asset mocks with realistic decimals
    weth = new MockERC20WithDecimals('Wrapped Ether', 'WETH', 18);
    cbBTC = new MockERC20WithDecimals('Coinbase BTC', 'cbBTC', 8);
    usdc = new MockERC20WithDecimals('USD Coin', 'USDC', 6);

    // 3. Deploy mock dependencies
    vault = new MockCustodyVault();
    oracle = new MockOracle();
    strategy = new MockStrategyManager();

    // 4. Configure strategy assets
    address[] memory assets = new address[](3);
    assets[0] = address(weth);
    assets[1] = address(cbBTC);
    assets[2] = address(usdc);

    uint256[] memory weights = new uint256[](3);
    weights[0] = 4500; // 45%
    weights[1] = 4500; // 45%
    weights[2] = 1000; // 10%

    strategy.setSupportedAssets(assets, weights);

    // 5. Deploy PortfolioManager
    pm = new PortfolioManager(
      admin,
      directory,
      address(strategy),
      address(oracle),
      address(vault),
      address(uvbe)
    );

    vm.stopPrank();
  }

  function test_MethodSelectors() public {
    // Verify CoinGecko 4-byte method selectors
    assertEq(bytes32(bytes4(keccak256('currentUVPrice()'))), bytes32(bytes4(0xadecbe53)));
    assertEq(bytes32(bytes4(keccak256('sharePrice()'))), bytes32(bytes4(0x87269729)));
    assertEq(bytes32(bytes4(keccak256('calculateNAV()'))), bytes32(bytes4(0x11ebc619)));
    assertEq(bytes32(bytes4(keccak256('calculateUVPrice()'))), bytes32(bytes4(0x7e3a36c3)));
  }

  function test_GenesisPriceWhenTotalSupplyIsZero() public {
    // When totalSupply is 0, price must default to INITIAL_NAV_PER_SHARE ($1.00 USD, 18 decimals)
    uint256 currentPrice = pm.currentUVPrice();
    uint256 sPrice = pm.sharePrice();

    assertEq(currentPrice, 1e18, 'Genesis currentUVPrice must be $1.00 (1e18)');
    assertEq(sPrice, 1e18, 'Genesis sharePrice must be $1.00 (1e18)');
  }

  function test_PriceCalculationWithSingleAsset() public {
    // Setup: 10 WETH held in CustodyVault, ETH price = $3,000 USD (18 decimals)
    // Total Backing = 10 * 3,000 = $30,000 USD
    oracle.setAssetPrice(address(weth), 3000 * 1e18);
    oracle.setAssetPrice(address(cbBTC), 60000 * 1e18);
    oracle.setAssetPrice(address(usdc), 1 * 1e18);

    vault.setBalance(address(weth), 10 * 1e18); // 10 WETH

    // Mint 30,000 UVBE tokens to stakers
    vm.prank(admin);
    uvbe.mint(address(0x123), 30000 * 1e18);

    // Expected price: $30,000 / 30,000 = $1.00 USD (1e18)
    assertEq(pm.currentUVPrice(), 1e18);
    assertEq(pm.sharePrice(), 1e18);

    // ETH price appreciates to $4,500 (+50%)
    oracle.setAssetPrice(address(weth), 4500 * 1e18);

    // Total Backing = 10 * 4,500 = $45,000 USD
    // Expected price: $45,000 / 30,000 = $1.50 USD (1.5e18)
    assertEq(pm.currentUVPrice(), 1.5e18);
    assertEq(pm.sharePrice(), 1.5e18);
  }

  function test_PriceCalculationWithMultiAssetPortfolio() public {
    // Setup multi-asset collateral portfolio:
    // 5 WETH @ $3,000 = $15,000 USD
    // 0.5 cbBTC (8 decimals: 50,000,000) @ $60,000 = $30,000 USD
    // 5,000 USDC (6 decimals: 5,000,000,000) @ $1.00 = $5,000 USD
    // Total Portfolio Value = $50,000 USD
    oracle.setAssetPrice(address(weth), 3000 * 1e18);
    oracle.setAssetPrice(address(cbBTC), 60000 * 1e18);
    oracle.setAssetPrice(address(usdc), 1 * 1e18);

    vault.setBalance(address(weth), 5 * 1e18);
    vault.setBalance(address(cbBTC), 50000000); // 0.5 cbBTC (8 dec)
    vault.setBalance(address(usdc), 5000 * 1e6); // 5,000 USDC (6 dec)

    // Mint 40,000 UVBE tokens
    vm.prank(admin);
    uvbe.mint(address(0x123), 40000 * 1e18);

    // Expected price: $50,000 / 40,000 = $1.25 USD (1.25 * 1e18)
    assertEq(pm.currentUVPrice(), 1.25e18);
    assertEq(pm.sharePrice(), 1.25e18);

    (uint256 totalValUSD, uint256 nav) = pm.calculateNAV();
    assertEq(totalValUSD, 50000 * 1e18);
    assertEq(nav, 1.25e18);
  }

  function test_ViewOnlyZeroStateMutation() public {
    oracle.setAssetPrice(address(weth), 3000 * 1e18);
    oracle.setAssetPrice(address(cbBTC), 60000 * 1e18);
    oracle.setAssetPrice(address(usdc), 1 * 1e18);

    vault.setBalance(address(weth), 10 * 1e18);

    vm.prank(admin);
    uvbe.mint(address(0x123), 20000 * 1e18);

    // Snapshot state before
    uint256 supplyBefore = uvbe.totalSupply();

    // Call view functions
    uint256 p1 = pm.currentUVPrice();
    uint256 p2 = pm.sharePrice();
    (uint256 bVal, uint256 p3) = pm.calculateUVPrice();

    assertEq(p1, 1.5e18);
    assertEq(p2, 1.5e18);
    assertEq(p3, 1.5e18);
    assertEq(bVal, 30000 * 1e18);

    // State remains identical
    assertEq(uvbe.totalSupply(), supplyBefore);
  }
}
