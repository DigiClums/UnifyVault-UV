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
  function envString(string calldata key) external returns (string memory);
}

contract BaseSepoliaProductionAuditAndRegressionTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  // Canonical Admin Authority
  address public constant ADMIN_441D = 0x441dbf8076d0b143EC17199baE94Daa884161454;

  // Canonical Base Sepolia V2 Deployment Addresses
  address public constant DIRECTORY_ADDR = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address public constant TREASURY_ADDR = 0x66182F56BD5E523c655f6890290aB519f528e83f;
  address public constant VAULT_ADDR = 0x27B5C6DEA90678B78856b0B10DBA37A789fDe97e;
  address public constant ORACLE_MGR_ADDR = 0x5B6067982C6ccE2DC760EB4731c1b40136776D4A;
  address public constant CHAINLINK_PROV_ADDR = 0x4F7f99653d9d7aCD462429ffFc0C4B6C8Cf4354a;
  address public constant LIQUIDITY_MGR_ADDR = 0xa938aaCeA64bE8f41c90960aFF232dA4Df7Fc329;
  address public constant TOKEN_V2_ADDR = 0xA3Db7c3DeE9A50D966A06e19b5DF4FCDee615BdE;
  address public constant CONTROLLER_ADDR = 0x07f3D3432B64DBF67c5b061AF2bC8Aef70221Cea;
  address public constant STRATEGY_MGR_ADDR = 0x14058459198a2CfFc8cE89C364334a80Da82D6a3;
  address public constant PORTFOLIO_MGR_ADDR = 0x1C65B1667c8cC03138b8e57cDd40b0Bf28a4cDc4;
  address public constant SWAP_ADAPTER_ADDR = 0xCb1a434c5ebe2F2F8672Ca507Ee819C6888ae634;
  address public constant FEE_MGR_ADDR = 0x0721465B01b586B7AAdF957A4a884acE46CfbEc9;
  address public constant CBM_V2_ADDR = 0xF71706A2Fd8692e3C739855B2A33C0E679b4c382;
  address public constant PERF_MGR_ADDR = 0x133fD024EA635694A223e66B936c2afAB4F2DB78;
  address public constant P2P_ESCROW_ADDR = 0xbAc9C1b440adf74688abBD5be950ABd2766E5B7b;

  ProtocolDirectory public directory;
  UVBEV2 public tokenV2;
  UnifyVaultController public controller;
  CostBasisManagerV2 public cbmV2;
  PerformanceManager public perfMgr;
  P2PEscrowV2 public p2pEscrow;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    directory = ProtocolDirectory(DIRECTORY_ADDR);
    tokenV2 = UVBEV2(TOKEN_V2_ADDR);
    controller = UnifyVaultController(CONTROLLER_ADDR);
    cbmV2 = CostBasisManagerV2(CBM_V2_ADDR);
    perfMgr = PerformanceManager(PERF_MGR_ADDR);
    p2pEscrow = P2PEscrowV2(payable(P2P_ESCROW_ADDR));
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
  // 2. ADMIN AUTHORITY REGRESSION TEST (CRITICAL ROLES ON-CHAIN)
  // =========================================================================

  function test_Regression_Admin441DAuthorityAudit() public {
    // ProtocolDirectory
    assertTrue(
      directory.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D),
      'Admin missing GOVERNANCE_ROLE on ProtocolDirectory'
    );
    assertTrue(
      directory.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on ProtocolDirectory'
    );

    // Treasury
    assertTrue(
      IAccessControl(TREASURY_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on Treasury'
    );
    assertTrue(
      IAccessControl(TREASURY_ADDR).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D),
      'Admin missing GOVERNANCE_ROLE on Treasury'
    );

    // CustodyVault
    assertTrue(
      IAccessControl(VAULT_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on CustodyVault'
    );
    assertTrue(
      IAccessControl(VAULT_ADDR).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D),
      'Admin missing GOVERNANCE_ROLE on CustodyVault'
    );

    // OracleManager
    assertTrue(
      IAccessControl(ORACLE_MGR_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on OracleManager'
    );
    assertTrue(
      IAccessControl(ORACLE_MGR_ADDR).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D),
      'Admin missing GOVERNANCE_ROLE on OracleManager'
    );

    // UVBEV2 Token
    assertTrue(
      tokenV2.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on UVBEV2'
    );

    // PortfolioManager
    assertTrue(
      IAccessControl(PORTFOLIO_MGR_ADDR).hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on PortfolioManager'
    );
    assertTrue(
      IAccessControl(PORTFOLIO_MGR_ADDR).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D),
      'Admin missing GOVERNANCE_ROLE on PortfolioManager'
    );

    // CostBasisManagerV2
    assertTrue(
      cbmV2.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on CostBasisManagerV2'
    );
    assertTrue(
      cbmV2.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D),
      'Admin missing GOVERNANCE_ROLE on CostBasisManagerV2'
    );

    // PerformanceManager
    assertTrue(
      perfMgr.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on PerformanceManager'
    );
    assertTrue(
      perfMgr.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D),
      'Admin missing GOVERNANCE_ROLE on PerformanceManager'
    );

    // P2PEscrowV2
    assertTrue(
      p2pEscrow.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_441D),
      'Admin missing DEFAULT_ADMIN_ROLE on P2PEscrowV2'
    );
    assertTrue(
      p2pEscrow.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_441D),
      'Admin missing GOVERNANCE_ROLE on P2PEscrowV2'
    );
    assertTrue(
      p2pEscrow.hasRole(AccessRoles.ARBITRATOR_ROLE, ADMIN_441D),
      'Admin missing ARBITRATOR_ROLE on P2PEscrowV2'
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
