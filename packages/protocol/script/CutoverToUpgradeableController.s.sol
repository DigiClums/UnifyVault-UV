// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from 'forge-std/Script.sol';
import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { CustodyVault } from '../src/vault/CustodyVault.sol';
import { Treasury } from '../src/vault/Treasury.sol';
import { UVBEV2 } from '../src/token/UVBEV2.sol';
import { CostBasisManagerV2 } from '../src/treasury/CostBasisManagerV2.sol';
import { LiquidityManager } from '../src/vault/LiquidityManager.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';
import { ModuleIds } from '../src/constants/ModuleIds.sol';

interface VmExt {
  function envOr(
    string calldata key,
    string calldata defaultValue
  ) external view returns (string memory);
  function parseAddress(string calldata stringifiedAddress) external pure returns (address);
}

/**
 * @title CutoverToUpgradeableControllerScript
 * @notice Dedicated migration cutover script to switch UnifyVault V2 routing to the new UUPS Proxy.
 * @dev EXPLICIT EXECUTION ONLY. Must NOT be triggered during initial deployment.
 *      1. Preflight verifies Proxy has healthy CONTROLLER_ROLEs.
 *      2. Updates ProtocolDirectory for DEPOSIT_MANAGER and REDEEM_MANAGER to point to the Proxy.
 *      3. Revokes CONTROLLER_ROLE from the legacy immutable controller.
 *      4. Validates final protocol routing and role state.
 */
