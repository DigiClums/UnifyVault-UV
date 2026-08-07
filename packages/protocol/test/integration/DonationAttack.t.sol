// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/oracle/OracleManager.sol';
import '../../src/oracle/MockOracleProvider.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/treasury/FeeManager.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/strategy/StrategyManager.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/constants/ModuleIds.sol';

interface ITreasuryMinimal {
  function grantRole(bytes32 role, address account) external;
  function registerAsset(address asset, uint8 decimals) external;
}

contract MockDonationToken is ERC20 {
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

contract DonationAttackTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  FeeManager public feeManager;
  UVBTCETHToken public token;
  UnifyVaultController public controller;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;

  MockDonationToken public usdc;
  MockDonationToken public cbbtc;

  address public treasuryAddr;
  address public alice = address(0xA11CE);
  address public bob = address(0xB0B);

  bytes32 public usdcId;
  bytes32 public cbbtcId;

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    treasuryAddr = deployCode('Treasury');
    feeManager = new FeeManager(treasuryAddr);
    token = new UVBTCETHToken();

    usdc = new MockDonationToken('USDC Token', 'USDC', 6);
    cbbtc = new MockDonationToken('Coinbase BTC', 'cbBTC', 8);

    usdcId = bytes32(uint256(uint160(address(usdc))));
    cbbtcId = bytes32(uint256(uint160(address(cbbtc))));

    // Register Oracles: USDC = $1.00, cbBTC = $65,000.00
    oracleProvider.registerAsset(usdcId, 1 * 10 ** 18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(cbbtcId, 65000 * 10 ** 18, 18, block.timestamp, 1);

    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(cbbtcId, address(oracleProvider), address(0), 3600, true);

    vault.registerAsset(address(usdc), 6);
    vault.registerAsset(address(cbbtc), 8);

    ITreasuryMinimal(treasuryAddr).registerAsset(address(usdc), 6);
    ITreasuryMinimal(treasuryAddr).registerAsset(address(cbbtc), 8);

    // Strategy: 50% USDC, 50% cbBTC
    address[] memory assets = new address[](2);
    assets[0] = address(usdc);
    assets[1] = address(cbbtc);
    uint256[] memory weights = new uint256[](2);
    weights[0] = 5000;
    weights[1] = 5000;

    strategyManager = new StrategyManager(address(this), assets, weights);

    portfolioManager = new PortfolioManager(
      address(this),
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
      treasuryAddr,
      address(token)
    );

    directory.registerAddress(ModuleIds.TREASURY, treasuryAddr);
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    ITreasuryMinimal(treasuryAddr).grantRole(keccak256('CONTROLLER_ROLE'), address(controller));
    token.revokeRole(token.CONTROLLER_ROLE(), address(this));

    portfolioManager.syncModules();
  }

  function testFirstDepositorInflationAttackMitigated() public {
    // 1. Alice deposits a initial amount
    uint256 aliceDeposit = 10 * 10 ** 6; // $10 USDC
    usdc.mint(alice, aliceDeposit);

    vm.startPrank(alice);
    usdc.approve(address(controller), aliceDeposit);
    controller.deposit(address(usdc), aliceDeposit, 0, alice);
    vm.stopPrank();

    // Verify DEAD_SHARES (1000 wei) was minted to dead address 0xdEaD
    uint256 deadBalance = token.balanceOf(address(0x000000000000000000000000000000000000dEaD));
    assertEq(deadBalance, 1000);

    // 2. Alice attempts donation attack by directly transferring 100 cbBTC ($6.5M) to CustodyVault
    uint256 donationAmount = 100 * 10 ** 8; // 100 cbBTC
    cbbtc.mint(alice, donationAmount);
    vm.prank(alice);
    cbbtc.transfer(address(vault), donationAmount);

    // Verify vault totalAssets includes actual donated balance
    uint256 cbbtcVaultAssets = vault.totalAssets(address(cbbtc));
    assertEq(cbbtcVaultAssets, donationAmount);

    // 3. Bob deposits $1,000 USDC
    uint256 bobDeposit = 1000 * 10 ** 6;
    usdc.mint(bob, bobDeposit);

    vm.startPrank(bob);
    usdc.approve(address(controller), bobDeposit);
    controller.deposit(address(usdc), bobDeposit, 0, bob);
    vm.stopPrank();

    // Bob receives non-zero shares despite large donation
    uint256 bobShares = token.balanceOf(bob);
    assertTrue(bobShares > 0, 'Bob must receive non-zero shares');
  }

  function testDirectTokenDonationReflectedInNAV() public {
    // Initial deposit
    uint256 depositAmt = 1000 * 10 ** 6;
    usdc.mint(alice, depositAmt);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, alice);
    vm.stopPrank();

    (uint256 navBefore, ) = portfolioManager.calculateNAV();

    // Donate 5,000 USDC directly to vault
    usdc.mint(address(vault), 5000 * 10 ** 6);

    (uint256 navAfter, ) = portfolioManager.calculateNAV();

    assertTrue(navAfter > navBefore, 'NAV must increase after direct token donation');
  }
}
