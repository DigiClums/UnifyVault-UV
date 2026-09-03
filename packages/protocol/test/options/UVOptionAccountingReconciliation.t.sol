// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/options/UVNiftyIndexManager.sol';
import '../../src/options/UVOptionMarketFactory.sol';
import '../../src/options/UVOptionPricingEngine.sol';
import '../../src/options/UVOptionMarginEngine.sol';
import '../../src/options/UVLiquidityVault.sol';
import '../../src/options/UVOptionPositionManager.sol';
import '../../src/options/UVOptionSettlementVault.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20Token is ERC20 {
  constructor() ERC20('UnifyVault Token', 'UVBE') {}
  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockOracleManagerLocal is IOracleManager {
  uint256 public btcPrice = 60000e18;
  uint256 public ethPrice = 3000e18;
  uint256 public uvbePrice = 1e18;

  function setPrices(uint256 btc, uint256 eth, uint256 uvbe) external {
    btcPrice = btc;
    ethPrice = eth;
    uvbePrice = uvbe;
  }

  function recordObservation(bytes32) external pure override returns (uint192) {
    return 1e18;
  }

  function getPrice(bytes32 assetId) external view override returns (PriceRound memory round) {
    uint256 p = uvbePrice;
    if (assetId == keccak256('BTC')) p = btcPrice;
    if (assetId == keccak256('ETH')) p = ethPrice;
    return
      PriceRound({
        price: p,
        decimals: 18,
        updatedAt: block.timestamp,
        roundId: 1,
        providerId: 'MOCK'
      });
  }

  function getNormalizedPrice(bytes32 assetId) external view override returns (uint256) {
    if (assetId == keccak256('BTC')) return btcPrice;
    if (assetId == keccak256('ETH')) return ethPrice;
    return uvbePrice;
  }

  function isHealthy(bytes32) external pure override returns (bool) {
    return true;
  }

  function isPriceFresh(bytes32) external pure override returns (bool) {
    return true;
  }

  function getHistoricalTWAP(
    bytes32 assetId,
    uint256,
    uint256
  ) external view override returns (uint256, bool) {
    if (assetId == keccak256('BTC')) return (btcPrice, true);
    if (assetId == keccak256('ETH')) return (ethPrice, true);
    return (uvbePrice, true);
  }
}

