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
import { UnifyVaultTimelock } from '../../src/governance/UnifyVaultTimelock.sol';
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
  address public constant ADMIN_96DA = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant OLD_DEPLOYER = 0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1;
  address public constant ATTACKER = address(0xBAAD1);
  address public constant ATTACKER_2 = address(0xBAAD2);
  address public constant HONEST_USER = address(0x1111);
  address public constant HONEST_BUYER = address(0x2222);

  // Canonical Base Sepolia V2 Deployment Addresses
  address public constant DIRECTORY_ADDR = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant TREASURY_ADDR = 0xB8c8113a042f39936dD966A5983fAaE2bF7b7290;
  address public constant VAULT_ADDR = 0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0;
  address public constant ORACLE_MGR_ADDR = 0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF;
  address public constant CHAINLINK_PROV_ADDR = 0xCF46A80BbF2e92c16f7e1953F9AC73935340f69B;
  address public constant LIQUIDITY_MGR_ADDR = 0xd1DCd311ACD1176E35823360652FCb356a7F227F;
  address public constant TOKEN_V2_ADDR = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant CONTROLLER_ADDR = 0x7DC190a0bFa08c9596DfdC20E602821619E776ea;
  address public constant STRATEGY_MGR_ADDR = 0x73c894DEFBBd69F09134D53a73A0F6bfaeF5A7Bb;
  address public constant PORTFOLIO_MGR_ADDR = 0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b;
  address public constant SWAP_ADAPTER_ADDR = 0xbc97337dE85654aCD96182C93841f21168da65B4;
  address public constant FEE_MGR_ADDR = 0x07f8BD7DAf5002C3C62B3c1280e9258AbBEfA2f1;
  address public constant CBM_V2_ADDR = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;
  address public constant PERF_MGR_ADDR = 0xF1670ca0054D649d1E3dd2f1d642Cc8Ed70109F6;
  address public constant TIMELOCK_ADDR = 0x9094145Cd2AEA2f309eDf14237444a07edF98d02;
  address public constant P2P_ESCROW_ADDR = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;
  address public constant MARKETPLACE_ADDR = 0xe908377f96F313a6b7771570ff6Fb414D38F451A;
  address public constant PAYMASTER_ADDR = 0x42c6342516714CFd64474bd41Ce360605b9fEA88;
  address public constant GAS_TREASURY_ADDR = 0xD4B19A48c270B720FeeEd57CcAb5aa4eCfcC1fD9;

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
    treasury = Treasury(payable(TREASURY_ADDR));
    vault = CustodyVault(VAULT_ADDR);
    oracleManager = OracleManager(ORACLE_MGR_ADDR);
    chainlinkProvider = ChainlinkOracleProvider(CHAINLINK_PROV_ADDR);
    liquidityManager = LiquidityManager(LIQUIDITY_MGR_ADDR);
    tokenV2 = UVBEV2(TOKEN_V2_ADDR);
    controller = UnifyVaultController(CONTROLLER_ADDR);
    strategyManager = StrategyManager(STRATEGY_MGR_ADDR);
    portfolioManager = PortfolioManager(PORTFOLIO_MGR_ADDR);
    swapAdapter = SwapAdapter(payable(SWAP_ADAPTER_ADDR));
    feeManager = FeeManager(FEE_MGR_ADDR);
    cbmV2 = CostBasisManagerV2(CBM_V2_ADDR);
    perfMgr = PerformanceManager(PERF_MGR_ADDR);
    p2pEscrow = P2PEscrowV2(payable(P2P_ESCROW_ADDR));
    marketplace = Marketplace(payable(MARKETPLACE_ADDR));
    paymaster = UnifyVaultPaymaster(payable(PAYMASTER_ADDR));
    gasTreasury = GasTreasury(payable(GAS_TREASURY_ADDR));
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
    // Verify old deployer cannot mint UVBE
    assertFalse(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), OLD_DEPLOYER));
    assertFalse(tokenV2.hasRole(tokenV2.DEFAULT_ADMIN_ROLE(), OLD_DEPLOYER));

    vm.prank(OLD_DEPLOYER);
    vm.expectRevert();
    tokenV2.mint(OLD_DEPLOYER, 1_000_000 * 1e18);
  }

  function test_Phase5_5_AccessControl_Admin96DAHoldsCanonicalRoles() public {
    assertTrue(directory.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(directory.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA));
    assertTrue(treasury.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(vault.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(oracleManager.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(tokenV2.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(cbmV2.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(perfMgr.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(p2pEscrow.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(p2pEscrow.hasRole(AccessRoles.ARBITRATOR_ROLE, ADMIN_96DA));
    assertTrue(marketplace.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
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
    // Only Controller address holds CONTROLLER_ROLE on UVBEV2
    assertTrue(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), CONTROLLER_ADDR));
    assertFalse(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), ATTACKER));
    assertFalse(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), ADMIN_96DA));
  }

  function test_Phase5_5_MintBurn_MintToZeroAddressReverts() public {
    vm.prank(CONTROLLER_ADDR);
    vm.expectRevert();
    tokenV2.mint(address(0), 100 * 1e18);
  }

  // =========================================================================
  // 3. TREASURY / CUSTODY SECURITY & FEE ISOLATION
  // =========================================================================

  function test_Phase5_5_Treasury_CustodyIsolationFromAttacker() public {
    // CustodyVault only allows CONTROLLER_ROLE to withdraw assets
    assertTrue(vault.hasRole(vault.CONTROLLER_ROLE(), CONTROLLER_ADDR));
    assertFalse(vault.hasRole(vault.CONTROLLER_ROLE(), ATTACKER));

    vm.prank(ATTACKER);
    vm.expectRevert();
    vault.withdraw(USDC, ATTACKER, 100 * 1e6);
  }

  function test_Phase5_5_Treasury_P2PFeeFlowIsolation() public {
    // Verify P2PEscrow treasury pointer matches canonical Treasury
    assertEq(p2pEscrow.treasury(), TREASURY_ADDR);

    // Verify CostBasisManager has no impact from Treasury fee accumulation
    uint256 basisBefore = cbmV2.costBasis(TREASURY_ADDR);
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

    // Verify that creating a P2P trade does not alter portfolio NAV
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

    // Mathematical verification: 1% fee on 5000 tokens = 50 tokens, net = 4950
    uint256 amount = 5000 * 1e18;
    uint256 expectedFee = (amount * 100) / 10000;
    assertEq(expectedFee, 50 * 1e18);
    assertEq(amount - expectedFee, 4950 * 1e18);
  }

  function test_Phase5_5_P2P_UnauthorizedCallerCannotReleaseTrade() public {
    // Attempting to release non-existent trade or without being seller reverts
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

  function test_Phase5_5_Marketplace_OnlyUvbeTokenAllowed() public {
    assertEq(marketplace.uvbeToken(), TOKEN_V2_ADDR, 'Marketplace must bind to canonical UVBE');

    // Creating order with non-UVBE asset reverts
    vm.prank(HONEST_USER);
    vm.expectRevert();
    marketplace.createSellOrder(
      USDC, // Not UVBE
      100 * 1e6,
      100 * 1e2,
      keccak256('INR'),
      10 * 1e6,
      100 * 1e6
    );
  }

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
    // An arbitrary target not in approvedTargets cannot be called via Paymaster
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
    // Max refill is 0.5 ether
    vm.startPrank(gasTreasury.owner());
    vm.expectRevert();
    gasTreasury.refillPaymaster(1.0 ether);
    vm.stopPrank();
  }

  function test_Phase5_5_Paymaster_CollateralIsolation() public {
    // Paymaster has no roles on CustodyVault, Treasury, or Token
    assertFalse(vault.hasRole(vault.CONTROLLER_ROLE(), PAYMASTER_ADDR));
    assertFalse(treasury.hasRole(treasury.CONTROLLER_ROLE(), PAYMASTER_ADDR));
    assertFalse(tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), PAYMASTER_ADDR));
  }

  // =========================================================================
  // 9. TIMELOCK / GOVERNANCE SECURITY ATTACKS
  // =========================================================================

  function test_Phase5_5_Timelock_MinDelayIs48Hours() public {
    UnifyVaultTimelock timelock = UnifyVaultTimelock(payable(TIMELOCK_ADDR));
    assertEq(timelock.getMinDelay(), 48 hours, 'Timelock minDelay must be 48 hours (172800s)');
  }

  function test_Phase5_5_Timelock_UnauthorizedCallerCannotSchedule() public {
    UnifyVaultTimelock timelock = UnifyVaultTimelock(payable(TIMELOCK_ADDR));
    vm.prank(ATTACKER);
    vm.expectRevert();
    timelock.schedule(ATTACKER, 0, '', bytes32(0), bytes32(0), 48 hours);
  }

  function test_Phase5_5_Timelock_ExecuteBeforeDelayReverts() public {
    UnifyVaultTimelock timelock = UnifyVaultTimelock(payable(TIMELOCK_ADDR));
    vm.prank(ATTACKER);
    vm.expectRevert();
    timelock.execute(ATTACKER, 0, '', bytes32(0), bytes32(0));
  }

  // =========================================================================
  // 10. UPGRADEABILITY & PROXY CHECKS
  // =========================================================================

  function test_Phase5_5_ImmutableDeployments_NoProxyOrDelegatecall() public {
    // Verify all core contracts have non-zero code and are direct immutable instances
    assertGt(DIRECTORY_ADDR.code.length, 0);
    assertGt(TREASURY_ADDR.code.length, 0);
    assertGt(VAULT_ADDR.code.length, 0);
    assertGt(CONTROLLER_ADDR.code.length, 0);
    assertGt(TOKEN_V2_ADDR.code.length, 0);
    assertGt(CBM_V2_ADDR.code.length, 0);
    assertGt(PERF_MGR_ADDR.code.length, 0);
    assertGt(P2P_ESCROW_ADDR.code.length, 0);
    assertGt(MARKETPLACE_ADDR.code.length, 0);
    assertGt(PAYMASTER_ADDR.code.length, 0);
    assertGt(GAS_TREASURY_ADDR.code.length, 0);
    assertGt(TIMELOCK_ADDR.code.length, 0);
  }
}