contract CutoverToUpgradeableControllerScript is Script {
  uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

  // Canonical Base Sepolia addresses
  address public constant BASE_SEPOLIA_DIRECTORY = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant BASE_SEPOLIA_VAULT = 0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0;
  address public constant BASE_SEPOLIA_TREASURY = 0xB8c8113a042f39936dD966A5983fAaE2bF7b7290;
  address public constant BASE_SEPOLIA_TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant BASE_SEPOLIA_COST_BASIS_MANAGER =
    0x57869372AFbd7b61752f2f8d3e7F37701e28517B;
  address public constant BASE_SEPOLIA_LIQUIDITY_MANAGER =
    0xd1DCd311ACD1176E35823360652FCb356a7F227F;
  address public constant BASE_SEPOLIA_LEGACY_CONTROLLER =
    0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;
  address public constant BASE_SEPOLIA_ADMIN = 0xd905920c91853039060246Ed5724AA72B91a96DA;

  struct CutoverParams {
    address proxy;
    address legacyController;
    address directory;
    address vault;
    address treasury;
    address token;
    address costBasisManager;
    address liquidityManager;
    address admin;
  }

  function run() external {
    address proxyAddr = address(0);
    try VmExt(address(vm)).envOr('CONTROLLER_PROXY', '') returns (string memory pStr) {
      if (bytes(pStr).length > 0) {
        proxyAddr = VmExt(address(vm)).parseAddress(pStr);
      }
    } catch {}

    require(proxyAddr != address(0), 'ENV: CONTROLLER_PROXY address required');

    CutoverParams memory params = CutoverParams({
      proxy: proxyAddr,
      legacyController: BASE_SEPOLIA_LEGACY_CONTROLLER,
      directory: BASE_SEPOLIA_DIRECTORY,
      vault: BASE_SEPOLIA_VAULT,
      treasury: BASE_SEPOLIA_TREASURY,
      token: BASE_SEPOLIA_TOKEN,
      costBasisManager: BASE_SEPOLIA_COST_BASIS_MANAGER,
      liquidityManager: BASE_SEPOLIA_LIQUIDITY_MANAGER,
      admin: BASE_SEPOLIA_ADMIN
    });

    vm.startBroadcast();
    executeCutover(params);
    vm.stopBroadcast();
  }

  function run(address proxyAddr) external {
    require(proxyAddr != address(0), 'PARAM: proxyAddr cannot be zero');

    CutoverParams memory params = CutoverParams({
      proxy: proxyAddr,
      legacyController: BASE_SEPOLIA_LEGACY_CONTROLLER,
      directory: BASE_SEPOLIA_DIRECTORY,
      vault: BASE_SEPOLIA_VAULT,
      treasury: BASE_SEPOLIA_TREASURY,
      token: BASE_SEPOLIA_TOKEN,
      costBasisManager: BASE_SEPOLIA_COST_BASIS_MANAGER,
      liquidityManager: BASE_SEPOLIA_LIQUIDITY_MANAGER,
      admin: BASE_SEPOLIA_ADMIN
    });

    vm.startBroadcast();
    executeCutover(params);
    vm.stopBroadcast();
  }

  /**
   * @notice Core cutover routine callable by scripts and test harnesses
   */
  function executeCutover(CutoverParams memory params) public {
    console2.log('===============================================================');
    console2.log('  EXECUTING UNIFYVAULT CONTROLLER MIGRATION CUTOVER');
    console2.log('===============================================================');
    console2.log('New Proxy Address:      ', params.proxy);
    console2.log('Legacy Controller:      ', params.legacyController);
    console2.log('Protocol Directory:     ', params.directory);

    bytes32 ctrlRole = AccessRoles.CONTROLLER_ROLE;

    // -----------------------------------------------------------------
    // STEP 1: Pre-Cutover Verification
    // -----------------------------------------------------------------
    require(params.proxy != address(0) && params.proxy.code.length > 0, 'PREFLIGHT: Invalid proxy');
    require(
      CustodyVault(params.vault).hasRole(ctrlRole, params.proxy),
      'PREFLIGHT: Proxy missing Vault CONTROLLER_ROLE'
    );
    require(
      Treasury(payable(params.treasury)).hasRole(ctrlRole, params.proxy),
      'PREFLIGHT: Proxy missing Treasury CONTROLLER_ROLE'
    );
    require(
      UVBEV2(params.token).hasRole(ctrlRole, params.proxy),
      'PREFLIGHT: Proxy missing Token CONTROLLER_ROLE'
    );
    require(
      CostBasisManagerV2(params.costBasisManager).hasRole(ctrlRole, params.proxy),
      'PREFLIGHT: Proxy missing CBM CONTROLLER_ROLE'
    );
    console2.log('[OK] STEP 1: Pre-cutover role verification passed');

    // -----------------------------------------------------------------
    // STEP 2: Update ProtocolDirectory Module Routing
    // -----------------------------------------------------------------
    ProtocolDirectory dir = ProtocolDirectory(params.directory);

    // 2.1 DepositManager
    if (dir.exists(ModuleIds.DEPOSIT_MANAGER)) {
      dir.updateAddress(ModuleIds.DEPOSIT_MANAGER, params.proxy);
      console2.log('ProtocolDirectory DEPOSIT_MANAGER updated to:', params.proxy);
    } else {
      dir.registerAddress(ModuleIds.DEPOSIT_MANAGER, params.proxy);
      console2.log('ProtocolDirectory DEPOSIT_MANAGER registered to:', params.proxy);
    }

    // 2.2 RedeemManager
    if (dir.exists(ModuleIds.REDEEM_MANAGER)) {
      dir.updateAddress(ModuleIds.REDEEM_MANAGER, params.proxy);
      console2.log('ProtocolDirectory REDEEM_MANAGER updated to:', params.proxy);
    } else {
      dir.registerAddress(ModuleIds.REDEEM_MANAGER, params.proxy);
      console2.log('ProtocolDirectory REDEEM_MANAGER registered to:', params.proxy);
    }

    require(
      dir.getAddress(ModuleIds.DEPOSIT_MANAGER) == params.proxy,
      'CUTOVER: Directory DEPOSIT_MANAGER mismatch'
    );
    require(
      dir.getAddress(ModuleIds.REDEEM_MANAGER) == params.proxy,
      'CUTOVER: Directory REDEEM_MANAGER mismatch'
    );
    console2.log('[OK] STEP 2: ProtocolDirectory successfully updated to Proxy');

    // -----------------------------------------------------------------
    // STEP 3: Revoke Legacy Controller Roles
    // -----------------------------------------------------------------
    if (params.legacyController != address(0) && params.legacyController.code.length > 0) {
      CustodyVault(params.vault).revokeRole(ctrlRole, params.legacyController);
      Treasury(payable(params.treasury)).revokeRole(ctrlRole, params.legacyController);
      UVBEV2(params.token).revokeRole(ctrlRole, params.legacyController);
      CostBasisManagerV2(params.costBasisManager).revokeRole(ctrlRole, params.legacyController);
      LiquidityManager(params.liquidityManager).revokeRole(ctrlRole, params.legacyController);

      require(
        !CustodyVault(params.vault).hasRole(ctrlRole, params.legacyController),
        'REVOKE: Vault legacy role not revoked'
      );
      require(
        !Treasury(payable(params.treasury)).hasRole(ctrlRole, params.legacyController),
        'REVOKE: Treasury legacy role not revoked'
      );
      require(
        !UVBEV2(params.token).hasRole(ctrlRole, params.legacyController),
        'REVOKE: Token legacy role not revoked'
      );
      require(
        !CostBasisManagerV2(params.costBasisManager).hasRole(ctrlRole, params.legacyController),
        'REVOKE: CBM legacy role not revoked'
      );
      console2.log('[OK] STEP 3: Legacy controller CONTROLLER_ROLEs successfully revoked');
    }

    console2.log('===============================================================');
    console2.log('[SUCCESS] MIGRATION CUTOVER COMPLETE');
    console2.log('===============================================================');
  }
}