contract UVOptionAccountingReconciliationTest is Test {
  UVNiftyIndexManager public indexManager;
  UVOptionMarketFactory public marketFactory;
  UVOptionPricingEngine public pricingEngine;
  UVOptionMarginEngine public marginEngine;
  UVLiquidityVault public liquidityVault;
  UVOptionPositionManager public positionManager;
  UVOptionSettlementVault public settlementVault;

  MockERC20Token public uvbe;
  MockOracleManagerLocal public oracleManager;

  address public admin = address(this);
  address public writer1 = address(0x111);
  address public writer2 = address(0x222);
  address public buyer1 = address(0x333);
  address public buyer2 = address(0x444);

  bytes32 public btcAssetId = keccak256('BTC');
  bytes32 public ethAssetId = keccak256('ETH');
  bytes32 public uvbeAssetId = keccak256('UVBE');
  bytes32 public indexId = keccak256('UV-NIFTY');

  bytes32 public seriesCall60k;
  bytes32 public seriesPut55k;

  function setUp() public {
    uvbe = new MockERC20Token();
    oracleManager = new MockOracleManagerLocal();

    indexManager = new UVNiftyIndexManager(admin, address(oracleManager));
    indexManager.registerComponent(btcAssetId, address(oracleManager), 6000, 60000e18, 18);
    indexManager.registerComponent(ethAssetId, address(oracleManager), 4000, 3000e18, 18);

    marketFactory = new UVOptionMarketFactory(admin);

    pricingEngine = new UVOptionPricingEngine(
      admin,
      address(marketFactory),
      address(indexManager),
      address(oracleManager),
      uvbeAssetId
    );

    marginEngine = new UVOptionMarginEngine(
      admin,
      address(marketFactory),
      address(oracleManager),
      uvbeAssetId
    );

    liquidityVault = new UVLiquidityVault(admin, address(uvbe));

    positionManager = new UVOptionPositionManager(
      admin,
      address(marketFactory),
      address(pricingEngine),
      address(marginEngine),
      address(liquidityVault)
    );

    settlementVault = new UVOptionSettlementVault(
      admin,
      address(marketFactory),
      address(positionManager),
      address(indexManager),
      address(oracleManager),
      address(liquidityVault),
      uvbeAssetId
    );

    liquidityVault.grantRole(liquidityVault.POSITION_MANAGER_ROLE(), address(positionManager));
    liquidityVault.grantRole(liquidityVault.SETTLEMENT_VAULT_ROLE(), address(settlementVault));
    positionManager.grantRole(positionManager.SETTLEMENT_VAULT_ROLE(), address(settlementVault));

    uvbe.mint(writer1, 1_000_000e18);
    uvbe.mint(writer2, 1_000_000e18);
    uvbe.mint(buyer1, 1_000_000e18);
    uvbe.mint(buyer2, 1_000_000e18);

    vm.prank(writer1);
    uvbe.approve(address(liquidityVault), type(uint256).max);
    vm.prank(writer2);
    uvbe.approve(address(liquidityVault), type(uint256).max);
    vm.prank(buyer1);
    uvbe.approve(address(liquidityVault), type(uint256).max);
    vm.prank(buyer2);
    uvbe.approve(address(liquidityVault), type(uint256).max);

    uint256 expiry = block.timestamp + 1 days;
    seriesCall60k = marketFactory.createSeries(indexId, 1000e18, expiry, 1e18, 0, 5000); // 50% cap
    seriesPut55k = marketFactory.createSeries(indexId, 950e18, expiry, 1e18, 1, 0);
  }

  // --- Strict Exact Invariant Assertion (VaultAssets == Sum of All 3 Buckets) ---
  function assertExactMasterSolvencyInvariant() internal {
    uint256 vaultBal = uvbe.balanceOf(address(liquidityVault));
    uint256 totalLocked = liquidityVault.totalLockedCollateral();
    uint256 totalPending = liquidityVault.totalPendingSettlementLiabilities();
    uint256 totalEquity =
      liquidityVault.totalSeriesEquity(seriesCall60k) +
        liquidityVault.totalSeriesEquity(seriesPut55k);

    assertEq(vaultBal, totalLocked + totalPending + totalEquity, 'EXACT_SOLVENCY_INVARIANT_BROKEN');
  }

  // --- Case A: 1 Buyer + 1 Writer (OTM Expiry) ---
  function test_CaseA_OneBuyerOneWriter_OTM() public {
    vm.prank(writer1);
    bytes32 posWriter = positionManager.openPosition(seriesCall60k, false, 1);

    vm.prank(buyer1);
    bytes32 posBuyer = positionManager.openPosition(seriesCall60k, true, 1);

    assertExactMasterSolvencyInvariant();

    vm.warp(block.timestamp + 1 days + 901 seconds);
    oracleManager.setPrices(55000e18, 2500e18, 1e18); // OTM

    settlementVault.snapshotSeriesSettlement(seriesCall60k);
    assertExactMasterSolvencyInvariant();

    vm.prank(buyer1);
    (uint256 buyerPayout, ) = settlementVault.claimSettlement(posBuyer);
    assertEq(buyerPayout, 0, 'Buyer should receive 0 OTM');
    assertExactMasterSolvencyInvariant();

    vm.prank(writer1);
    (, uint256 writerRefund) = settlementVault.claimSettlement(posWriter);
    assertGt(writerRefund, 0, 'Writer should receive full collateral refund');

    assertExactMasterSolvencyInvariant();
  }

  // --- Case B: 1 Buyer + 1 Writer (ITM Expiry) ---
  function test_CaseB_OneBuyerOneWriter_ITM() public {
    vm.prank(writer1);
    bytes32 posWriter = positionManager.openPosition(seriesCall60k, false, 1);

    vm.prank(buyer1);
    bytes32 posBuyer = positionManager.openPosition(seriesCall60k, true, 1);

    assertExactMasterSolvencyInvariant();

    vm.warp(block.timestamp + 1 days + 901 seconds);
    oracleManager.setPrices(70000e18, 3500e18, 1e18); // ITM

    settlementVault.snapshotSeriesSettlement(seriesCall60k);
    assertExactMasterSolvencyInvariant();

    vm.prank(buyer1);
    (uint256 buyerPayout, ) = settlementVault.claimSettlement(posBuyer);
    assertGt(buyerPayout, 0, 'Buyer should receive ITM payoff');
    assertExactMasterSolvencyInvariant();

    vm.prank(writer1);
    (, uint256 writerRefund) = settlementVault.claimSettlement(posWriter);
    assertGt(writerRefund, 0, 'Writer should receive remainder collateral');

    assertExactMasterSolvencyInvariant();
  }

  // --- Case C: 2 Buyers + 2 Writers (Multi-Participant ITM) ---
  function test_CaseC_MultiParticipant_ITM() public {
    vm.prank(writer1);
    bytes32 posW1 = positionManager.openPosition(seriesCall60k, false, 1);
    vm.prank(writer2);
    bytes32 posW2 = positionManager.openPosition(seriesCall60k, false, 3);

    vm.prank(buyer1);
    bytes32 posB1 = positionManager.openPosition(seriesCall60k, true, 2);
    vm.prank(buyer2);
    bytes32 posB2 = positionManager.openPosition(seriesCall60k, true, 2);

    assertExactMasterSolvencyInvariant();

    vm.warp(block.timestamp + 1 days + 901 seconds);
    oracleManager.setPrices(66000e18, 3300e18, 1e18); // ITM

    settlementVault.snapshotSeriesSettlement(seriesCall60k);
    assertExactMasterSolvencyInvariant();

    vm.prank(buyer1);
    (uint256 p1, ) = settlementVault.claimSettlement(posB1);
    assertGt(p1, 0);

    vm.prank(buyer2);
    (uint256 p2, ) = settlementVault.claimSettlement(posB2);
    assertGt(p2, 0);

    vm.prank(writer1);
    (, uint256 r1) = settlementVault.claimSettlement(posW1);
    assertGt(r1, 0);

    vm.prank(writer2);
    (, uint256 r2) = settlementVault.claimSettlement(posW2);
    assertGt(r2, 0);

    assertExactMasterSolvencyInvariant();
  }

  // --- Case D: Partial Position Close (Exact 95,200 Reconciliation) ---
  function test_CaseD_PartialPositionClose() public {
    vm.prank(writer2);
    bytes32 posWriter = positionManager.openPosition(seriesCall60k, false, 3); // 3 lots
    assertExactMasterSolvencyInvariant();

    uint256 initialLocked = liquidityVault.seriesLockedCollateral(seriesCall60k);

    vm.prank(writer2);
    positionManager.closePosition(posWriter, 1);

    uint256 newLocked = liquidityVault.seriesLockedCollateral(seriesCall60k);
    assertEq(newLocked, (initialLocked * 2) / 3, '2/3rd collateral should remain locked');

    assertExactMasterSolvencyInvariant();
  }

  // --- Case E: Multiple Positions in Same Series ---
  function test_CaseE_MultiplePositionsSameSeries() public {
    vm.prank(writer1);
    bytes32 w1 = positionManager.openPosition(seriesCall60k, false, 2);
    vm.prank(writer2);
    bytes32 w2 = positionManager.openPosition(seriesCall60k, false, 4);

    vm.prank(buyer1);
    bytes32 b1 = positionManager.openPosition(seriesCall60k, true, 3);
    vm.prank(buyer2);
    bytes32 b2 = positionManager.openPosition(seriesCall60k, true, 3);

    assertExactMasterSolvencyInvariant();

    vm.warp(block.timestamp + 1 days + 901 seconds);
    oracleManager.setPrices(62000e18, 3100e18, 1e18);

    settlementVault.snapshotSeriesSettlement(seriesCall60k);

    vm.prank(buyer1);
    settlementVault.claimSettlement(b1);
    vm.prank(buyer2);
    settlementVault.claimSettlement(b2);
    vm.prank(writer1);
    settlementVault.claimSettlement(w1);
    vm.prank(writer2);
    settlementVault.claimSettlement(w2);

    assertExactMasterSolvencyInvariant();
  }

  // --- Case F: Two Independent Series Cross-Isolation ---
  function test_CaseF_TwoIndependentSeries_Isolation() public {
    vm.prank(writer1);
    bytes32 posCall = positionManager.openPosition(seriesCall60k, false, 1);

    vm.prank(writer2);
    positionManager.openPosition(seriesPut55k, false, 1);

    uint256 putCollateralBefore = liquidityVault.seriesLockedCollateral(seriesPut55k);

    vm.warp(block.timestamp + 1 days + 901 seconds);
    oracleManager.setPrices(70000e18, 3500e18, 1e18); // CALL ITM, PUT OTM

    settlementVault.snapshotSeriesSettlement(seriesCall60k);

    vm.prank(writer1);
    settlementVault.claimSettlement(posCall);

    uint256 putCollateralAfter = liquidityVault.seriesLockedCollateral(seriesPut55k);
    assertEq(
      putCollateralBefore,
      putCollateralAfter,
      'PUT collateral must be 100% isolated and untouched'
    );

    assertExactMasterSolvencyInvariant();
  }

  // --- Case G: Settlement Snapshot Before Claim ---
  function test_CaseG_SettlementSnapshotBeforeClaim() public {
    vm.prank(writer1);
    positionManager.openPosition(seriesCall60k, false, 2);
    vm.prank(buyer1);
    positionManager.openPosition(seriesCall60k, true, 2);

    assertExactMasterSolvencyInvariant();

    vm.warp(block.timestamp + 1 days + 901 seconds);
    oracleManager.setPrices(65000e18, 3200e18, 1e18);

    settlementVault.snapshotSeriesSettlement(seriesCall60k);

    IUVOptionSettlementVault.SettlementSnapshot memory snap = settlementVault.getSettlementSnapshot(
      seriesCall60k
    );
    assertTrue(snap.settled, 'Snapshot must be marked settled');
    assertGt(snap.twapIndexPrice, 0, 'TWAP index price must be recorded');

    assertExactMasterSolvencyInvariant();
  }

  // --- Case H: Partial Claims (One Buyer Claims, Others Pending) ---
  function test_CaseH_PartialClaims() public {
    vm.prank(writer1);
    bytes32 w1 = positionManager.openPosition(seriesCall60k, false, 2);
    vm.prank(buyer1);
    bytes32 b1 = positionManager.openPosition(seriesCall60k, true, 1);
    vm.prank(buyer2);
    bytes32 b2 = positionManager.openPosition(seriesCall60k, true, 1);

    vm.warp(block.timestamp + 1 days + 901 seconds);
    oracleManager.setPrices(68000e18, 3400e18, 1e18);

    settlementVault.snapshotSeriesSettlement(seriesCall60k);

    // Only buyer1 claims first
    vm.prank(buyer1);
    settlementVault.claimSettlement(b1);
    assertExactMasterSolvencyInvariant();

    // Later buyer2 & writer1 claim
    vm.prank(buyer2);
    settlementVault.claimSettlement(b2);
    assertExactMasterSolvencyInvariant();

    vm.prank(writer1);
    settlementVault.claimSettlement(w1);
    assertExactMasterSolvencyInvariant();
  }

  // --- Invariant Fuzz Testing: Exact Equality under Arbitrary Lots ---
  function testFuzz_ExactInvariantConservation(uint8 writerLots, uint8 buyerLots) public {
    vm.assume(writerLots > 0 && writerLots <= 20);
    vm.assume(buyerLots > 0 && buyerLots <= 20);

    vm.prank(writer1);
    positionManager.openPosition(seriesCall60k, false, writerLots);

    vm.prank(buyer1);
    positionManager.openPosition(seriesCall60k, true, buyerLots);

    assertExactMasterSolvencyInvariant();
  }
}
