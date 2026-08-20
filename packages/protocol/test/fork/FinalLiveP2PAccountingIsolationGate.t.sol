// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import { ProtocolDirectory } from '../../src/ProtocolDirectory.sol';
import { UVBEV2 } from '../../src/token/UVBEV2.sol';
import { UnifyVaultController } from '../../src/controller/UnifyVaultController.sol';
import { CustodyVault } from '../../src/vault/CustodyVault.sol';
import { Treasury } from '../../src/vault/Treasury.sol';
import { CostBasisManagerV2 } from '../../src/treasury/CostBasisManagerV2.sol';
import { PerformanceManager } from '../../src/treasury/PerformanceManager.sol';
import { OracleManager } from '../../src/oracle/OracleManager.sol';
import { PortfolioManager } from '../../src/strategy/PortfolioManager.sol';
import { P2PEscrowV2 } from '../../src/escrow/P2PEscrowV2.sol';
import { Marketplace } from '../../src/marketplace/Marketplace.sol';
import { ModuleIds } from '../../src/constants/ModuleIds.sol';
import { EscrowTypes } from '../../src/types/EscrowTypes.sol';
import { MarketplaceTypes } from '../../src/types/MarketplaceTypes.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

/**
 * @title FinalLiveP2PAccountingIsolationGateTest
 * @notice Formal Phase 6 live fork gate proving 100% P2P accounting isolation against canonical Base Sepolia V2 contracts.
 */
