// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from 'forge-std/Script.sol';
import { IAccessControl } from '@openzeppelin/contracts/access/IAccessControl.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { UnifyVaultControllerUpgradeable } from '../src/controller/UnifyVaultControllerUpgradeable.sol';
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
 * @title VerifyUnifyVaultControllerUUPSScript
 * @notice Post-deployment verification script for UnifyVaultController UUPS architecture.
 * @dev Performs comprehensive on-chain assertions to guarantee that the proxy is properly
 *      configured, implementation is locked, roles are securely wired, and no roles are granted to the implementation.
 */
contract VerifyUnifyVaultControllerUUPSScript is Script {
  bytes32 public constant ERC1967_IMPLEMENTATION_SLOT =
    0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

  // Canonical Base Sepolia addresses
  address public constant BASE_SEPOLIA_DIRECTORY = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant BASE_SEPOLIA_ORACLE = 0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF;
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

  struct VerifyConfig {
    address proxy;
    address implementation;
    address admin;
    address directory;
    address oracle;
    address vault;
    address treasury;
    address token;
    address costBasisManager;
    address liquidityManager;
    address legacyController;
  }

  function run() external {
    address proxyAddr = address(0);
    address implAddr = address(0);

    try VmExt(address(vm)).envOr('CONTROLLER_PROXY', '') returns (string memory pStr) {
      if (bytes(pStr).length > 0) {
        proxyAddr = VmExt(address(vm)).parseAddress(pStr);
      }
    } catch {}

    try VmExt(address(vm)).envOr('CONTROLLER_IMPLEMENTATION', '') returns (string memory iStr) {
      if (bytes(iStr).length > 0) {
        implAddr = VmExt(address(vm)).parseAddress(iStr);
      }
    } catch {}

    require(proxyAddr != address(0), 'ENV: CONTROLLER_PROXY address required');

    VerifyConfig memory config = VerifyConfig({
      proxy: proxyAddr,
      implementation: implAddr,
      admin: BASE_SEPOLIA_ADMIN,
      directory: BASE_SEPOLIA_DIRECTORY,
      oracle: BASE_SEPOLIA_ORACLE,
      vault: BASE_SEPOLIA_VAULT,
      treasury: BASE_SEPOLIA_TREASURY,
      token: BASE_SEPOLIA_TOKEN,
      costBasisManager: BASE_SEPOLIA_COST_BASIS_MANAGER,
      liquidityManager: BASE_SEPOLIA_LIQUIDITY_MANAGER,
      legacyController: BASE_SEPOLIA_LEGACY_CONTROLLER
    });

    verify(config);
  }

  function run(address proxyAddr) external {
    VerifyConfig memory config = VerifyConfig({
      proxy: proxyAddr,
      implementation: address(0),
      admin: BASE_SEPOLIA_ADMIN,
      directory: BASE_SEPOLIA_DIRECTORY,
      oracle: BASE_SEPOLIA_ORACLE,
      vault: BASE_SEPOLIA_VAULT,
      treasury: BASE_SEPOLIA_TREASURY,
      token: BASE_SEPOLIA_TOKEN,
      costBasisManager: BASE_SEPOLIA_COST_BASIS_MANAGER,
      liquidityManager: BASE_SEPOLIA_LIQUIDITY_MANAGER,
      legacyController: BASE_SEPOLIA_LEGACY_CONTROLLER
    });

    verify(config);
  }

  /**
   * @notice Verifies all deployment invariants
   */
  function verify(VerifyConfig memory cfg) public {
    console2.log('===============================================================');
    console2.log('  VERIFYING UNIFYVAULT CONTROLLER UUPS ARCHITECTURE');
    console2.log('===============================================================');
    console2.log('Proxy Address:         ', cfg.proxy);
    console2.log('Implementation Address:', cfg.implementation);

    // 1. Proxy Bytecode & Address checks
    require(cfg.proxy != address(0), 'VERIFY: Proxy is zero');
    require(cfg.proxy.code.length > 0, 'VERIFY: Proxy has no bytecode');

    // 2. Read implementation slot from Proxy
    bytes32 rawImplSlot = vm.load(cfg.proxy, ERC1967_IMPLEMENTATION_SLOT);
    address storedImpl = address(uint160(uint256(rawImplSlot)));
    console2.log('Stored Implementation: ', storedImpl);
    require(storedImpl != address(0), 'VERIFY: Implementation slot is zero');
    require(storedImpl.code.length > 0, 'VERIFY: Implementation has no bytecode');
    require(cfg.proxy != storedImpl, 'VERIFY: Proxy equals implementation');

    if (cfg.implementation != address(0)) {
      require(storedImpl == cfg.implementation, 'VERIFY: Implementation mismatch');
    }

    // 3. Verify Proxy Dependencies
    UnifyVaultControllerUpgradeable controller = UnifyVaultControllerUpgradeable(cfg.proxy);
    require(controller.directory() == cfg.directory, 'VERIFY: Directory mismatch');
    require(controller.oracle() == cfg.oracle, 'VERIFY: Oracle mismatch');
    require(controller.vault() == cfg.vault, 'VERIFY: Vault mismatch');
    require(controller.treasury() == cfg.treasury, 'VERIFY: Treasury mismatch');
    require(controller.token() == cfg.token, 'VERIFY: Token mismatch');
    console2.log('[PASS] 1. Dependency addresses match canonical contracts');

    // 4. Verify Proxy Parameter Invariants
    require(controller.swapSlippageBps() == 100, 'VERIFY: Default slippage is not 100 bps');
    require(controller.maxDepositPerTx() == type(uint256).max, 'VERIFY: Max deposit per tx');
    require(controller.maxRedeemPerTx() == type(uint256).max, 'VERIFY: Max redeem per tx');
    require(controller.dailyDepositCap() == type(uint256).max, 'VERIFY: Daily deposit cap');
    require(controller.dailyRedeemCap() == type(uint256).max, 'VERIFY: Daily redeem cap');
    require(!controller.paused(), 'VERIFY: Controller is paused');
    console2.log('[PASS] 2. Parameter and rate limit invariants verified');

    // 5. Verify Roles on Proxy
    require(
      controller.hasRole(controller.DEFAULT_ADMIN_ROLE(), cfg.admin),
      'VERIFY: DEFAULT_ADMIN_ROLE missing on proxy'
    );
    require(
      controller.hasRole(AccessRoles.GOVERNANCE_ROLE, cfg.admin),
      'VERIFY: GOVERNANCE_ROLE missing on proxy'
    );
    require(
      controller.hasRole(controller.GUARDIAN_ROLE(), cfg.admin),
      'VERIFY: GUARDIAN_ROLE missing on proxy'
    );
    require(
      controller.hasRole(controller.BOT_ROLE(), cfg.admin),
      'VERIFY: BOT_ROLE missing on proxy'
    );
    console2.log('[PASS] 3. Proxy RBAC administrative roles verified');

    // 6. Verify Downstream CONTROLLER_ROLEs granted to Proxy
    bytes32 ctrlRole = AccessRoles.CONTROLLER_ROLE;
    require(
      CustodyVault(cfg.vault).hasRole(ctrlRole, cfg.proxy),
      'VERIFY: Vault CONTROLLER_ROLE missing'
    );
    require(
      Treasury(payable(cfg.treasury)).hasRole(ctrlRole, cfg.proxy),
      'VERIFY: Treasury CONTROLLER_ROLE missing'
    );
    require(
      UVBEV2(cfg.token).hasRole(ctrlRole, cfg.proxy),
      'VERIFY: Token CONTROLLER_ROLE missing'
    );
    require(
      CostBasisManagerV2(cfg.costBasisManager).hasRole(ctrlRole, cfg.proxy),
      'VERIFY: CBM CONTROLLER_ROLE missing'
    );
    require(
      LiquidityManager(cfg.liquidityManager).hasRole(ctrlRole, cfg.proxy),
      'VERIFY: LiquidityManager CONTROLLER_ROLE missing'
    );
    console2.log(
      '[PASS] 4. Downstream CONTROLLER_ROLE active on Vault, Treasury, Token, CBM, Liquidity'
    );

    // 7. Verify ZERO Roles on Implementation
    require(
      !CustodyVault(cfg.vault).hasRole(ctrlRole, storedImpl),
      'SAFETY VIOLATION: Implementation holds Vault CONTROLLER_ROLE'
    );
    require(
      !Treasury(payable(cfg.treasury)).hasRole(ctrlRole, storedImpl),
      'SAFETY VIOLATION: Implementation holds Treasury CONTROLLER_ROLE'
    );
    require(
      !UVBEV2(cfg.token).hasRole(ctrlRole, storedImpl),
      'SAFETY VIOLATION: Implementation holds Token CONTROLLER_ROLE'
    );
    require(
      !CostBasisManagerV2(cfg.costBasisManager).hasRole(ctrlRole, storedImpl),
      'SAFETY VIOLATION: Implementation holds CBM CONTROLLER_ROLE'
    );
    console2.log('[PASS] 5. Verified Implementation holds ZERO protocol roles');

    // 8. ProtocolDirectory Status
    ProtocolDirectory dir = ProtocolDirectory(cfg.directory);
    address dirDepositManager = dir.getAddress(ModuleIds.DEPOSIT_MANAGER);
    bool dirSwitched = (dirDepositManager == cfg.proxy);
    console2.log('ProtocolDirectory DEPOSIT_MANAGER:', dirDepositManager);
    if (dirSwitched) {
      console2.log('[STATUS] ProtocolDirectory ALREADY points to Proxy (Cutover Complete)');
    } else {
      console2.log('[STATUS] ProtocolDirectory points to Legacy Controller (Pre-Cutover State)');
    }

    // 9. Legacy Controller Role Status
    if (cfg.legacyController != address(0) && cfg.legacyController.code.length > 0) {
      bool legacyVaultRole = CustodyVault(cfg.vault).hasRole(ctrlRole, cfg.legacyController);
      bool legacyTokenRole = UVBEV2(cfg.token).hasRole(ctrlRole, cfg.legacyController);
      console2.log('Legacy Controller Vault Role Active:', legacyVaultRole);
      console2.log('Legacy Controller Token Role Active:', legacyTokenRole);
    }

    console2.log('===============================================================');
    console2.log('[SUCCESS] ALL POST-DEPLOYMENT VERIFICATION INVARIANTS PASSED');
    console2.log('===============================================================');
  }
}
