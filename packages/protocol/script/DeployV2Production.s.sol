// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '../src/ProtocolDirectory.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/token/UVBEV2.sol';
import '../src/treasury/CostBasisManagerV2.sol';
import '../src/treasury/PerformanceManager.sol';
import '../src/escrow/P2PEscrowV2.sol';
import '../src/constants/ModuleIds.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/AddressValidationLib.sol';

contract DeployV2ProductionScript is Script {
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;
  address public constant ADMIN = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant V1_TOKEN = 0xa34596D38Be381A4764141105A91C338Ca5503bB;

  address public constant SELLER = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant BUYER = 0xB145AC2a59575Fbe306a58aC924718f4DD4659Da;
  address public constant TREASURY = 0x8Aa2e812D244b0C30D45035C3C843f4CdD02aCe6;
  address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

  uint256 public constant EXP_SELLER_BAL = 79517544241331582508;
  uint256 public constant EXP_BUYER_BAL = 9990000000000000000;
  uint256 public constant EXP_TREASURY_BAL = 10000000000000000;
  uint256 public constant EXP_DEAD_BAL = 1000;
  uint256 public constant EXP_TOTAL_SUPPLY = 89517544241331583508;

  uint256 public constant SELLER_COST_BASIS = 88833211568308266678;
  int256 public constant SELLER_REALIZED_PNL = -1044190431691733322;
  uint256 public constant SELLER_FIRST_DEP = 1786427102;

  uint256 public constant BUYER_COST_BASIS = 11500000000000000000;
  int256 public constant BUYER_REALIZED_PNL = 0;
  uint256 public constant BUYER_FIRST_DEP = 1786432576;

  function run() external {
    console2.log('=====================================================');
    console2.log('    UNIFYVAULT V2 BASE SEPOLIA LIVE PRODUCTION BROADCAST');
    console2.log('=====================================================');

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);

    // ──────────────────────────────────────────────────────────────────
    // STEP 0 — LIVE PREFLIGHT CHECKS
    // ──────────────────────────────────────────────────────────────────
    console2.log('=== STEP 0: LIVE PREFLIGHT CHECKS ===');
    console2.log('Deployer Address:    ', msg.sender);
    require(msg.sender == ADMIN, 'PREFLIGHT: Deployer must be Admin');

    uint256 bal = msg.sender.balance;
    console2.log('Deployer ETH Balance:', bal);
    require(bal > 0.05 ether, 'PREFLIGHT: Insufficient ETH for broadcast');

    address liveToken = dir.getAddress(ModuleIds.TOKEN);
    console2.log('Live V1 Token:       ', liveToken);
    require(liveToken == V1_TOKEN, 'PREFLIGHT: Token address mismatch');

    uint256 liveSupply = IERC20(liveToken).totalSupply();
    console2.log('Live Total Supply:   ', liveSupply);
    require(liveSupply == EXP_TOTAL_SUPPLY, 'PREFLIGHT: Total supply mismatch');

    require(
      IERC20(liveToken).balanceOf(SELLER) == EXP_SELLER_BAL,
      'PREFLIGHT: Seller balance mismatch'
    );
    require(
      IERC20(liveToken).balanceOf(BUYER) == EXP_BUYER_BAL,
      'PREFLIGHT: Buyer balance mismatch'
    );
    require(
      IERC20(liveToken).balanceOf(TREASURY) == EXP_TREASURY_BAL,
      'PREFLIGHT: Treasury balance mismatch'
    );
    require(IERC20(liveToken).balanceOf(DEAD) == EXP_DEAD_BAL, 'PREFLIGHT: Dead balance mismatch');

    require(!dir.isFrozen(), 'PREFLIGHT: ProtocolDirectory is frozen');
    require(
      dir.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN),
      'PREFLIGHT: Admin missing GOVERNANCE_ROLE'
    );

    console2.log('[OK] ALL PREFLIGHT CHECKS PASSED');

    // Start Live On-Chain Broadcast
    vm.startBroadcast();

    // ──────────────────────────────────────────────────────────────────
    // STEP 1 — DEPLOY V2 CONTRACTS
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== STEP 1: DEPLOY V2 CONTRACTS ===');

    address oracle = dir.getAddress(ModuleIds.ORACLE);
    address vault = dir.getAddress(ModuleIds.VAULT);
    address pmAddr = dir.getAddress(ModuleIds.PORTFOLIO_MANAGER);

    UVBEV2 v2Token = new UVBEV2(ADMIN);
    console2.log('1. UVBEV2 deployed at:           ', address(v2Token));

    CostBasisManagerV2 v2CBM = new CostBasisManagerV2(ADMIN, DIRECTORY);
    console2.log('2. CostBasisManagerV2 deployed at: ', address(v2CBM));

    P2PEscrowV2 v2Escrow = new P2PEscrowV2(TREASURY, 100, address(v2CBM));
    console2.log('3. P2PEscrowV2 deployed at:        ', address(v2Escrow));

    PerformanceManager v2Perf = new PerformanceManager(ADMIN, DIRECTORY);
    console2.log('4. PerformanceManager deployed at: ', address(v2Perf));

    UnifyVaultController v2Controller = new UnifyVaultController(
      DIRECTORY,
      oracle,
      vault,
      TREASURY,
      address(v2Token)
    );
    console2.log('5. UnifyVaultController deployed at:', address(v2Controller));

    // Immediate byte code & constructor verification
    require(address(v2Token).code.length > 0, 'V2 Token bytecode missing');
    require(address(v2CBM).code.length > 0, 'V2 CBM bytecode missing');
    require(address(v2Escrow).code.length > 0, 'V2 Escrow bytecode missing');
    require(address(v2Perf).code.length > 0, 'V2 Perf bytecode missing');
    require(address(v2Controller).code.length > 0, 'V2 Controller bytecode missing');

    require(v2Escrow.treasury() == TREASURY, 'V2 Escrow treasury mismatch');
    require(v2Escrow.feeBps() == 100, 'V2 Escrow feeBps mismatch');
    require(address(v2Escrow.costBasisManager()) == address(v2CBM), 'V2 Escrow CBM mismatch');
    require(v2Controller.token() == address(v2Token), 'V2 Controller token mismatch');

    console2.log('[OK] STEP 1 DEPLOYMENT & CONSTRUCTOR VERIFICATION SUCCEEDED');

    // ──────────────────────────────────────────────────────────────────
    // STEP 2 — CONFIGURE V2 ROLES & LINKS
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== STEP 2: CONFIGURE ROLES & LINKS ===');

    bytes32 ctrlRole = v2Token.CONTROLLER_ROLE();

    // Grant temporary minting role to ADMIN for migration mint
    v2Token.grantRole(ctrlRole, ADMIN);
    v2CBM.grantRole(v2CBM.CONTROLLER_ROLE(), address(v2Controller));
    v2CBM.setModules(pmAddr, address(v2Token));
    v2CBM.setEscrowStatus(address(v2Escrow), true);
    v2Token.setCostBasisManager(address(v2CBM));

    IAccessControl(vault).grantRole(keccak256('CONTROLLER_ROLE'), address(v2Controller));
    IAccessControl(TREASURY).grantRole(keccak256('CONTROLLER_ROLE'), address(v2Controller));

    require(v2Token.hasRole(ctrlRole, ADMIN), 'Role: Admin missing mint role');
    require(
      v2CBM.hasRole(v2CBM.CONTROLLER_ROLE(), address(v2Controller)),
      'Role: Controller missing CBM role'
    );
    console2.log('[OK] STEP 2 ROLES CONFIGURED AND VERIFIED');

    // ──────────────────────────────────────────────────────────────────
    // STEP 3 — INITIAL V2 MIGRATION MINT
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== STEP 3: MINT EXACT BALANCES ===');

    v2Token.mint(SELLER, EXP_SELLER_BAL);
    require(v2Token.balanceOf(SELLER) == EXP_SELLER_BAL, 'Mint: Seller balance mismatch');
    console2.log('Seller minted:  ', EXP_SELLER_BAL);

    v2Token.mint(BUYER, EXP_BUYER_BAL);
    require(v2Token.balanceOf(BUYER) == EXP_BUYER_BAL, 'Mint: Buyer balance mismatch');
    console2.log('Buyer minted:   ', EXP_BUYER_BAL);

    v2Token.mint(TREASURY, EXP_TREASURY_BAL);
    require(v2Token.balanceOf(TREASURY) == EXP_TREASURY_BAL, 'Mint: Treasury balance mismatch');
    console2.log('Treasury minted:', EXP_TREASURY_BAL);

    v2Token.mint(DEAD, EXP_DEAD_BAL);
    require(v2Token.balanceOf(DEAD) == EXP_DEAD_BAL, 'Mint: Dead balance mismatch');
    console2.log('Dead minted:    ', EXP_DEAD_BAL);

    uint256 mintedTotal = v2Token.totalSupply();
    require(mintedTotal == EXP_TOTAL_SUPPLY, 'Mint: Total supply mismatch');
    console2.log('Total V2 Supply:', mintedTotal);

    // Revoke temporary mint role from ADMIN & grant permanent role to V2 Controller
    v2Token.revokeRole(ctrlRole, ADMIN);
    v2Token.grantRole(ctrlRole, address(v2Controller));
    require(!v2Token.hasRole(ctrlRole, ADMIN), 'Role: Admin temporary mint role not revoked');
    require(
      v2Token.hasRole(ctrlRole, address(v2Controller)),
      'Role: Controller missing V2 Token role'
    );

    // Verify minting was accounting-neutral
    require(v2CBM.costBasis(SELLER) == 0, 'Mint Neutrality: Seller basis not zero');
    require(v2CBM.costBasis(BUYER) == 0, 'Mint Neutrality: Buyer basis not zero');
    require(v2CBM.costBasis(TREASURY) == 0, 'Mint Neutrality: Treasury basis not zero');
    require(v2CBM.costBasis(DEAD) == 0, 'Mint Neutrality: Dead basis not zero');
    console2.log('[OK] STEP 3 MINTING & NEUTRALITY VERIFIED');

    // ──────────────────────────────────────────────────────────────────
    // STEP 4 — MIGRATE ACCOUNTING & TRADE #7 BACKFILL
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== STEP 4: MIGRATE ACCOUNTING & TRADE #7 BACKFILL ===');

    v2CBM.migrateAccounting(SELLER, SELLER_COST_BASIS, SELLER_REALIZED_PNL, SELLER_FIRST_DEP);
    require(v2CBM.costBasis(SELLER) == SELLER_COST_BASIS, 'Migrate: Seller cost basis mismatch');
    require(v2CBM.realizedPnL(SELLER) == SELLER_REALIZED_PNL, 'Migrate: Seller PnL mismatch');
    require(
      v2CBM.firstDepositTimestamp(SELLER) == SELLER_FIRST_DEP,
      'Migrate: Seller timestamp mismatch'
    );
    console2.log('Seller accounting migrated & Trade #7 backfilled');

    v2CBM.migrateAccounting(BUYER, BUYER_COST_BASIS, BUYER_REALIZED_PNL, BUYER_FIRST_DEP);
    require(v2CBM.costBasis(BUYER) == BUYER_COST_BASIS, 'Migrate: Buyer cost basis mismatch');
    require(v2CBM.realizedPnL(BUYER) == BUYER_REALIZED_PNL, 'Migrate: Buyer PnL mismatch');
    require(
      v2CBM.firstDepositTimestamp(BUYER) == BUYER_FIRST_DEP,
      'Migrate: Buyer timestamp mismatch'
    );
    console2.log('Buyer accounting migrated & Trade #7 backfilled');

    require(v2CBM.costBasis(TREASURY) == 0, 'Migrate: Treasury basis non-zero');
    require(v2CBM.costBasis(DEAD) == 0, 'Migrate: Dead basis non-zero');
    console2.log('[OK] STEP 4 ACCOUNTING MIGRATION VERIFIED');

    // ──────────────────────────────────────────────────────────────────
    // STEP 5 — PRE-SWITCH FULL VERIFICATION
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== STEP 5: PRE-SWITCH FULL VERIFICATION ===');
    require(v2Token.totalSupply() == EXP_TOTAL_SUPPLY, 'STEP 5: Total supply mismatch');
    require(v2Token.balanceOf(SELLER) == EXP_SELLER_BAL, 'STEP 5: Seller balance mismatch');
    require(v2Token.balanceOf(BUYER) == EXP_BUYER_BAL, 'STEP 5: Buyer balance mismatch');
    require(v2Token.balanceOf(TREASURY) == EXP_TREASURY_BAL, 'STEP 5: Treasury balance mismatch');
    require(v2Token.balanceOf(DEAD) == EXP_DEAD_BAL, 'STEP 5: Dead balance mismatch');

    require(v2CBM.costBasis(SELLER) == SELLER_COST_BASIS, 'STEP 5: Seller basis mismatch');
    require(v2CBM.realizedPnL(SELLER) == SELLER_REALIZED_PNL, 'STEP 5: Seller PnL mismatch');
    require(v2CBM.costBasis(BUYER) == BUYER_COST_BASIS, 'STEP 5: Buyer basis mismatch');
    require(v2CBM.realizedPnL(BUYER) == 0, 'STEP 5: Buyer PnL mismatch');

    console2.log('[OK] STEP 5 PRE-SWITCH VERIFICATION SUCCEEDED - SAFE TO SWITCH DIRECTORY');

    // ──────────────────────────────────────────────────────────────────
    // STEP 6 — DIRECTORY SWITCH
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== STEP 6: DIRECTORY SWITCH ===');

    dir.updateAddress(ModuleIds.TOKEN, address(v2Token));
    require(dir.getAddress(ModuleIds.TOKEN) == address(v2Token), 'Directory: TOKEN update failed');
    console2.log('1. Updated TOKEN to:              ', address(v2Token));

    dir.updateAddress(ModuleIds.COST_BASIS_MANAGER, address(v2CBM));
    require(
      dir.getAddress(ModuleIds.COST_BASIS_MANAGER) == address(v2CBM),
      'Directory: CBM update failed'
    );
    console2.log('2. Updated COST_BASIS_MANAGER to: ', address(v2CBM));

    dir.updateAddress(ModuleIds.P2P_ESCROW, address(v2Escrow));
    require(
      dir.getAddress(ModuleIds.P2P_ESCROW) == address(v2Escrow),
      'Directory: P2P update failed'
    );
    console2.log('3. Updated P2P_ESCROW to:         ', address(v2Escrow));

    dir.updateAddress(ModuleIds.DEPOSIT_MANAGER, address(v2Controller));
    require(
      dir.getAddress(ModuleIds.DEPOSIT_MANAGER) == address(v2Controller),
      'Directory: Controller update failed'
    );
    console2.log('4. Updated DEPOSIT_MANAGER to:    ', address(v2Controller));

    dir.updateAddress(ModuleIds.PERFORMANCE_MANAGER, address(v2Perf));
    require(
      dir.getAddress(ModuleIds.PERFORMANCE_MANAGER) == address(v2Perf),
      'Directory: Performance update failed'
    );
    console2.log('5. Updated PERFORMANCE_MANAGER to:', address(v2Perf));

    console2.log('[OK] STEP 6 DIRECTORY SWITCH SUCCEEDED');

    // ──────────────────────────────────────────────────────────────────
    // STEP 7 — MODULE SYNCHRONIZATION
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== STEP 7: MODULE SYNCHRONIZATION ===');

    PortfolioManager pm = PortfolioManager(pmAddr);
    pm.syncModules();
    require(pm.indexToken() == address(v2Token), 'Sync: PM indexToken mismatch');
    console2.log('1. PortfolioManager synced indexToken to V2');

    v2Perf.syncModules();
    require(v2Perf.indexToken() == address(v2Token), 'Sync: Perf indexToken mismatch');
    require(v2Perf.costBasisManager() == address(v2CBM), 'Sync: Perf CBM mismatch');
    console2.log('2. PerformanceManager synced modules to V2');

    console2.log('[OK] STEP 7 MODULE SYNCHRONIZATION SUCCEEDED');

    vm.stopBroadcast();

    // ──────────────────────────────────────────────────────────────────
    // STEP 8 & 9 — POST-MIGRATION READ-ONLY VERIFICATION
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== STEP 8 & 9: LIVE POST-MIGRATION VERIFICATION ===');

    (uint256 postNAV, uint256 postNAVPerShare) = pm.calculateNAV();
    console2.log('Post-Migration Portfolio NAV USD: ', postNAV);
    console2.log('Post-Migration NAV Per Share USD:', postNAVPerShare);
    require(postNAV > 0, 'Post-Migration: Portfolio NAV is 0');
    require(postNAVPerShare > 0, 'Post-Migration: NAV per share is 0');

    uint256 sellerValueUSD = v2Perf.currentValue(SELLER);
    uint256 sellerCapUSD = v2Perf.investedCapital(SELLER);
    int256 sellerNetProfitUSD = v2Perf.netProfit(SELLER);

    console2.log('\nSeller Metrics (Post-Migration):');
    console2.log('  Current Value USD:  ', sellerValueUSD);
    console2.log('  Invested Capital:   ', sellerCapUSD);
    console2.log('  Net Profit USD:     ');
    console2.logInt(sellerNetProfitUSD);

    require(sellerCapUSD == SELLER_COST_BASIS, 'Post-Migration: Seller cap mismatch');

    uint256 buyerValueUSD = v2Perf.currentValue(BUYER);
    uint256 buyerCapUSD = v2Perf.investedCapital(BUYER);
    int256 buyerNetProfitUSD = v2Perf.netProfit(BUYER);

    console2.log('\nBuyer Metrics (Post-Migration):');
    console2.log('  Current Value USD:  ', buyerValueUSD);
    console2.log('  Invested Capital:   ', buyerCapUSD);
    console2.log('  Net Profit USD:     ');
    console2.logInt(buyerNetProfitUSD);

    require(buyerCapUSD == BUYER_COST_BASIS, 'Post-Migration: Buyer cap mismatch');

    console2.log('\n=====================================================');
    console2.log('      LIVE BASE SEPOLIA V2 MIGRATION COMPLETE!');
    console2.log('=====================================================');
    console2.log('UVBEV2:                  ', address(v2Token));
    console2.log('CostBasisManagerV2:      ', address(v2CBM));
    console2.log('P2PEscrowV2:             ', address(v2Escrow));
    console2.log('UnifyVaultController:    ', address(v2Controller));
    console2.log('PerformanceManager:      ', address(v2Perf));
    console2.log('=====================================================');
  }
}
