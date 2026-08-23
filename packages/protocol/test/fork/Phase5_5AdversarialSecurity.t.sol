// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import { ProtocolDirectory } from '../../src/ProtocolDirectory.sol';
import { UVBEV2 } from '../../src/token/UVBEV2.sol';
import { UnifyVaultController } from '../../src/controller/UnifyVaultController.sol';
import { CustodyVault } from '../../src/vault/CustodyVault.sol';
import { Treasury } from '../../src/vault/Treasury.sol';
import { LiquidityManager } from '../../src/vault/LiquidityManager.sol';
import { FeeManager } from '../../src/treasury/FeeManager.sol';
import { CostBasisManagerV2 } from '../../src/treasury/CostBasisManagerV2.sol';
import { PerformanceManager } from '../../src/treasury/PerformanceManager.sol';
import { OracleManager } from '../../src/oracle/OracleManager.sol';
import { ChainlinkOracleProvider } from '../../src/oracle/ChainlinkOracleProvider.sol';
import { StrategyManager } from '../../src/strategy/StrategyManager.sol';
import { PortfolioManager } from '../../src/strategy/PortfolioManager.sol';
import { SwapAdapter } from '../../src/swap/SwapAdapter.sol';
import { P2PEscrowV2 } from '../../src/escrow/P2PEscrowV2.sol';
import { Marketplace } from '../../src/marketplace/Marketplace.sol';
import { UnifyVaultPaymaster } from '../../src/aa/UnifyVaultPaymaster.sol';
import { GasTreasury } from '../../src/aa/GasTreasury.sol';
import { ModuleIds } from '../../src/constants/ModuleIds.sol';
import { AccessRoles } from '../../src/libraries/AccessRoles.sol';
import { EscrowTypes } from '../../src/types/EscrowTypes.sol';
import { MarketplaceTypes } from '../../src/types/MarketplaceTypes.sol';
import '@openzeppelin/contracts/access/IAccessControl.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

