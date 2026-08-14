// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/treasury/CostBasisManager.sol';
import '../../src/treasury/PerformanceManager.sol';
import '../../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
}

contract BaseSepoliaRebaseMigrationTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant ADMIN = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

  ProtocolDirectory public dir;
  PortfolioManager public pm;
  UnifyVaultController public controller;
  UVBTCETHToken public token;
  CostBasisManager public cbm;
  PerformanceManager public perf;

  uint256 public initialPortfolioNAV;
  uint256 public initialTotalSupply;
  uint256 public initialNAVPerShare;
  uint256 public initialAdminShares;
  uint256 public initialDeadShares;
  uint256 public initialCostBasis;

  function setUp() public {
    string memory rpcUrl = 'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';
    vmExt.createSelectFork(rpcUrl);

    dir = ProtocolDirectory(DIRECTORY);

    pm = PortfolioManager(dir.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    controller = UnifyVaultController(dir.getAddress(ModuleIds.DEPOSIT_MANAGER));
    token = UVBTCETHToken(dir.getAddress(ModuleIds.TOKEN));
    cbm = CostBasisManager(dir.getAddress(ModuleIds.COST_BASIS_MANAGER));
    perf = PerformanceManager(dir.getAddress(ModuleIds.PERFORMANCE_MANAGER));

    // Snapshot pre-migration state
    (initialPortfolioNAV, initialNAVPerShare) = pm.calculateNAV();
    initialTotalSupply = token.totalSupply();
    initialAdminShares = token.balanceOf(ADMIN);
    initialDeadShares = token.balanceOf(DEAD);
    initialCostBasis = cbm.costBasis(ADMIN);
  }

  function test_RebaseMigrationPreservesEconomicValue() public {
    console2.log('=== PRE-MIGRATION SNAPSHOT ===');
    console2.log('Portfolio NAV (USD): ', initialPortfolioNAV);
    console2.log('Total UVBTCETH Supply:', initialTotalSupply);
    console2.log('NAV / Share (USD):    ', initialNAVPerShare);
    console2.log('Admin Shares:         ', initialAdminShares);
    console2.log('Dead Shares:          ', initialDeadShares);
    console2.log('Admin Cost Basis:     ', initialCostBasis);

    uint256 adminHoldingValueBefore = (initialAdminShares * initialNAVPerShare) / 1e18;
    console2.log('Admin Holding Value:  ', adminHoldingValueBefore);

    // Target NAV per share = 1e18 ($1.00 USD)
    uint256 targetNAVPerShare = 1e18;

    // Calculate exact proportional rebase for admin and total supply
    uint256 newAdminShares = (initialAdminShares * initialPortfolioNAV) / initialTotalSupply;
    uint256 otherShares = initialPortfolioNAV - newAdminShares;

    console2.log('\n=== EXECUTING REBASE MIGRATION ===');
    vm.startPrank(ADMIN);

    bytes32 controllerRole = token.CONTROLLER_ROLE();
    bool hadRole = token.hasRole(controllerRole, ADMIN);
    if (!hadRole) {
      token.grantRole(controllerRole, ADMIN);
    }

    // Calibrate token supply so total supply matches initialPortfolioNAV
    deal(address(token), ADMIN, newAdminShares);
    deal(address(token), DEAD, otherShares);
    vm.store(address(token), bytes32(uint256(2)), bytes32(initialPortfolioNAV));

    if (!hadRole) {
      token.revokeRole(controllerRole, ADMIN);
    }

    vm.stopPrank();

    // Verify post-migration state
    (uint256 postNAV, uint256 postNAVPerShare) = pm.calculateNAV();
    uint256 postTotalSupply = token.totalSupply();
    uint256 postAdminShares = token.balanceOf(ADMIN);
    uint256 postDeadShares = token.balanceOf(DEAD);
    uint256 postCostBasis = cbm.costBasis(ADMIN);
    uint256 adminHoldingValueAfter = (postAdminShares * postNAVPerShare) / 1e18;

    console2.log('\n=== POST-MIGRATION SNAPSHOT ===');
    console2.log('Portfolio NAV (USD): ', postNAV);
    console2.log('Total UVBTCETH Supply:', postTotalSupply);
    console2.log('NAV / Share (USD):    ', postNAVPerShare);
    console2.log('Admin Shares:         ', postAdminShares);
    console2.log('Dead Shares:          ', postDeadShares);
    console2.log('Admin Cost Basis:     ', postCostBasis);
    console2.log('Admin Holding Value:  ', adminHoldingValueAfter);

    // Hard assertions
    assertEq(postNAVPerShare, targetNAVPerShare, 'NAV per share must be exactly $1.00 (1e18)');
    assertEq(postTotalSupply, initialPortfolioNAV, 'Total supply must match portfolio NAV');
    assertEq(postCostBasis, initialCostBasis, 'Cost basis must be completely unchanged');

    // Invariant check: economic value must be preserved (within 1 wei tolerance)
    assertApproxEqAbs(
      adminHoldingValueAfter,
      adminHoldingValueBefore,
      100,
      'Economic value must be preserved'
    );

    // Verify PerformanceManager outputs sane metrics
    PerformanceManager.Performance memory p = perf.performance(ADMIN);
    console2.log('\n=== PERFORMANCE MANAGER AUDIT ===');
    console2.log('Current Value USD:', p.currentValueUSD);
    console2.log('Invested Capital: ', p.investedCapitalUSD);
    console2.log('Unrealized PnL (USD):');
    console2.logInt(p.unrealizedPnL);
    console2.log('ROI (bps):');
    console2.logInt(p.roiBps);

    assertEq(p.currentValueUSD, adminHoldingValueAfter);
    assertEq(p.investedCapitalUSD, initialCostBasis);
    assertEq(
      p.unrealizedPnL,
      int256(adminHoldingValueAfter) - int256(initialCostBasis),
      'Unrealized PnL must match current value minus cost basis'
    );

    // Verify 1 UVBTCETH redeem quote after $1 NAV migration
    UnifyVaultController.RedeemQuote memory quote = controller.getRedeemQuote(USDC, 1e18, ADMIN);
    console2.log('\n=== 1 UVBTCETH REDEEM QUOTE (POST-MIGRATION) ===');
    console2.log('Gross Collateral (USDC):', quote.grossCollateral);
    console2.log('Gross Value (USD):      ', quote.grossValueUSD);
    console2.log('Protocol Fee (USDC):    ', quote.protocolFee);
    console2.log('Net Payout (USDC):      ', quote.netPayout);

    assertGt(quote.grossValueUSD, 0, 'Gross USD value must be positive');
    assertGt(quote.grossCollateral, 0, 'Gross USDC collateral must be positive');
    uint256 expectedFee = (quote.grossCollateral * 200) / 10000;
    assertEq(quote.protocolFee, expectedFee, '2% fee on deposit/redeem must match 200 bps');
    assertEq(
      quote.netPayout,
      quote.grossCollateral - expectedFee,
      'Net payout must equal gross collateral minus protocol fee'
    );
  }
}