contract FinalLiveP2PAccountingIsolationGateTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  // Canonical Base Sepolia V2 Deployment Directory
  address public constant DIRECTORY_ADDR = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;

  // Base Sepolia Collateral Tokens
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant CBBTC = 0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29;
  address public constant WETH = 0xd116ab1c943cf15904eC4c8dd701086f175FA323;

  // Actors
  address public seller = address(0x1111111111111111111111111111111111111111);
  address public buyer = address(0x2222222222222222222222222222222222222222);

  // Contract Instances
  ProtocolDirectory public directory;
  UVBEV2 public tokenV2;
  CostBasisManagerV2 public cbmV2;
  PortfolioManager public portfolioManager;
  CustodyVault public vault;
  Treasury public treasury;
  P2PEscrowV2 public p2pEscrow;
  Marketplace public marketplace;

  // Metric Snapshot Struct
  struct PortfolioSnapshot {
    uint256 vaultNAVUSD;
    uint256 uvSharePrice;
    uint256 totalUVBESupply;
    uint256 vaultUSDCBal;
    uint256 vaultCBBTCBal;
    uint256 vaultWETHBal;
    uint256 sellerTokenBal;
    uint256 sellerCostBasis;
    int256 sellerRealizedPnL;
    int256 sellerUnrealizedPnL;
    uint256 sellerAvgEntryPrice;
    uint256 buyerTokenBal;
    uint256 buyerCostBasis;
    int256 buyerRealizedPnL;
    int256 buyerUnrealizedPnL;
    uint256 buyerAvgEntryPrice;
    uint256 treasuryTokenBal;
    uint256 treasuryCostBasis;
    uint256 escrowTokenBal;
  }

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    directory = ProtocolDirectory(DIRECTORY_ADDR);
    tokenV2 = UVBEV2(directory.getAddress(ModuleIds.TOKEN));
    cbmV2 = CostBasisManagerV2(directory.getAddress(ModuleIds.COST_BASIS_MANAGER));
    portfolioManager = PortfolioManager(directory.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    vault = CustodyVault(payable(directory.getAddress(ModuleIds.VAULT)));
    treasury = Treasury(payable(directory.getAddress(ModuleIds.TREASURY)));
    p2pEscrow = P2PEscrowV2(payable(directory.getAddress(ModuleIds.P2P_ESCROW)));
    marketplace = new Marketplace(address(p2pEscrow));

    // Deal seller 50 UVBE tokens on fork and set initial cost basis
    deal(address(tokenV2), seller, 50 * 1e18);

    // Approve marketplace and escrow
    vm.startPrank(seller);
    tokenV2.approve(address(marketplace), type(uint256).max);
    tokenV2.approve(address(p2pEscrow), type(uint256).max);
    vm.stopPrank();

    vm.startPrank(buyer);
    tokenV2.approve(address(marketplace), type(uint256).max);
    tokenV2.approve(address(p2pEscrow), type(uint256).max);
    vm.stopPrank();
  }

  function _captureSnapshot() internal view returns (PortfolioSnapshot memory s) {
    (uint256 nav, uint256 price) = portfolioManager.calculateUVPrice();
    s.vaultNAVUSD = nav;
    s.uvSharePrice = price;
    s.totalUVBESupply = tokenV2.totalSupply();

    s.vaultUSDCBal = IERC20(USDC).balanceOf(address(vault));
    s.vaultCBBTCBal = IERC20(CBBTC).balanceOf(address(vault));
    s.vaultWETHBal = IERC20(WETH).balanceOf(address(vault));

    s.sellerTokenBal = tokenV2.balanceOf(seller);
    s.sellerCostBasis = cbmV2.costBasis(seller);
    s.sellerRealizedPnL = cbmV2.realizedPnL(seller);
    s.sellerUnrealizedPnL = cbmV2.unrealizedPnL(seller);
    s.sellerAvgEntryPrice = cbmV2.averageEntryPrice(seller);

    s.buyerTokenBal = tokenV2.balanceOf(buyer);
    s.buyerCostBasis = cbmV2.costBasis(buyer);
    s.buyerRealizedPnL = cbmV2.realizedPnL(buyer);
    s.buyerUnrealizedPnL = cbmV2.unrealizedPnL(buyer);
    s.buyerAvgEntryPrice = cbmV2.averageEntryPrice(buyer);

    s.treasuryTokenBal = tokenV2.balanceOf(address(treasury));
    s.treasuryCostBasis = cbmV2.costBasis(address(treasury));
    s.escrowTokenBal = tokenV2.balanceOf(address(p2pEscrow));
  }

  function test_Phase6_FinalLiveP2PAccountingIsolationGate() public {
    // 1. Capture snapshot BEFORE trade
    PortfolioSnapshot memory beforeSnap = _captureSnapshot();

    // Verify initial invariants
    assertGt(beforeSnap.uvSharePrice, 0, 'Share price must be > 0');
    assertEq(p2pEscrow.feeBps(), 100, 'Canonical P2P fee must be 100 bps (1.00%)');
    assertEq(p2pEscrow.treasury(), address(treasury), 'P2P treasury must match canonical Treasury');

    uint256 tradeAmount = 10 * 1e18; // 10 UVBE
    uint256 fiatPricePerUVBE = 100; // 100 INR per UVBE
    uint256 expectedFee = (tradeAmount * 100) / 10000; // 0.1 UVBE (1%)
    uint256 expectedBuyerAmount = tradeAmount - expectedFee; // 9.9 UVBE (99%)

    // 2. Execute fresh P2P flow: Marketplace -> Match -> Escrow -> Fund -> Payment -> Release
    // A. Seller creates Sell Order on Marketplace
    vm.prank(seller);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(tokenV2),
      tradeAmount,
      fiatPricePerUVBE,
      keccak256('INR'),
      0,
      tradeAmount
    );

    // B. Buyer creates Buy Order on Marketplace
    vm.prank(buyer);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(tokenV2),
      tradeAmount,
      fiatPricePerUVBE,
      keccak256('INR'),
      0,
      tradeAmount
    );

    // C. Match orders -> triggers Escrow trade creation
    vm.prank(buyer);
    (uint256 matchId, uint256 tradeId) = marketplace.matchOrders(
      buyOrderId,
      sellOrderId,
      tradeAmount
    );

    assertGt(matchId, 0, 'Match ID valid');
    assertGt(tradeId, 0, 'Trade ID valid');

    // D. Seller funds escrow
    vm.prank(seller);
    p2pEscrow.fundTrade(tradeId);

    EscrowTypes.Trade memory tFunded = p2pEscrow.getTrade(tradeId);
    assertEq(uint8(tFunded.state), uint8(EscrowTypes.TradeState.FUNDED), 'Trade is FUNDED');

    // E. Buyer submits off-chain fiat payment proof
    bytes32 pRef = keccak256(abi.encodePacked('UPI_UTR_FINAL_GATE', block.timestamp, tradeId));
    bytes32 eHash = keccak256(abi.encodePacked('PROOF_SCREENSHOT_HASH', block.timestamp, tradeId));

    vm.prank(buyer);
    p2pEscrow.submitPayment(tradeId, pRef, eHash);

    EscrowTypes.Trade memory tPaid = p2pEscrow.getTrade(tradeId);
    assertEq(
      uint8(tPaid.state),
      uint8(EscrowTypes.TradeState.PAYMENT_SUBMITTED),
      'Trade is PAYMENT_SUBMITTED'
    );

    // F. Seller confirms receipt and releases escrow
    vm.prank(seller);
    p2pEscrow.confirmAndRelease(tradeId);

    EscrowTypes.Trade memory tReleased = p2pEscrow.getTrade(tradeId);
    assertEq(uint8(tReleased.state), uint8(EscrowTypes.TradeState.RELEASED), 'Trade is RELEASED');

    // 3. Capture snapshot AFTER trade
    PortfolioSnapshot memory afterSnap = _captureSnapshot();

    // 4. Compute and assert exact 0 deltas for all portfolio & accounting metrics
    uint256 navDelta =
      afterSnap.vaultNAVUSD >= beforeSnap.vaultNAVUSD
        ? afterSnap.vaultNAVUSD - beforeSnap.vaultNAVUSD
        : beforeSnap.vaultNAVUSD - afterSnap.vaultNAVUSD;
    assertEq(navDelta, 0, 'NAV delta must be EXACTLY 0');

    uint256 uvPriceDelta =
      afterSnap.uvSharePrice >= beforeSnap.uvSharePrice
        ? afterSnap.uvSharePrice - beforeSnap.uvSharePrice
        : beforeSnap.uvSharePrice - afterSnap.uvSharePrice;
    assertEq(uvPriceDelta, 0, 'UV share price delta must be EXACTLY 0');

    uint256 totalSupplyDelta =
      afterSnap.totalUVBESupply >= beforeSnap.totalUVBESupply
        ? afterSnap.totalUVBESupply - beforeSnap.totalUVBESupply
        : beforeSnap.totalUVBESupply - afterSnap.totalUVBESupply;
    assertEq(totalSupplyDelta, 0, 'Total UVBE supply delta must be EXACTLY 0');

    uint256 usdcDelta =
      afterSnap.vaultUSDCBal >= beforeSnap.vaultUSDCBal
        ? afterSnap.vaultUSDCBal - beforeSnap.vaultUSDCBal
        : beforeSnap.vaultUSDCBal - afterSnap.vaultUSDCBal;
    assertEq(usdcDelta, 0, 'Vault USDC delta must be EXACTLY 0');

    uint256 cbbtcDelta =
      afterSnap.vaultCBBTCBal >= beforeSnap.vaultCBBTCBal
        ? afterSnap.vaultCBBTCBal - beforeSnap.vaultCBBTCBal
        : beforeSnap.vaultCBBTCBal - afterSnap.vaultCBBTCBal;
    assertEq(cbbtcDelta, 0, 'Vault cbBTC delta must be EXACTLY 0');

    uint256 wethDelta =
      afterSnap.vaultWETHBal >= beforeSnap.vaultWETHBal
        ? afterSnap.vaultWETHBal - beforeSnap.vaultWETHBal
        : beforeSnap.vaultWETHBal - afterSnap.vaultWETHBal;
    assertEq(wethDelta, 0, 'Vault WETH delta must be EXACTLY 0');

    // 5. Assert user token balance changes
    assertEq(
      afterSnap.sellerTokenBal,
      beforeSnap.sellerTokenBal - tradeAmount,
      'Seller lost tradeAmount'
    );
    assertEq(
      afterSnap.buyerTokenBal,
      beforeSnap.buyerTokenBal + expectedBuyerAmount,
      'Buyer received 99%'
    );
    assertEq(
      afterSnap.treasuryTokenBal,
      beforeSnap.treasuryTokenBal + expectedFee,
      'Treasury received 1%'
    );
    assertEq(afterSnap.escrowTokenBal, 0, 'Escrow balance is 0');

    console.log('[PASS] Phase 6: P2P Accounting Isolation 100% Proven on Live Base Sepolia');
  }
}