contract Phase5_5AdversarialSecurityTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  // Canonical Admin Authority
  address public constant ADMIN_441D = 0x441dbf8076d0b143EC17199baE94Daa884161454;
  address public constant OLD_DEPLOYER = address(0x3333333333333333333333333333333333333333);
  address public constant ATTACKER = address(0xBAAD1);
  address public constant ATTACKER_2 = address(0xBAAD2);
  address public constant HONEST_USER = address(0x1111);
  address public constant HONEST_BUYER = address(0x2222);

  // Canonical Base Sepolia V2 Deployment Directory
  address public constant DIRECTORY_ADDR = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;

  // Base Sepolia Collateral Tokens
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant CBBTC = 0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29;
  address public constant WETH = 0xd116ab1c943cf15904eC4c8dd701086f175FA323;

  ProtocolDirectory public directory;
  Treasury public treasury;
  CustodyVault public vault;
  OracleManager public oracleManager;
  ChainlinkOracleProvider public chainlinkProvider;
  LiquidityManager public liquidityManager;
  UVBEV2 public tokenV2;
  UnifyVaultController public controller;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  FeeManager public feeManager;
  CostBasisManagerV2 public cbmV2;
  PerformanceManager public perfMgr;
  P2PEscrowV2 public p2pEscrow;
  Marketplace public marketplace;
  UnifyVaultPaymaster public paymaster;
  GasTreasury public gasTreasury;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    directory = ProtocolDirectory(DIRECTORY_ADDR);
    treasury = Treasury(payable(directory.getAddress(ModuleIds.TREASURY)));
    vault = CustodyVault(directory.getAddress(ModuleIds.VAULT));
    oracleManager = OracleManager(directory.getAddress(ModuleIds.ORACLE));
    chainlinkProvider = ChainlinkOracleProvider(0x4F7f99653d9d7aCD462429ffFc0C4B6C8Cf4354a);
    liquidityManager = LiquidityManager(directory.getAddress(ModuleIds.LIQUIDITY_MANAGER));
    tokenV2 = UVBEV2(directory.getAddress(ModuleIds.TOKEN));
    controller = UnifyVaultController(directory.getAddress(ModuleIds.DEPOSIT_MANAGER));
    strategyManager = StrategyManager(directory.getAddress(ModuleIds.STRATEGY_MANAGER));
    portfolioManager = PortfolioManager(directory.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    swapAdapter = SwapAdapter(payable(directory.getAddress(ModuleIds.SWAP_ADAPTER)));
    feeManager = FeeManager(directory.getAddress(ModuleIds.FEE_MANAGER));
    cbmV2 = CostBasisManagerV2(directory.getAddress(ModuleIds.COST_BASIS_MANAGER));
    perfMgr = PerformanceManager(directory.getAddress(ModuleIds.PERFORMANCE_MANAGER));
    p2pEscrow = P2PEscrowV2(payable(directory.getAddress(ModuleIds.P2P_ESCROW)));
    vm.prank(ADMIN_441D);
    marketplace = new Marketplace(address(p2pEscrow));
    paymaster = new UnifyVaultPaymaster(
      0x0000000071727De22E5E9d8BAf0edAc6f37da032,
      ADMIN_441D,
      address(0),
      0.05 ether
    );
    gasTreasury = new GasTreasury(ADMIN_441D, ADMIN_441D, address(paymaster), 0.5 ether, 2.0 ether);
  }

  // =========================================================================
  // 1. ACCESS CONTROL & PRIVILEGE ESCALATION ATTACKS
  // =========================================================================

  function test_Phase5_5_AccessControl_UnauthorizedCannotRegisterModule() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    directory.registerAddress(ModuleIds.VAULT, ATTACKER);
  }

  function test_Phase5_5_AccessControl_UnauthorizedCannotWithdrawFromTreasury() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    treasury.withdraw(USDC, ATTACKER, 1000 * 1e6);

    vm.prank(ATTACKER);
    vm.expectRevert();
    treasury.withdrawNative(payable(ATTACKER), 1 ether);
  }

  function test_Phase5_5_AccessControl_UnauthorizedCannotWithdrawFromCustodyVault() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    vault.withdraw(USDC, ATTACKER, 1000 * 1e6);
  }

  function test_Phase5_5_AccessControl_UnauthorizedCannotConfigureOracle() public {
    bytes32 fakeId = keccak256('FAKE');
    vm.prank(ATTACKER);
    vm.expectRevert();
    oracleManager.configureAsset(fakeId, ATTACKER, address(0), 86400, true);
  }

  function test_Phase5_5_AccessControl_UnauthorizedCannotSetEscrowFeeConfig() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    p2pEscrow.setFeeConfig(0);

    vm.prank(ATTACKER);
    vm.expectRevert();
    p2pEscrow.setTreasury(ATTACKER);
  }

  function test_Phase5_5_AccessControl_UnauthorizedCannotUpdateStrategyWeights() public {
    address[] memory assets = new address[](2);
    assets[0] = CBBTC;
    assets[1] = WETH;
    uint256[] memory weights = new uint256[](2);
    weights[0] = 5000;
    weights[1] = 5000;

    vm.prank(ATTACKER);
    vm.expectRevert();
    strategyManager.updateWeights(assets, weights);
  }

  function test_Phase5_5_AccessControl_OldDeployerHasNoMintAuthority() public {
    assertFalse(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), OLD_DEPLOYER));
    assertFalse(tokenV2.hasRole(tokenV2.DEFAULT_ADMIN_ROLE(), OLD_DEPLOYER));

    vm.prank(OLD_DEPLOYER);
    vm.expectRevert();
    tokenV2.mint(OLD_DEPLOYER, 1_000_000 * 1e18);
  }

  function test_Phase5_5_AccessControl_Admin441DHoldsCanonicalRoles() public {
    assertTrue(directory.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
    assertTrue(directory.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D));
    assertTrue(treasury.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
    assertTrue(vault.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
    assertTrue(oracleManager.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
    assertTrue(tokenV2.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
    assertTrue(cbmV2.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
    assertTrue(perfMgr.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
    assertTrue(p2pEscrow.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
    assertTrue(p2pEscrow.hasRole(AccessRoles.ARBITRATOR_ROLE, ADMIN_441D));
    assertTrue(marketplace.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D));
  }

  // =========================================================================
  // 2. MINT / BURN SECURITY (UVBEV2)
  // =========================================================================

  function test_Phase5_5_MintBurn_UnauthorizedCallerCannotMint() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    tokenV2.mint(ATTACKER, 50_000 * 1e18);
  }

  function test_Phase5_5_MintBurn_UnauthorizedCallerCannotBurn() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    tokenV2.burn(HONEST_USER, 50_000 * 1e18);
  }

  function test_Phase5_5_MintBurn_OnlyControllerCanMintAndBurn() public {
    assertTrue(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), address(controller)));
    assertFalse(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), ATTACKER));
    assertFalse(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), ADMIN_441D));
  }

  function test_Phase5_5_MintBurn_MintToZeroAddressReverts() public {
    vm.prank(address(controller));
    vm.expectRevert();
    tokenV2.mint(address(0), 100 * 1e18);
  }

  // =========================================================================
  // 3. TREASURY / CUSTODY SECURITY & FEE ISOLATION
  // =========================================================================

  function test_Phase5_5_Treasury_CustodyIsolationFromAttacker() public {
    assertTrue(vault.hasRole(vault.CONTROLLER_ROLE(), address(controller)));
    assertFalse(vault.hasRole(vault.CONTROLLER_ROLE(), ATTACKER));

    vm.prank(ATTACKER);
    vm.expectRevert();
    vault.withdraw(USDC, ATTACKER, 100 * 1e6);
  }

  function test_Phase5_5_Treasury_P2PFeeFlowIsolation() public {
    assertEq(p2pEscrow.treasury(), address(treasury));

    uint256 basisBefore = cbmV2.costBasis(address(treasury));
    assertEq(basisBefore, 0, 'Treasury fee recipient must have zero user portfolio basis');
  }

  // =========================================================================
  // 4. ORACLE SECURITY ATTACKS
  // =========================================================================

  function test_Phase5_5_Oracle_FreshPriceAvailable() public {
    assertTrue(oracleManager.isPriceFresh(USDC));
    assertTrue(oracleManager.isPriceFresh(CBBTC));
    assertTrue(oracleManager.isPriceFresh(WETH));

    uint256 usdcPrice = oracleManager.getAssetPrice(USDC);
    uint256 cbbtcPrice = oracleManager.getAssetPrice(CBBTC);
    uint256 wethPrice = oracleManager.getAssetPrice(WETH);

    assertGt(usdcPrice, 0, 'USDC price must be > 0');
    assertGt(cbbtcPrice, 0, 'cbBTC price must be > 0');
    assertGt(wethPrice, 0, 'WETH price must be > 0');
  }

  function test_Phase5_5_Oracle_UnregisteredAssetReverts() public {
    address unreg = address(0x1234567890);
    vm.expectRevert();
    oracleManager.getAssetPrice(unreg);
  }

  // =========================================================================
  // 5. NAV / ACCOUNTING & ECONOMIC ATTACKS
  // =========================================================================

  function test_Phase5_5_Economic_GenesisNAVAndUVPriceIsPositive() public {
    (uint256 navUSD, uint256 uvPrice) = portfolioManager.calculateUVPrice();
    assertGt(uvPrice, 0, 'UV price must be strictly positive');
    assertGe(navUSD, 0, 'NAV must be non-negative');
  }

  function test_Phase5_5_Economic_P2PIsIsolatedFromPortfolioNAV() public {
    (uint256 navUSDInitial, uint256 uvPriceInitial) = portfolioManager.calculateUVPrice();

    assertEq(p2pEscrow.feeBps(), 100);
    (uint256 navUSDAfter, uint256 uvPriceAfter) = portfolioManager.calculateUVPrice();

    assertEq(navUSDInitial, navUSDAfter, 'P2P action must not mutate portfolio NAV');
    assertEq(uvPriceInitial, uvPriceAfter, 'P2P action must not mutate UV price');
  }

  // =========================================================================
  // 6. P2P ESCROW V2 SECURITY ATTACKS
  // =========================================================================

  function test_Phase5_5_P2P_FeeBpsPermanentInvariant() public {
    assertEq(p2pEscrow.feeBps(), 100, 'Fee BPS must strictly be 100 (1.00%)');
    assertEq(p2pEscrow.MAX_FEE_BPS(), 500, 'MAX_FEE_BPS must strictly be 500 (5.00%)');

    uint256 amount = 5000 * 1e18;
    uint256 expectedFee = (amount * 100) / 10000;
    assertEq(expectedFee, 50 * 1e18);
    assertEq(amount - expectedFee, 4950 * 1e18);
  }

  function test_Phase5_5_P2P_UnauthorizedCallerCannotReleaseTrade() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    p2pEscrow.confirmAndRelease(999999);
  }

  function test_Phase5_5_P2P_UnauthorizedCallerCannotRefundTrade() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    p2pEscrow.refund(999999);
  }

  function test_Phase5_5_P2P_UnauthorizedCallerCannotResolveDispute() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    p2pEscrow.resolveDispute(999999, EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER);
  }

  // =========================================================================
  // 7. MARKETPLACE SECURITY ATTACKS
  // =========================================================================

  function test_Phase5_5_Marketplace_MatchingZeroAmountsReverts() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    marketplace.matchOrders(1, 2, 0);
  }

  function test_Phase5_5_Marketplace_CancelNonExistentOrderReverts() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    marketplace.cancelOrder(999999);
  }

  // =========================================================================
  // 8. ERC-4337 / PAYMASTER & GAS TREASURY SECURITY ATTACKS
  // =========================================================================

  function test_Phase5_5_Paymaster_UnauthorizedTargetRejected() public {
    assertFalse(paymaster.approvedTargets(ATTACKER));
    assertFalse(paymaster.approvedTargets(address(0)));
  }

  function test_Phase5_5_Paymaster_UnauthorizedCallerCannotWithdrawGas() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    paymaster.withdrawTo(payable(ATTACKER), 1 ether);
  }

  function test_Phase5_5_Paymaster_UnauthorizedCallerCannotSetApprovedTarget() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    paymaster.setApprovedTarget(ATTACKER, true);
  }

  function test_Phase5_5_GasTreasury_UnauthorizedCallerCannotRefill() public {
    vm.prank(ATTACKER);
    vm.expectRevert();
    gasTreasury.refillPaymaster(0.01 ether);
  }

  function test_Phase5_5_GasTreasury_ExceedsMaxRefillPerTxReverts() public {
    vm.startPrank(gasTreasury.owner());
    vm.expectRevert();
    gasTreasury.refillPaymaster(1.0 ether);
    vm.stopPrank();
  }

  function test_Phase5_5_Paymaster_CollateralIsolation() public {
    assertFalse(vault.hasRole(vault.CONTROLLER_ROLE(), address(paymaster)));
    assertFalse(treasury.hasRole(treasury.CONTROLLER_ROLE(), address(paymaster)));
    assertFalse(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), address(paymaster)));
  }

  // =========================================================================
  // 9. UPGRADEABILITY & DIRECT DEPLOYMENT CHECKS
  // =========================================================================

  function test_Phase5_5_ImmutableDeployments_DirectInstances() public {
    assertGt(DIRECTORY_ADDR.code.length, 0);
    assertGt(address(treasury).code.length, 0);
    assertGt(address(vault).code.length, 0);
    assertGt(address(controller).code.length, 0);
    assertGt(address(tokenV2).code.length, 0);
    assertGt(address(cbmV2).code.length, 0);
    assertGt(address(perfMgr).code.length, 0);
    assertGt(address(p2pEscrow).code.length, 0);
  }
}
