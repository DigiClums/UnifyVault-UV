// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/treasury/PerformanceManager.sol';
import '../../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface VmExt {
  function createSelectFork(
    string calldata urlOrAlias,
    uint256 blockNumber
  ) external returns (uint256);
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

contract BaseSepoliaRebaseMigrationTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  uint256 public constant CANONICAL_GENESIS_BLOCK = 45_735_000;
  address public constant DIRECTORY = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant ADMIN = 0x441dbf8076d0b143EC17199baE94Daa884161454;
  address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

  ProtocolDirectory public dir;
  PortfolioManager public pm;
  UnifyVaultController public controller;
  UVBEV2 public token;
  CostBasisManagerV2 public cbm;
  PerformanceManager public perf;

  uint256 public initialPortfolioNAV;
  uint256 public initialTotalSupply;
  uint256 public initialNAVPerShare;
  uint256 public initialAdminShares;
  uint256 public initialDeadShares;
  uint256 public initialCostBasis;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl, CANONICAL_GENESIS_BLOCK);

    dir = ProtocolDirectory(DIRECTORY);

    pm = PortfolioManager(dir.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    controller = UnifyVaultController(dir.getAddress(ModuleIds.DEPOSIT_MANAGER));
    token = UVBEV2(dir.getAddress(ModuleIds.TOKEN));
    cbm = CostBasisManagerV2(dir.getAddress(ModuleIds.COST_BASIS_MANAGER));
    perf = PerformanceManager(dir.getAddress(ModuleIds.PERFORMANCE_MANAGER));

    // Snapshot pre-migration state
    (initialPortfolioNAV, initialNAVPerShare) = pm.calculateNAV();
    initialTotalSupply = token.totalSupply();
    initialAdminShares = token.balanceOf(ADMIN);
    initialDeadShares = token.balanceOf(DEAD);
    initialCostBasis = cbm.costBasis(ADMIN);
  }

  function test_GenesisStateIntegrity() public {
    console2.log('=== CANONICAL GENESIS SNAPSHOT ===');
    console2.log('Portfolio NAV (USD): ', initialPortfolioNAV);
    console2.log('Total Supply:        ', initialTotalSupply);
    console2.log('NAV / Share (USD):    ', initialNAVPerShare);
    console2.log('Admin Shares:         ', initialAdminShares);
    console2.log('Dead Shares:          ', initialDeadShares);
    console2.log('Admin Cost Basis:     ', initialCostBasis);

    assertEq(initialNAVPerShare, 1e18, 'Genesis NAV per share must be $1.00');
    assertEq(initialTotalSupply, 0, 'Genesis token supply must be 0');
    assertEq(initialPortfolioNAV, 0, 'Genesis vault NAV must be 0');
  }
}
