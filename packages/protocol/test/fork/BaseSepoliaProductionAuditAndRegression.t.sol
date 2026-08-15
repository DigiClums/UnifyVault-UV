// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/treasury/PerformanceManager.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/marketplace/Marketplace.sol';
import '../../src/constants/ModuleIds.sol';
import '../../src/libraries/AccessRoles.sol';
import '@openzeppelin/contracts/access/IAccessControl.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
}

interface ITimelockController {
  function TIMELOCK_ADMIN_ROLE() external view returns (bytes32);
  function PROPOSER_ROLE() external view returns (bytes32);
  function EXECUTOR_ROLE() external view returns (bytes32);
  function CANCELLER_ROLE() external view returns (bytes32);
  function hasRole(bytes32 role, address account) external view returns (bool);
}

contract BaseSepoliaProductionAuditAndRegressionTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  // Canonical Admin Authority
  address public constant ADMIN_96DA = 0xd905920c91853039060246Ed5724AA72B91a96DA;

  // Canonical Base Sepolia V2 Deployment Addresses
  address public constant DIRECTORY_ADDR = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant TREASURY_ADDR = 0xB8c8113a042f39936dD966A5983fAaE2bF7b7290;
  address public constant VAULT_ADDR = 0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0;
  address public constant ORACLE_MGR_ADDR = 0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF;
  address public constant CHAINLINK_PROV_ADDR = 0xCF46A80BbF2e92c16f7e1953F9AC73935340f69B;
  address public constant LIQUIDITY_MGR_ADDR = 0xd1DCd311ACD1176E35823360652FCb356a7F227F;
  address public constant TOKEN_V2_ADDR = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant CONTROLLER_ADDR = 0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;
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

  ProtocolDirectory public directory;
  UVBEV2 public tokenV2;
  UnifyVaultController public controller;
  CostBasisManagerV2 public cbmV2;
  PerformanceManager public perfMgr;
  P2PEscrowV2 public p2pEscrow;
  Marketplace public marketplace;

  function setUp() public {
    string memory rpcUrl = 'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';
    vmExt.createSelectFork(rpcUrl);

    directory = ProtocolDirectory(DIRECTORY_ADDR);
    tokenV2 = UVBEV2(TOKEN_V2_ADDR);
    controller = UnifyVaultController(CONTROLLER_ADDR);
    cbmV2 = CostBasisManagerV2(CBM_V2_ADDR);
    perfMgr = PerformanceManager(PERF_MGR_ADDR);
    p2pEscrow = P2PEscrowV2(payable(P2P_ESCROW_ADDR));
    marketplace = Marketplace(payable(MARKETPLACE_ADDR));
  }

  // =========================================================================
  // 1. DIRECTORY CANONICAL MODULE MAPPING VERIFICATION
  // =========================================================================

  function test_Regression_DirectoryModulePointers() public {
    assertEq(directory.getAddress(ModuleIds.VAULT), VAULT_ADDR, 'Directory VAULT pointer mismatch');
    assertEq(
      directory.getAddress(ModuleIds.TREASURY),
      TREASURY_ADDR,
      'Directory TREASURY pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.TOKEN),
      TOKEN_V2_ADDR,
      'Directory TOKEN pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.ORACLE),
      ORACLE_MGR_ADDR,
      'Directory ORACLE pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.STRATEGY_MANAGER),
      STRATEGY_MGR_ADDR,
      'Directory STRATEGY_MANAGER pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.PORTFOLIO_MANAGER),
      PORTFOLIO_MGR_ADDR,
      'Directory PORTFOLIO_MANAGER pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.SWAP_ADAPTER),
      SWAP_ADAPTER_ADDR,
      'Directory SWAP_ADAPTER pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.LIQUIDITY_MANAGER),
      LIQUIDITY_MGR_ADDR,
      'Directory LIQUIDITY_MANAGER pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.FEE_MANAGER),
      FEE_MGR_ADDR,
      'Directory FEE_MANAGER pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.COST_BASIS_MANAGER),
      CBM_V2_ADDR,
      'Directory COST_BASIS_MANAGER pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.PERFORMANCE_MANAGER),
      PERF_MGR_ADDR,
      'Directory PERFORMANCE_MANAGER pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.P2P_ESCROW),
      P2P_ESCROW_ADDR,
      'Directory P2P_ESCROW pointer mismatch'
    );
    assertEq(
      directory.getAddress(ModuleIds.DEPOSIT_MANAGER),
      CONTROLLER_ADDR,
      'Directory DEPOSIT_MANAGER pointer mismatch'
    );
  }

  // =========================================================================
  // 2. ADMIN 96DA AUTHORITY REGRESSION TEST (CRITICAL ROLES ON-CHAIN)
  // =========================================================================

  function test_Regression_Admin96daAuthorityAudit() public {
    // ProtocolDirectory
    assertTrue(
      directory.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on ProtocolDirectory'
    );
    assertTrue(
      directory.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on ProtocolDirectory'
    );

    // Treasury
    assertTrue(
      IAccessControl(TREASURY_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on Treasury'
    );
    assertTrue(
      IAccessControl(TREASURY_ADDR).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on Treasury'
    );

    // CustodyVault
    assertTrue(
      IAccessControl(VAULT_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on CustodyVault'
    );
    assertTrue(
      IAccessControl(VAULT_ADDR).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on CustodyVault'
    );

    // OracleManager
    assertTrue(
      IAccessControl(ORACLE_MGR_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on OracleManager'
    );
    assertTrue(
      IAccessControl(ORACLE_MGR_ADDR).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on OracleManager'
    );

    // UVBEV2 Token
    assertTrue(
      tokenV2.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on UVBEV2'
    );

    // PortfolioManager
    assertTrue(
      IAccessControl(PORTFOLIO_MGR_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on PortfolioManager'
    );
    assertTrue(
      IAccessControl(PORTFOLIO_MGR_ADDR).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on PortfolioManager'
    );

    // CostBasisManagerV2
    assertTrue(
      cbmV2.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on CostBasisManagerV2'
    );
    assertTrue(
      cbmV2.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on CostBasisManagerV2'
    );

    // PerformanceManager
    assertTrue(
      perfMgr.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on PerformanceManager'
    );
    assertTrue(
      perfMgr.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on PerformanceManager'
    );

    // P2PEscrowV2
    assertTrue(
      p2pEscrow.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on P2PEscrowV2'
    );
    assertTrue(
      p2pEscrow.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on P2PEscrowV2'
    );
    assertTrue(
      p2pEscrow.hasRole(AccessRoles.ARBITRATOR_ROLE, ADMIN_96DA),
      '96da missing ARBITRATOR_ROLE on P2PEscrowV2'
    );

    // Marketplace
    assertTrue(
      marketplace.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on Marketplace'
    );
    assertTrue(
      marketplace.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA),
      '96da missing GOVERNANCE_ROLE on Marketplace'
    );

    // TimelockController
    assertTrue(
      IAccessControl(TIMELOCK_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA),
      '96da missing DEFAULT_ADMIN_ROLE on TimelockController'
    );
  }

  // =========================================================================
  // 3. INTER-CONTRACT SYSTEM ROLES & AUTHORIZATIONS
  // =========================================================================

  function test_Regression_SystemRoleAuthorizations() public {
    // UnifyVaultController CONTROLLER_ROLE on Vault, Treasury, UVBEV2, CBMV2
    assertTrue(
      IAccessControl(VAULT_ADDR).hasRole(AccessRoles.CONTROLLER_ROLE, CONTROLLER_ADDR),
      'Controller missing CONTROLLER_ROLE on CustodyVault'
    );
    assertTrue(
      IAccessControl(TREASURY_ADDR).hasRole(AccessRoles.CONTROLLER_ROLE, CONTROLLER_ADDR),
      'Controller missing CONTROLLER_ROLE on Treasury'
    );
    assertTrue(
      tokenV2.hasRole(tokenV2.CONTROLLER_ROLE(), CONTROLLER_ADDR),
      'Controller missing CONTROLLER_ROLE on UVBEV2'
    );
    assertTrue(
      cbmV2.hasRole(cbmV2.CONTROLLER_ROLE(), CONTROLLER_ADDR),
      'Controller missing CONTROLLER_ROLE on CostBasisManagerV2'
    );

    // CBMV2 Escrow Whitelist & Index Token
    assertTrue(
      cbmV2.isEscrow(P2P_ESCROW_ADDR),
      'P2PEscrowV2 not whitelisted in CostBasisManagerV2'
    );
    assertEq(cbmV2.indexToken(), TOKEN_V2_ADDR, 'CostBasisManagerV2 indexToken mismatch');
    assertEq(
      address(tokenV2.costBasisManager()),
      CBM_V2_ADDR,
      'UVBEV2 costBasisManager pointer mismatch'
    );
  }

  // =========================================================================
  // 4. P2P 1% FEE PERMANENT REGRESSION ENFORCEMENT
  // =========================================================================

  function test_Regression_P2P1PercentFeeEnforcement() public {
    // Exact 100 bps (1.00%) fee configuration
    assertEq(p2pEscrow.feeBps(), 100, 'P2PEscrowV2 feeBps must be strictly 100 (1.00%)');
    assertEq(p2pEscrow.MAX_FEE_BPS(), 500, 'P2PEscrowV2 MAX_FEE_BPS must be strictly 500 (5.00%)');
    assertEq(
      p2pEscrow.treasury(),
      TREASURY_ADDR,
      'P2PEscrowV2 treasury must be canonical Treasury'
    );

    // Mathematical fee calculation invariant: 100 bps == 1/100 == 1%
    uint256 tradeAmount = 1000 * 1e18;
    uint256 expectedFee = (tradeAmount * 100) / 10000;
    assertEq(expectedFee, 10 * 1e18, '1% fee of 1000 UVBE must be exactly 10 UVBE');

    uint256 netPayout = tradeAmount - expectedFee;
    assertEq(netPayout, 990 * 1e18, 'Net payout must be exactly 990 UVBE');
  }
}
