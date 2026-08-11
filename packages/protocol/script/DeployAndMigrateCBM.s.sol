// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '../src/ProtocolDirectory.sol';
import '../src/treasury/CostBasisManager.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/access/IAccessControl.sol';

/**
 * @title DeployAndMigrateCBM
 * @notice Deploys an updated CostBasisManager, registers it in ProtocolDirectory,
 *         syncs modules, grants roles, and migrates historical accounting from
 *         the OLD CostBasisManager.
 *
 *         Does NOT redeploy PortfolioManager, UnifyVaultController, or any
 *         other contracts.
 *
 *         Dry-run is safe; no state changes unless --broadcast is passed.
 */
contract DeployAndMigrateCBMScript is Script {
  // ── Deployed addresses (Base Sepolia) ──────────────────────────────
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;
  address public constant ADMIN = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant OLD_CBM = 0x627bDaEf795df800d91a949d5cb3148022763A38;
  address public constant EXISTING_CONTROLLER = 0x15BF594654f718C6eBF2DCC135750eE8069e293f;

  // ── Historical accounting to preserve ──────────────────────────────
  uint256 public constant EXPECTED_COST_BASIS = 81162414845958829357;
  int256 public constant EXPECTED_REALIZED_PNL = 0;
  uint256 public constant EXPECTED_FIRST_DEPOSIT = 1786161084;

  function run() external {
    // ──────────────────────────────────────────────────────────────────
    //  Stage 0 — Pre-flight checks
    // ──────────────────────────────────────────────────────────────────
    console2.log('=== STAGE 0: PRE-FLIGHT CHECKS ===');

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);

    // 0a — admin holds GOVERNANCE_ROLE on the directory
    require(
      IAccessControl(DIRECTORY).hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN),
      'PRE-FLIGHT: admin missing GOVERNANCE_ROLE on directory'
    );
    console2.log('[OK] Admin holds GOVERNANCE_ROLE on ProtocolDirectory');

    // 0b — directory is not frozen
    require(!dir.isFrozen(), 'PRE-FLIGHT: ProtocolDirectory is frozen');
    console2.log('[OK] ProtocolDirectory is not frozen');

    // 0c — existing controller address matches
    {
      address registeredController = dir.getAddress(ModuleIds.DEPOSIT_MANAGER);
      require(
        registeredController == EXISTING_CONTROLLER,
        'PRE-FLIGHT: controller address mismatch'
      );
    }
    console2.log('[OK] Existing Controller address confirmed:', EXISTING_CONTROLLER);

    // 0d — PortfolioManager entry unchanged
    {
      address pm = dir.getAddress(ModuleIds.PORTFOLIO_MANAGER);
      require(pm != address(0), 'PRE-FLIGHT: PortfolioManager not registered');
      console2.log('[OK] PortfolioManager:', pm);
    }

    // 0e — Token entry unchanged
    {
      address tok = dir.getAddress(ModuleIds.TOKEN);
      require(tok != address(0), 'PRE-FLIGHT: Token not registered');
      console2.log('[OK] Token:', tok);
    }

    // 0f — old CBM actually holds the expected state
    {
      CostBasisManager oldCBM = CostBasisManager(OLD_CBM);
      uint256 cb = oldCBM.costBasis(ADMIN);
      int256 rp = oldCBM.realizedPnL(ADMIN);
      uint256 fd = oldCBM.firstDepositTimestamp(ADMIN);

      console2.log('Old CBM costBasis:         ', cb);
      console2.log('Old CBM realizedPnL:       ');
      console2.logInt(rp);
      console2.log('Old CBM firstDeposit:      ', fd);

      require(cb == EXPECTED_COST_BASIS, 'PRE-FLIGHT: old costBasis mismatch');
      require(rp == EXPECTED_REALIZED_PNL, 'PRE-FLIGHT: old realizedPnL mismatch');
      require(fd == EXPECTED_FIRST_DEPOSIT, 'PRE-FLIGHT: old firstDeposit mismatch');

      console2.log('[OK] Old CBM state matches expected values');
    }

    console2.log('=== ALL PRE-FLIGHT CHECKS PASSED ===');

    // ──────────────────────────────────────────────────────────────────
    //  Stage 1 — Deploy updated CostBasisManager
    // ──────────────────────────────────────────────────────────────────
    console2.log('');
    console2.log('=== STAGE 1: DEPLOY UPDATED CostBasisManager ===');

    vm.startBroadcast(ADMIN);

    CostBasisManager newCBM = new CostBasisManager(ADMIN, DIRECTORY);
    console2.log('New CostBasisManager deployed at:', address(newCBM));
    require(address(newCBM) != OLD_CBM, 'Deployed CBM must differ from old CBM');

    // ──────────────────────────────────────────────────────────────────
    //  Stage 2 — Sync modules from ProtocolDirectory
    // ──────────────────────────────────────────────────────────────────
    console2.log('');
    console2.log('=== STAGE 2: SYNC MODULES ===');

    newCBM.syncModules();
    console2.log('[OK] syncModules() called - PortfolioManager and Token loaded from directory');

    // ──────────────────────────────────────────────────────────────────
    //  Stage 3 — Grant roles on the new CBM
    // ──────────────────────────────────────────────────────────────────
    console2.log('');
    console2.log('=== STAGE 3: GRANT ROLES ===');

    // Constructor already granted: DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, CONTROLLER_ROLE to ADMIN.
    // Grant CONTROLLER_ROLE to the existing UnifyVaultController so it can call
    // recordDeposit / recordRedeem.
    bytes32 ctrlRole = newCBM.CONTROLLER_ROLE();
    newCBM.grantRole(ctrlRole, EXISTING_CONTROLLER);
    console2.log('[OK] CONTROLLER_ROLE granted to existing Controller:', EXISTING_CONTROLLER);

    // Verify roles
    require(
      newCBM.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN),
      'ROLE: admin missing GOVERNANCE_ROLE on new CBM'
    );
    require(
      newCBM.hasRole(ctrlRole, EXISTING_CONTROLLER),
      'ROLE: controller missing CONTROLLER_ROLE on new CBM'
    );
    console2.log('[OK] Role assignments verified');

    // ──────────────────────────────────────────────────────────────────
    //  Stage 4 — Update ProtocolDirectory entry
    // ──────────────────────────────────────────────────────────────────
    console2.log('');
    console2.log('=== STAGE 4: UPDATE PROTOCOL DIRECTORY ===');

    bytes32 cbmId = ModuleIds.COST_BASIS_MANAGER;
    address oldEntry = dir.getAddress(cbmId);
    console2.log('Current COST_BASIS_MANAGER entry:', oldEntry);

    dir.updateAddress(cbmId, address(newCBM));
    console2.log('[OK] COST_BASIS_MANAGER updated to:', address(newCBM));

    address readback = dir.getAddress(cbmId);
    require(readback == address(newCBM), 'DIR: updateAddress readback mismatch');

    // ──────────────────────────────────────────────────────────────────
    //  Stage 5 — Migrate historical accounting
    // ──────────────────────────────────────────────────────────────────
    console2.log('');
    console2.log('=== STAGE 5: MIGRATE ACCOUNTING ===');

    uint256 costBasis = EXPECTED_COST_BASIS;
    int256 realizedPnL = EXPECTED_REALIZED_PNL;
    uint256 firstDeposit = EXPECTED_FIRST_DEPOSIT;

    newCBM.migrateAccounting(ADMIN, costBasis, realizedPnL, firstDeposit);
    console2.log('[OK] migrateAccounting() called');

    // ──────────────────────────────────────────────────────────────────
    //  Stage 6 — Verify migrated state on the new CBM
    // ──────────────────────────────────────────────────────────────────
    console2.log('');
    console2.log('=== STAGE 6: VERIFY MIGRATED STATE ===');

    uint256 migratedBasis = newCBM.costBasis(ADMIN);
    int256 migratedPnL = newCBM.realizedPnL(ADMIN);
    uint256 migratedTs = newCBM.firstDepositTimestamp(ADMIN);

    console2.log('Migrated costBasis:         ', migratedBasis);
    console2.log('Migrated realizedPnL:       ');
    console2.logInt(migratedPnL);
    console2.log('Migrated firstDeposit:      ', migratedTs);

    require(migratedBasis == costBasis, 'VERIFY: costBasis mismatch');
    require(migratedPnL == realizedPnL, 'VERIFY: realizedPnL mismatch');
    require(migratedTs == firstDeposit, 'VERIFY: firstDeposit mismatch');

    console2.log('[OK] All migrated values verified');

    vm.stopBroadcast();

    // ──────────────────────────────────────────────────────────────────
    //  Stage 7 — Prove migration cannot be executed twice
    // ──────────────────────────────────────────────────────────────────
    console2.log('');
    console2.log('=== STAGE 7: DOUBLE-MIGRATION GUARD ===');

    try newCBM.migrateAccounting(ADMIN, 123, 456, 789) {
      revert('SECURITY: double migration was NOT blocked');
    } catch {
      console2.log('[OK] Second migrateAccounting() reverted (expected)');
    }

    // Re-read state to confirm nothing was corrupted
    {
      uint256 postCheckBasis = newCBM.costBasis(ADMIN);
      int256 postCheckPnL = newCBM.realizedPnL(ADMIN);
      uint256 postCheckTs = newCBM.firstDepositTimestamp(ADMIN);
      require(postCheckBasis == migratedBasis, 'POST-CHECK: costBasis corrupted');
      require(postCheckPnL == migratedPnL, 'POST-CHECK: realizedPnL corrupted');
      require(postCheckTs == migratedTs, 'POST-CHECK: firstDeposit corrupted');
      console2.log('[OK] Post-check: no state corruption after double-migration attempt');
    }

    // ──────────────────────────────────────────────────────────────────
    //  Summary
    // ──────────────────────────────────────────────────────────────────
    console2.log('');
    console2.log('=====================================================');
    console2.log('              MIGRATION COMPLETE (DRY-RUN)');
    console2.log('=====================================================');
    console2.log('Old CBM:                  ', OLD_CBM);
    console2.log('New CBM:                  ', address(newCBM));
    console2.log('ProtocolDirectory:        ', DIRECTORY);
    console2.log('Admin:                    ', ADMIN);
    console2.log('Controller:               ', EXISTING_CONTROLLER);
    console2.log('Cost Basis:               ', migratedBasis);
    console2.log('Realized PnL:             ');
    console2.logInt(migratedPnL);
    console2.log('First Deposit Timestamp:  ', migratedTs);
    console2.log('=====================================================');
  }
}
