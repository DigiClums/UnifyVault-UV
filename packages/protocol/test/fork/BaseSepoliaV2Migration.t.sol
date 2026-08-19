// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/treasury/PerformanceManager.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/constants/ModuleIds.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/libraries/FeeLib.sol';
import '../../src/types/EscrowTypes.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

contract RevertingCBMV2ForkMock is ICostBasisManagerV2 {
  bool public revertDep;
  bool public revertRed;

  function setRevertFlags(bool _d, bool _r) external {
    revertDep = _d;
    revertRed = _r;
  }

  function recordDeposit(address, uint256, uint256) external view override {
    if (revertDep) revert('Forced Deposit Revert');
  }

  function recordRedeem(address, uint256, uint256, uint256) external view override {
    if (revertRed) revert('Forced Redeem Revert');
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

contract BaseSepoliaV2MigrationTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  // Live Base Sepolia V1 Constants
  address public constant DIRECTORY_ADDR = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;
  address public constant V1_TOKEN = 0xa34596D38Be381A4764141105A91C338Ca5503bB;
  address public constant V1_CBM = 0xdA57664ef26676369fB5f87286BF8e2FB2cAD6df;
  address public constant V1_PM = 0x68c969b758e682B67e99a1ed2CC5753Ff1B2635E;
  address public constant V1_PERF = 0x47e9B5848E9856f6Dfd0169A993115C93e5Cc29C;
  address public constant V1_ESCROW = 0x382A2099A4Ce230A12dCc528827C3649C64d898b;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant CBBTC = 0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29;
  address public constant WETH = 0xd116ab1c943cf15904eC4c8dd701086f175FA323;

  // Audited Holder Manifest
  address public constant SELLER = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant BUYER = 0xB145AC2a59575Fbe306a58aC924718f4DD4659Da;
  address public constant TREASURY = 0x8Aa2e812D244b0C30D45035C3C843f4CdD02aCe6;
  address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

  // Exact Expected Balances
  uint256 public constant EXP_SELLER_BAL = 79517544241331582508;
  uint256 public constant EXP_BUYER_BAL = 9990000000000000000;
  uint256 public constant EXP_TREASURY_BAL = 10000000000000000;
  uint256 public constant EXP_DEAD_BAL = 1000;
  uint256 public constant EXP_TOTAL_SUPPLY = 89517544241331583508;

  // Exact Post-Trade #7 Backfill Accounting State
  uint256 public constant SELLER_COST_BASIS = 88833211568308266678;
  int256 public constant SELLER_REALIZED_PNL = -1044190431691733322;
  uint256 public constant SELLER_FIRST_DEP = 1786427102;

  uint256 public constant BUYER_COST_BASIS = 11500000000000000000;
  int256 public constant BUYER_REALIZED_PNL = 0;
  uint256 public constant BUYER_FIRST_DEP = 1786432576;

  ProtocolDirectory public directory;
  PortfolioManager public pm;
  CustodyVault public vault;
  IERC20 public usdcToken;

  // Deployed V2 Contracts (Fork-only)
  UVBEV2 public v2Token;
  CostBasisManagerV2 public v2CBM;
  P2PEscrowV2 public v2Escrow;
  UnifyVaultController public v2Controller;
  PerformanceManager public v2Perf;

  uint256 public initialVaultUSDC;
  uint256 public initialPortfolioNAV;
  uint256 public initialNAVPerShare;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    directory = ProtocolDirectory(DIRECTORY_ADDR);
    pm = PortfolioManager(V1_PM);
    vault = CustodyVault(directory.getAddress(ModuleIds.VAULT));
    usdcToken = IERC20(USDC);

    // Provide ample liquid reserves to vault and router in fork for redemption testing
    deal(CBBTC, address(vault), 10 * 1e8);
    deal(WETH, address(vault), 100 * 1e18);
    deal(USDC, 0x63f3432b1ca616bb8fdF46058e6d855262C195f7, 10_000_000 * 1e6);

    // Snapshot pre-migration NAV & Vault collateral
    (initialPortfolioNAV, initialNAVPerShare) = pm.calculateNAV();
    initialVaultUSDC = vault.totalAssets(USDC);

    // Verify V1 balances on fork prior to deployment
    require(IERC20(V1_TOKEN).balanceOf(SELLER) == EXP_SELLER_BAL, 'V1 Seller balance mismatch');
    require(IERC20(V1_TOKEN).balanceOf(BUYER) == EXP_BUYER_BAL, 'V1 Buyer balance mismatch');
    require(
      IERC20(V1_TOKEN).balanceOf(TREASURY) == EXP_TREASURY_BAL,
      'V1 Treasury balance mismatch'
    );
    require(IERC20(V1_TOKEN).balanceOf(DEAD) == EXP_DEAD_BAL, 'V1 Dead balance mismatch');
    require(IERC20(V1_TOKEN).totalSupply() == EXP_TOTAL_SUPPLY, 'V1 TotalSupply mismatch');

    // ── DEPLOY V2 CONTRACTS (FORK ONLY) ──────────────────────────────
    vm.startPrank(SELLER); // Admin user holding GOVERNANCE_ROLE on Directory

    v2Token = new UVBEV2(SELLER);
    v2CBM = new CostBasisManagerV2(SELLER, DIRECTORY_ADDR);
    v2Escrow = new P2PEscrowV2(TREASURY, 100); // 1% fee
    v2Perf = new PerformanceManager(SELLER, DIRECTORY_ADDR);

    pm = new PortfolioManager(
      SELLER,
      DIRECTORY_ADDR,
      directory.getAddress(ModuleIds.STRATEGY_MANAGER),
      directory.getAddress(ModuleIds.ORACLE),
      address(vault),
      address(v2Token)
    );

    v2Controller = new UnifyVaultController(
      DIRECTORY_ADDR,
      directory.getAddress(ModuleIds.ORACLE),
      address(vault),
      TREASURY,
      address(v2Token)
    );

    // ── MINT EXACT BALANCES ──────────────────────────────────────────
    bytes32 ctrlRole = v2Token.CONTROLLER_ROLE();
    v2Token.grantRole(ctrlRole, SELLER);

    v2Token.mint(SELLER, EXP_SELLER_BAL);
    v2Token.mint(BUYER, EXP_BUYER_BAL);
    v2Token.mint(TREASURY, EXP_TREASURY_BAL);
    v2Token.mint(DEAD, EXP_DEAD_BAL);

    v2Token.revokeRole(ctrlRole, SELLER);
    v2Token.grantRole(ctrlRole, address(v2Controller));

    // ── MIGRATE ACCOUNTING WITH TRADE #7 BACKFILL ────────────────────
    v2CBM.migrateAccounting(SELLER, SELLER_COST_BASIS, SELLER_REALIZED_PNL, SELLER_FIRST_DEP);
    v2CBM.migrateAccounting(BUYER, BUYER_COST_BASIS, BUYER_REALIZED_PNL, BUYER_FIRST_DEP);

    // Grant roles & links on V2 CBM
    v2CBM.grantRole(v2CBM.CONTROLLER_ROLE(), address(v2Controller));
    v2CBM.setModules(address(pm), address(v2Token));
    v2CBM.setEscrowStatus(address(v2Escrow), true);
    v2Token.setCostBasisManager(address(v2CBM));

    // Grant Controller roles on live Vault and Treasury in fork
    IAccessControl(address(vault)).grantRole(vault.CONTROLLER_ROLE(), address(v2Controller));
    IAccessControl(TREASURY).grantRole(keccak256('CONTROLLER_ROLE'), address(v2Controller));

    // ── UPDATE PROTOCOL DIRECTORY IN FORK ───────────────────────────
    directory.updateAddress(ModuleIds.TOKEN, address(v2Token));
    directory.updateAddress(ModuleIds.PORTFOLIO_MANAGER, address(pm));
    directory.updateAddress(ModuleIds.COST_BASIS_MANAGER, address(v2CBM));
    directory.updateAddress(ModuleIds.P2P_ESCROW, address(v2Escrow));
    directory.updateAddress(ModuleIds.DEPOSIT_MANAGER, address(v2Controller));
    directory.updateAddress(ModuleIds.PERFORMANCE_MANAGER, address(v2Perf));

    // Sync V2 modules
    v2Perf.syncModules();

    vm.stopPrank();
  }

  // --- 1. Holder & Supply Parity ---

  function test_ForkMigration_HolderAndSupplyParity() public {
    assertEq(v2Token.balanceOf(SELLER), IERC20(V1_TOKEN).balanceOf(SELLER));
    assertEq(v2Token.balanceOf(BUYER), IERC20(V1_TOKEN).balanceOf(BUYER));
    assertEq(v2Token.balanceOf(TREASURY), IERC20(V1_TOKEN).balanceOf(TREASURY));
    assertEq(v2Token.balanceOf(DEAD), IERC20(V1_TOKEN).balanceOf(DEAD));
    assertEq(v2Token.totalSupply(), IERC20(V1_TOKEN).totalSupply());

    assertEq(v2Token.balanceOf(SELLER), EXP_SELLER_BAL);
    assertEq(v2Token.balanceOf(BUYER), EXP_BUYER_BAL);
    assertEq(v2Token.balanceOf(TREASURY), EXP_TREASURY_BAL);
    assertEq(v2Token.balanceOf(DEAD), EXP_DEAD_BAL);
    assertEq(v2Token.totalSupply(), EXP_TOTAL_SUPPLY);
  }

  // --- 2. Accounting Parity & Trade #7 Backfill ---

  function test_ForkMigration_AccountingParityAndTrade7Backfill() public {
    assertEq(v2CBM.costBasis(SELLER), SELLER_COST_BASIS);
    assertEq(v2CBM.realizedPnL(SELLER), SELLER_REALIZED_PNL);
    assertEq(v2CBM.firstDepositTimestamp(SELLER), SELLER_FIRST_DEP);

    assertEq(v2CBM.costBasis(BUYER), BUYER_COST_BASIS);
    assertEq(v2CBM.realizedPnL(BUYER), BUYER_REALIZED_PNL);
    assertEq(v2CBM.firstDepositTimestamp(BUYER), BUYER_FIRST_DEP);

    assertEq(v2CBM.costBasis(TREASURY), 0);
    assertEq(v2CBM.realizedPnL(TREASURY), 0);
    assertEq(v2CBM.costBasis(DEAD), 0);
    assertEq(v2CBM.realizedPnL(DEAD), 0);
  }

  // --- 3. Trade #7 Backfill Replay Protection ---

  function test_ForkMigration_Trade7BackfillReplayProtection() public {
    vm.startPrank(SELLER);
    vm.expectRevert();
    v2CBM.migrateAccounting(SELLER, 99999, 99999, 99999);
    vm.stopPrank();

    assertEq(v2CBM.costBasis(SELLER), SELLER_COST_BASIS);
    assertEq(v2CBM.realizedPnL(SELLER), SELLER_REALIZED_PNL);
  }

  // --- 4. V1 Token Rejection ---

  function test_ForkMigration_V1TokenRejection() public {
    assertEq(v2CBM.indexToken(), address(v2Token));
    assertEq(v2Controller.token(), address(v2Token));
    assertTrue(address(v2Token) != V1_TOKEN);

    uint256 sellerBasisBefore = v2CBM.costBasis(SELLER);
    vm.startPrank(SELLER);
    IERC20(V1_TOKEN).approve(address(v2Escrow), 1e18);
    uint256 tradeId = v2Escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: BUYER,
        seller: SELLER,
        asset: V1_TOKEN,
        amount: 1e18,
        fiatAmount: 100 * 1e18,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    assertEq(v2CBM.costBasis(SELLER), sellerBasisBefore);
  }

  // --- 5. Normal Transfer Proportional and Full Basis ---

  function test_ForkMigration_NormalTransferProportionalAndFullBasis() public {
    address charlie = address(0x7777);
    uint256 initialSellerShares = v2Token.balanceOf(SELLER);
    uint256 initialSellerBasis = v2CBM.costBasis(SELLER);

    uint256 transferAmount = initialSellerShares / 2;

    // 1. Partial Transfer 50%
    vm.prank(SELLER);
    v2Token.transfer(charlie, transferAmount);

    uint256 expectedHalfBasis = initialSellerBasis / 2;
    assertEq(v2CBM.costBasis(SELLER), initialSellerBasis - expectedHalfBasis);
    assertEq(v2CBM.costBasis(charlie), expectedHalfBasis);

    // 2. Transfer Remaining Balance
    uint256 remainingShares = v2Token.balanceOf(SELLER);
    vm.prank(SELLER);
    v2Token.transfer(charlie, remainingShares);

    assertEq(v2Token.balanceOf(SELLER), 0);
    assertEq(v2CBM.costBasis(SELLER), 0);
    assertEq(v2CBM.costBasis(charlie), initialSellerBasis);
  }

  // --- 6. V2 Deposit Atomic Accounting & Revert Rollback ---

  function test_ForkMigration_V2DepositAtomicAccounting() public {
    deal(USDC, SELLER, 2000 * 1e6);

    uint256 sellerSharesBefore = v2Token.balanceOf(SELLER);
    uint256 sellerBasisBefore = v2CBM.costBasis(SELLER);

    vm.startPrank(SELLER);
    usdcToken.approve(address(v2Controller), 1000 * 1e6);
    v2Controller.deposit(USDC, 1000 * 1e6, 0, SELLER);
    vm.stopPrank();

    assertGt(v2Token.balanceOf(SELLER), sellerSharesBefore);
    assertGt(v2CBM.costBasis(SELLER), sellerBasisBefore);

    // Revert Rollback test with mock CBM
    RevertingCBMV2ForkMock mockCBM = new RevertingCBMV2ForkMock();
    mockCBM.setRevertFlags(true, false);

    vm.prank(SELLER);
    directory.updateAddress(ModuleIds.COST_BASIS_MANAGER, address(mockCBM));

    uint256 sharesAfterSuccess = v2Token.balanceOf(SELLER);

    vm.startPrank(SELLER);
    usdcToken.approve(address(v2Controller), 1000 * 1e6);
    vm.expectRevert('Forced Deposit Revert');
    v2Controller.deposit(USDC, 1000 * 1e6, 0, SELLER);
    vm.stopPrank();

    assertEq(v2Token.balanceOf(SELLER), sharesAfterSuccess);
  }

  // --- 7. V2 Redeem Atomic Accounting & Revert Rollback ---

  function test_ForkMigration_V2RedeemAtomicAccounting() public {
    uint256 sellerShares = v2Token.balanceOf(SELLER);

    vm.startPrank(SELLER);
    v2Token.approve(address(v2Controller), sellerShares);
    v2Controller.redeem(USDC, sellerShares, 0, SELLER, block.timestamp + 100);
    vm.stopPrank();

    assertEq(v2Token.balanceOf(SELLER), 0);
    assertEq(v2CBM.costBasis(SELLER), 0);

    // Restore seller shares & vault reserves to test revert rollback
    vm.startPrank(SELLER);
    bytes32 cRole = v2Token.CONTROLLER_ROLE();
    v2Token.grantRole(cRole, SELLER);
    v2Token.mint(SELLER, sellerShares);
    v2Token.revokeRole(cRole, SELLER);
    vm.stopPrank();

    deal(CBBTC, address(vault), 10 * 1e8);
    deal(WETH, address(vault), 100 * 1e18);
    deal(USDC, 0x63f3432b1ca616bb8fdF46058e6d855262C195f7, 10_000_000 * 1e6);

    RevertingCBMV2ForkMock mockCBM = new RevertingCBMV2ForkMock();
    mockCBM.setRevertFlags(false, true);

    vm.prank(SELLER);
    directory.updateAddress(ModuleIds.COST_BASIS_MANAGER, address(mockCBM));

    vm.startPrank(SELLER);
    v2Token.approve(address(v2Controller), sellerShares);
    vm.expectRevert('Forced Redeem Revert');
    v2Controller.redeem(USDC, sellerShares, 0, SELLER, block.timestamp + 100);
    vm.stopPrank();

    assertEq(v2Token.balanceOf(SELLER), sellerShares);
  }

  // --- 8. V2 P2P Escrow Full Lifecycle & Replay Protection ---

  function test_ForkMigration_V2P2PEscrowFullLifecycleAndReplay() public {
    int256 sellerPnlBefore = v2CBM.realizedPnL(SELLER);

    uint256 tradeShares = 10 * 1e18;
    uint256 fiatAmountUSD = 200 * 1e18; // $200 USD

    vm.startPrank(SELLER);
    v2Token.approve(address(v2Escrow), tradeShares);
    uint256 tradeId = v2Escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: BUYER,
        seller: SELLER,
        asset: address(v2Token),
        amount: tradeShares,
        fiatAmount: fiatAmountUSD,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    // Verify escrow received shares and seller PnL is unchanged during fund
    assertEq(v2Token.balanceOf(address(v2Escrow)), tradeShares);
    assertEq(v2CBM.realizedPnL(SELLER), sellerPnlBefore);

    // Buyer submits payment
    vm.prank(BUYER);
    v2Escrow.submitPayment(tradeId, keccak256('REF_NEW'), keccak256('EVIDENCE_NEW'));

    // Seller confirms & releases
    vm.prank(SELLER);
    v2Escrow.confirmAndRelease(tradeId);

    // Verify Seller PnL remains unchanged (0 PnL generated by P2P)
    assertEq(v2CBM.realizedPnL(SELLER), sellerPnlBefore);

    // Verify Buyer receives net shares and cost basis is unchanged by P2P
    uint256 feeShares = (tradeShares * 100) / 10000; // 1%
    assertEq(v2Token.balanceOf(BUYER), EXP_BUYER_BAL + (tradeShares - feeShares));
    assertEq(v2CBM.costBasis(BUYER), BUYER_COST_BASIS);

    // Verify Treasury receives fee shares with 0 user basis
    assertEq(v2CBM.costBasis(TREASURY), 0);

    // Duplicate release attempt must REVERT
    vm.prank(SELLER);
    vm.expectRevert();
    v2Escrow.confirmAndRelease(tradeId);
  }

  // --- 9. V2 P2P Escrow Refund Restores Basis ---

  function test_ForkMigration_V2P2PEscrowRefundRestoresBasis() public {
    uint256 sellerSharesBefore = v2Token.balanceOf(SELLER);
    uint256 sellerBasisBefore = v2CBM.costBasis(SELLER);
    int256 sellerPnlBefore = v2CBM.realizedPnL(SELLER);

    uint256 tradeShares = 10 * 1e18;

    vm.startPrank(SELLER);
    v2Token.approve(address(v2Escrow), tradeShares);
    uint256 tradeId = v2Escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: BUYER,
        seller: SELLER,
        asset: address(v2Token),
        amount: tradeShares,
        fiatAmount: 200 * 1e18,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );
    vm.stopPrank();

    vm.warp(block.timestamp + 2 hours);

    vm.prank(SELLER);
    v2Escrow.refund(tradeId);

    assertEq(v2Token.balanceOf(SELLER), sellerSharesBefore);
    assertEq(v2CBM.costBasis(SELLER), sellerBasisBefore);
    assertEq(v2CBM.realizedPnL(SELLER), sellerPnlBefore);
  }

  // --- 10. NAV & PerformanceManager Invariants ---

  function test_ForkMigration_NAVAndPerformanceManagerInvariants() public {
    (uint256 postNAV, uint256 postNAVPerShare) = pm.calculateNAV();
    assertGt(postNAV, 0);
    assertGt(postNAVPerShare, 0);

    uint256 sellerVal = v2Perf.currentValue(SELLER);
    uint256 sellerCap = v2Perf.investedCapital(SELLER);

    assertEq(sellerVal, (EXP_SELLER_BAL * postNAVPerShare) / 1e18);
    assertEq(sellerCap, SELLER_COST_BASIS);

    PerformanceManager.Performance memory pSeller = v2Perf.performance(SELLER);
    assertEq(pSeller.investedCapitalUSD, SELLER_COST_BASIS);
    assertEq(pSeller.realizedPnL, SELLER_REALIZED_PNL);
  }

  // --- 11. Vault Collateral & TVL Invariants ---

  function test_ForkMigration_VaultCollateralAndTVLInvariants() public {
    assertEq(vault.totalAssets(USDC), initialVaultUSDC);
    assertGt(initialPortfolioNAV, 0);
    assertEq(v2Token.totalSupply(), EXP_TOTAL_SUPPLY);
  }

  // --- 12. Account Double Migration Rejection ---

  function test_ForkMigration_AccountDoubleMigrationRejection() public {
    vm.startPrank(SELLER);

    vm.expectRevert();
    v2CBM.migrateAccounting(SELLER, 111, 222, 333);

    vm.expectRevert();
    v2CBM.migrateAccounting(BUYER, 111, 222, 333);

    vm.stopPrank();
  }
}
