// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/oracle/OracleManager.sol';
import '../../src/oracle/MockOracleProvider.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/treasury/PerformanceManager.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/strategy/StrategyManager.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/swap/SwapAdapter.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/libraries/FeeLib.sol';
import '../../src/constants/ModuleIds.sol';
import '../../src/types/EscrowTypes.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface ITestTreasuryForPhase2 {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockUSDCForPhase2 is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {}

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockUniswapV3RouterForPhase2Integration {
  function factory() external pure returns (address) {
    return address(0);
  }
}

contract RevertingCBMV2 is ICostBasisManagerV2 {
  bool public revertDeposit;
  bool public revertRedeem;

  function setRevertFlags(bool _dep, bool _red) external {
    revertDeposit = _dep;
    revertRedeem = _red;
  }

  function recordDeposit(address, uint256, uint256) external view override {
    if (revertDeposit) revert('Forced CBM Deposit Revert');
  }

  function recordRedeem(address, uint256, uint256, uint256) external view override {
    if (revertRedeem) revert('Forced CBM Redeem Revert');
  }

  function onTokenTransfer(address, address, uint256, uint256) external pure override {}
  function setEscrowStatus(address, bool) external override {}
  function migrateAccounting(address, uint256, int256, uint256) external override {}

  function costBasis(address) external pure override returns (uint256) {
    return 0;
  }

  function averageEntryPrice(address) external pure override returns (uint256) {
    return 0;
  }

  function realizedPnL(address) external pure override returns (int256) {
    return 0;
  }

  function unrealizedPnL(address) external pure override returns (int256) {
    return 0;
  }

  function firstDepositTimestamp(address) external pure override returns (uint256) {
    return 0;
  }

  function isEscrow(address) external pure override returns (bool) {
    return false;
  }

  function indexToken() external pure override returns (address) {
    return address(0);
  }
}

