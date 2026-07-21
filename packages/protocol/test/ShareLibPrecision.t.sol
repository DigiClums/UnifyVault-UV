// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/libraries/ShareLib.sol';
import '../src/libraries/FeeLib.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/ProtocolDirectory.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

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
  constructor() ERC20('Wrapped Ether', 'WETH') {}

  function decimals() public pure override returns (uint8) {
    return 18;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract ShareLibPrecisionTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  UVBTCETHToken public token;
  UnifyVaultController public controller;
  ITestTreasury public treasury;

  MockUSDC public usdc;
  MockWBTC public wbtc;
  MockWETH public weth;

  address public user1 = address(0x111);
  address public user2 = address(0x222);

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    token = new UVBTCETHToken();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);

    usdc = new MockUSDC();
    wbtc = new MockWBTC();
    weth = new MockWETH();

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));

    vault.registerAsset(address(usdc), 6);
    vault.registerAsset(address(wbtc), 8);
    vault.registerAsset(address(weth), 18);

    treasury.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(wbtc), 8);
    treasury.registerAsset(address(weth), 18);

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Register Oracles ($1 for USDC, $60,000 for WBTC, $3,000 for WETH)
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    bytes32 wbtcId = bytes32(uint256(uint160(address(wbtc))));
    bytes32 wethId = bytes32(uint256(uint160(address(weth))));

    oracleProvider.registerAsset(usdcId, 1 * 10 ** 18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(wbtcId, 60000 * 10 ** 18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(wethId, 3000 * 10 ** 18, 18, block.timestamp, 1);

    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(wbtcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(wethId, address(oracleProvider), address(0), 3600, true);
  }

  // --- Requirement 1: First USDC Deposit (6 decimals) ---
  function testFirstUSDCDepositShares() public {
    uint256 depositAmt = 1_000_000; // 1 USDC (6 decimals)
    uint256 expectedFee = FeeLib.calculateDepositFee(depositAmt); // 2500 units (0.25%)
    uint256 expectedNet = depositAmt - expectedFee; // 997,500 units

    usdc.mint(user1, depositAmt);

    vm.startPrank(user1);
    usdc.approve(address(vault), expectedNet);
    usdc.approve(address(controller), expectedFee);

    // Preview verification
    uint256 previewShares = controller.previewDeposit(address(usdc), depositAmt);
    assertEq(previewShares, 997_500_000_000_000_000, 'Preview shares must be ~0.9975e18 wei');

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      user1
    );
    vm.stopPrank();

    assertEq(
      quote.sharesPreview,
      previewShares,
      'deposit() and previewDeposit() must be identical'
    );
    assertEq(
      token.balanceOf(user1),
      997_500_000_000_000_000,
      'User1 must receive ~0.9975e18 shares'
    );
    assertEq(token.totalSupply(), 997_500_000_000_000_000, 'Total supply must be ~0.9975e18 wei');
  }

  // --- Requirement 2: Second USDC Deposit ---
  function testSecondUSDCDepositShares() public {
    uint256 depositAmt = 1_000_000; // 1 USDC
    uint256 expectedNet = FeeLib.calculateNetDeposit(depositAmt);

    // Deposit 1 (User 1)
    usdc.mint(user1, depositAmt);
    vm.startPrank(user1);
    usdc.approve(address(vault), depositAmt);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user1);
    vm.stopPrank();

    // Deposit 2 (User 2)
    usdc.mint(user2, depositAmt);
    vm.startPrank(user2);
    usdc.approve(address(vault), depositAmt);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user2);
    vm.stopPrank();

    uint256 user1Shares = token.balanceOf(user1);
    uint256 user2Shares = token.balanceOf(user2);

    assertEq(user1Shares, 997_500_000_000_000_000, 'User 1 shares mismatch');
    assertEq(user2Shares, 997_500_000_000_000_000, 'User 2 shares mismatch');
    assertEq(user1Shares, user2Shares, 'Proportional share equality failed');
    assertEq(
      token.totalSupply(),
      1_995_000_000_000_000_000,
      'Total supply mismatch after 2nd deposit'
    );
  }

  // --- Requirement 3: 18-Decimal Collateral (WETH) ---
  function testEighteenDecimalCollateral() public {
    uint256 depositAmt = 1 * 10 ** 18; // 1 WETH (18 decimals)
    uint256 expectedNet = FeeLib.calculateNetDeposit(depositAmt); // 0.9975 WETH

    weth.mint(user1, depositAmt);
    vm.startPrank(user1);
    weth.approve(address(vault), depositAmt);
    weth.approve(address(controller), depositAmt);
    controller.deposit(address(weth), depositAmt, 0, user1);
    vm.stopPrank();

    assertEq(token.balanceOf(user1), expectedNet, '18-decimal share mint mismatch');
  }

  // --- Requirement 4: Redeem Round-Trip ---
  function testRedeemRoundTripUSDC() public {
    uint256 depositAmt = 10_000_000; // 10 USDC
    usdc.mint(user1, depositAmt);

    vm.startPrank(user1);
    usdc.approve(address(vault), depositAmt);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user1);

    uint256 userShares = token.balanceOf(user1);
    assertGt(userShares, 0);

    uint256 previewRedeem = controller.previewRedeem(address(usdc), userShares);
    uint256 redeemedNet = controller.redeem(
      address(usdc),
      userShares,
      0,
      user1,
      block.timestamp + 100
    );
    vm.stopPrank();

    assertEq(previewRedeem, redeemedNet, 'previewRedeem must match actual redeemed collateral');
    assertEq(token.balanceOf(user1), 0, 'Shares must be fully burned');
    assertEq(token.totalSupply(), 0, 'Total supply must return to zero');
  }

  // --- Requirement 5: Precision Invariants & Normalization Unit Tests ---
  function testPrecisionInvariants() public {
    // 6-decimal normalization (USDC)
    assertEq(ShareLib.normalizeTo18(1_000_000, 6), 1 * 10 ** 18);
    assertEq(ShareLib.denormalizeFrom18(1 * 10 ** 18, 6), 1_000_000);

    // 8-decimal normalization (WBTC)
    assertEq(ShareLib.normalizeTo18(100_000_000, 8), 1 * 10 ** 18);
    assertEq(ShareLib.denormalizeFrom18(1 * 10 ** 18, 8), 100_000_000);

    // 18-decimal normalization (WETH)
    assertEq(ShareLib.normalizeTo18(1 * 10 ** 18, 18), 1 * 10 ** 18);
    assertEq(ShareLib.denormalizeFrom18(1 * 10 ** 18, 18), 1 * 10 ** 18);

    // Pure ShareLib calculation checks across decimals
    assertEq(ShareLib.calculateShares(997_500, 0, 0, 6), 997_500_000_000_000_000);
    assertEq(ShareLib.calculateShares(99_750_000, 0, 0, 8), 997_500_000_000_000_000);
  }
}