contract Phase2IntegrationTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  ITestTreasuryForPhase2 public treasury;
  UVBEV2 public token;
  CostBasisManagerV2 public cbm;
  PerformanceManager public perfManager;
  P2PEscrowV2 public escrow;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  UnifyVaultController public controller;

  MockUSDCForPhase2 public usdc;

  address public admin = address(0x1);
  address public seller = address(0x2);
  address public buyer = address(0x3);
  address public treasuryAddr;

  function setUp() public {
    vm.startPrank(admin);

    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasuryForPhase2(treasuryAddr);

    token = new UVBEV2(admin);
    cbm = new CostBasisManagerV2(admin, address(directory));
    perfManager = new PerformanceManager(admin, address(directory));
    escrow = new P2PEscrowV2(treasuryAddr, 100); // 1% fee

    usdc = new MockUSDCForPhase2();
    MockUniswapV3RouterForPhase2Integration mockRouter = new MockUniswapV3RouterForPhase2Integration();

    // Register USDC Oracle ($1.00 USD)
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // Strategy with 100% USDC
    address[] memory assets = new address[](1);
    assets[0] = address(usdc);
    uint256[] memory weights = new uint256[](1);
    weights[0] = 10000;

    strategyManager = new StrategyManager(admin, assets, weights);

    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );
    swapAdapter = new SwapAdapter(admin, address(mockRouter));

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // Register Directory Module IDs
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(cbm));
    directory.registerAddress(ModuleIds.PERFORMANCE_MANAGER, address(perfManager));
    directory.registerAddress(ModuleIds.P2P_ESCROW, address(escrow));

    cbm.setModules(address(portfolioManager), address(token));
    cbm.setEscrowStatus(address(escrow), true);
    token.setCostBasisManager(address(cbm));
    perfManager.syncModules();

    vault.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(usdc), 6);

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    cbm.grantRole(cbm.CONTROLLER_ROLE(), address(controller));

    vm.stopPrank();

    usdc.mint(seller, 10000 * 1e6);
    usdc.mint(buyer, 10000 * 1e6);
  }

  // --- 1. Controller Tests ---

  function test_ControllerDeposit_AtomicAccounting() public {
    uint256 depositAmt = 1000 * 1e6;

    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      seller
    );
    vm.stopPrank();

    uint256 expectedNetUSD = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18

    assertGt(quote.sharesPreview, 0);
    assertEq(token.balanceOf(seller), quote.sharesPreview);
    assertEq(cbm.costBasis(seller), expectedNetUSD);
  }

  function test_ControllerRedeem_AtomicAccounting() public {
    uint256 depositAmt = 1000 * 1e6;

    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);

    uint256 shares = token.balanceOf(seller);
    token.approve(address(controller), shares);
    controller.redeem(address(usdc), shares, 0, seller, block.timestamp + 100);
    vm.stopPrank();

    assertEq(token.balanceOf(seller), 0);
    assertEq(cbm.costBasis(seller), 0);
  }

  function test_ControllerDeposit_CBMRevertRollback() public {
    RevertingCBMV2 mockCBM = new RevertingCBMV2();
    mockCBM.setRevertFlags(true, false);

    vm.prank(admin);
    directory.updateAddress(ModuleIds.COST_BASIS_MANAGER, address(mockCBM));

    vm.startPrank(seller);
    usdc.approve(address(controller), 1000 * 1e6);

    vm.expectRevert('Forced CBM Deposit Revert');
    controller.deposit(address(usdc), 1000 * 1e6, 0, seller);
    vm.stopPrank();

    assertEq(token.balanceOf(seller), 0);
  }

  function test_ControllerRedeem_CBMRevertRollback() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);

    uint256 shares = token.balanceOf(seller);
    token.approve(address(controller), shares);
    vm.stopPrank();

    RevertingCBMV2 mockCBM = new RevertingCBMV2();
    mockCBM.setRevertFlags(false, true);

    vm.prank(admin);
    directory.updateAddress(ModuleIds.COST_BASIS_MANAGER, address(mockCBM));

    vm.startPrank(seller);
    vm.expectRevert('Forced CBM Redeem Revert');
    controller.redeem(address(usdc), shares, 0, seller, block.timestamp + 100);
    vm.stopPrank();

    assertEq(token.balanceOf(seller), shares);
  }

  // --- 2. P2P Escrow Tests ---

  function test_P2PEscrow_CreateAndAutoFund() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);

    uint256 sellerShares = token.balanceOf(seller);
    token.approve(address(escrow), sellerShares);

    uint256 expectedNetUSD = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18

    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: sellerShares,
        fiatAmount: 1000 * 1e18,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    assertEq(token.balanceOf(address(escrow)), sellerShares);
    assertEq(cbm.costBasis(seller), expectedNetUSD);
  }

  function test_P2PEscrow_ManualFund() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);
    uint256 sellerShares = token.balanceOf(seller);
    vm.stopPrank();

    uint256 expectedNetUSD = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18

    vm.prank(buyer);
    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: sellerShares,
        fiatAmount: 1000 * 1e18,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );

    vm.startPrank(seller);
    token.approve(address(escrow), sellerShares);
    escrow.fundTrade(tradeId);
    vm.stopPrank();

    assertEq(token.balanceOf(address(escrow)), sellerShares);
    assertEq(cbm.costBasis(seller), expectedNetUSD);
  }

  function test_P2PEscrow_ConfirmAndRelease() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);
    uint256 sellerShares = token.balanceOf(seller);
    token.approve(address(escrow), sellerShares);

    uint256 expectedNetUSD = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18
    uint256 fiatProceeds = 1200 * 1e18;

    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: sellerShares,
        fiatAmount: fiatProceeds,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    // P2P settlement does NOT generate investment realized PnL for seller or mutate buyer basis
    assertEq(cbm.realizedPnL(seller), 0);

    // Buyer receives net shares
    uint256 feeShares = (sellerShares * 100) / 10000; // 1% fee
    uint256 netBuyerShares = sellerShares - feeShares;
    assertEq(token.balanceOf(buyer), netBuyerShares);
    assertEq(cbm.costBasis(buyer), 0);
    assertEq(token.balanceOf(treasuryAddr), feeShares);
    assertEq(cbm.costBasis(treasuryAddr), 0);
  }

  function test_P2PEscrow_Refund() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);
    uint256 sellerShares = token.balanceOf(seller);
    token.approve(address(escrow), sellerShares);

    uint256 expectedNetUSD = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18

    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: sellerShares,
        fiatAmount: 1200 * 1e18,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    vm.warp(block.timestamp + 2 hours);

    vm.prank(seller);
    escrow.refund(tradeId);

    assertEq(token.balanceOf(seller), sellerShares);
    assertEq(cbm.costBasis(seller), expectedNetUSD);
    assertEq(cbm.realizedPnL(seller), 0);
    assertEq(cbm.costBasis(buyer), 0);
  }

  function test_P2PEscrow_DisputeRelease() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);
    uint256 sellerShares = token.balanceOf(seller);
    token.approve(address(escrow), sellerShares);

    uint256 expectedNetUSD = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18
    uint256 fiatProceeds = 1200 * 1e18;

    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: sellerShares,
        fiatAmount: fiatProceeds,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(seller);
    escrow.raiseDispute(tradeId, keccak256('REASON'));

    vm.prank(admin);
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER);

    assertEq(cbm.realizedPnL(seller), 0);
    assertEq(cbm.costBasis(buyer), 0);
  }

  function test_P2PEscrow_DisputeRefund() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);
    uint256 sellerShares = token.balanceOf(seller);
    token.approve(address(escrow), sellerShares);

    uint256 expectedNetUSD = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18

    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: sellerShares,
        fiatAmount: 1200 * 1e18,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(seller);
    escrow.raiseDispute(tradeId, keccak256('REASON'));

    vm.prank(admin);
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.REFUND_TO_SELLER);

    assertEq(token.balanceOf(seller), sellerShares);
    assertEq(cbm.costBasis(seller), expectedNetUSD);
  }

  function test_P2PEscrow_FeeRouting() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);
    uint256 sellerShares = token.balanceOf(seller);
    token.approve(address(escrow), sellerShares);

    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: sellerShares,
        fiatAmount: 1000 * 1e18,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    uint256 feeShares = (sellerShares * 100) / 10000;
    assertEq(token.balanceOf(treasuryAddr), feeShares);
    assertEq(cbm.costBasis(treasuryAddr), 0);
  }

  // --- 3. Full End-to-End System Integration Tests ---

  function test_Integration_DepositTransferP2PRelease() public {
    // 1. Deposit
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);
    vm.stopPrank();

    uint256 sellerShares = token.balanceOf(seller);
    uint256 initialBasis = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18

    // 2. Transfer 50% to another account (charlie)
    address charlie = address(0x99);
    vm.prank(seller);
    token.transfer(charlie, sellerShares / 2);

    uint256 halfBasis = initialBasis / 2; // 498.75 * 1e18
    assertEq(cbm.costBasis(seller), halfBasis);
    assertEq(cbm.costBasis(charlie), halfBasis);

    // 3. P2P Escrow Fund & Release for seller's remaining shares
    uint256 remainingShares = token.balanceOf(seller);
    vm.startPrank(seller);
    token.approve(address(escrow), remainingShares);
    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: remainingShares,
        fiatAmount: 600 * 1e18,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    assertEq(cbm.realizedPnL(seller), 0);
    assertEq(cbm.costBasis(seller), halfBasis);
    assertEq(cbm.costBasis(buyer), 0);
  }

  function test_Integration_NAVAndPerformance() public {
    uint256 depositAmt = 1000 * 1e6;
    vm.startPrank(seller);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, seller);
    vm.stopPrank();

    uint256 expectedBasis = FeeLib.calculateNetDeposit(depositAmt, 25) * 1e12; // 997.5 * 1e18

    (uint256 portfolioUSD, uint256 navPerShare) = portfolioManager.calculateNAV();
    assertGt(portfolioUSD, 0);
    assertEq(navPerShare, 1e18);

    uint256 currentVal = perfManager.currentValue(seller);
    assertEq(currentVal, token.balanceOf(seller));
    assertEq(perfManager.investedCapital(seller), expectedBasis);
    assertEq(perfManager.netProfit(seller), int256(currentVal) - int256(expectedBasis));
  }
}
