// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from 'forge-std/Script.sol';
import { ERC1967Proxy } from '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
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

/**
 * @title DeployUnifyVaultControllerUUPSScript
 * @notice Production-grade deployment script for UnifyVaultControllerUpgradeable behind an ERC1967Proxy.
 * @dev Deploys the implementation, deploys & initializes the ERC1967Proxy, grants required downstream
 *      roles to the Proxy address, verifies role invariants, and logs cutover instructions.
 *
 *      IMPORTANT SAFETY INVARIANTS:
 *      1. The Implementation contract is permanently locked via _disableInitializers().
 *      2. The Implementation contract is granted ZERO protocol roles.
 *      3. The Proxy contract is granted CONTROLLER_ROLE on CustodyVault, Treasury, UVBEV2, CostBasisManagerV2, and LiquidityManager.
 *      4. Legacy controller roles are NOT revoked by this deployment script.
 *      5. ProtocolDirectory is NOT switched by this deployment script (switched in CutoverToUpgradeableController.s.sol).
 */
contract DeployUnifyVaultControllerUUPSScript is Script {
  uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

  // ERC1967 implementation storage slot: bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
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

  struct DeploymentParams {
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

  struct DeploymentResult {
    UnifyVaultControllerUpgradeable implementation;
    ERC1967Proxy proxy;
    UnifyVaultControllerUpgradeable controller;
    bytes initData;
  }

  function run() external returns (DeploymentResult memory result) {
    address deployer = msg.sender;
    console2.log('===============================================================');
    console2.log('  UNIFYVAULT CONTROLLER UUPS DEPLOYMENT (BASE SEPOLIA)');
    console2.log('===============================================================');
    console2.log('Deployer Address:    ', deployer);
    console2.log('Chain ID:            ', block.chainid);

    DeploymentParams memory params = DeploymentParams({
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

    if (block.chainid != BASE_SEPOLIA_CHAIN_ID && deployer != address(0)) {
      params.admin = deployer;
    }

    vm.startBroadcast();
    result = deployAndWire(params);
    vm.stopBroadcast();

    _printManifest(result, params);
  }

  /**
   * @notice Core deployment & wiring routine callable by scripts and test harnesses
   */
  function deployAndWire(
    DeploymentParams memory params
  ) public returns (DeploymentResult memory result) {
    // -----------------------------------------------------------------
    // PREFLIGHT: Dependency validation
    // -----------------------------------------------------------------
    require(params.admin != address(0), 'PREFLIGHT: admin zero');
    require(params.directory.code.length > 0, 'PREFLIGHT: directory has no code');
    require(params.oracle.code.length > 0, 'PREFLIGHT: oracle has no code');
    require(params.vault.code.length > 0, 'PREFLIGHT: vault has no code');
    require(params.treasury.code.length > 0, 'PREFLIGHT: treasury has no code');
    require(params.token.code.length > 0, 'PREFLIGHT: token has no code');
    require(params.costBasisManager.code.length > 0, 'PREFLIGHT: cbm has no code');
    require(params.liquidityManager.code.length > 0, 'PREFLIGHT: liquidity has no code');

    console2.log('[OK] PREFLIGHT: All dependency contracts verified');

    // -----------------------------------------------------------------
    // STEP 1: Deploy Implementation
    // -----------------------------------------------------------------
    result.implementation = new UnifyVaultControllerUpgradeable();
    require(address(result.implementation).code.length > 0, 'DEPLOY: implementation empty');
    console2.log('[OK] STEP 1: Implementation deployed at:', address(result.implementation));

    // -----------------------------------------------------------------
    // STEP 2: Encode Calldata & Deploy ERC1967Proxy
    // -----------------------------------------------------------------
    result.initData = abi.encodeWithSelector(
      UnifyVaultControllerUpgradeable.initialize.selector,
      params.admin,
      params.directory,
      params.oracle,
      params.vault,
      params.treasury,
      params.token
    );

    result.proxy = new ERC1967Proxy(address(result.implementation), result.initData);
    require(address(result.proxy).code.length > 0, 'DEPLOY: proxy empty');
    result.controller = UnifyVaultControllerUpgradeable(address(result.proxy));
    console2.log('[OK] STEP 2: ERC1967Proxy deployed at:    ', address(result.proxy));

    // -----------------------------------------------------------------
    // STEP 3: Verify Proxy State & Invariants
    // -----------------------------------------------------------------
    // 3.1 Verify implementation slot
    bytes32 rawImplSlot = vm.load(address(result.proxy), ERC1967_IMPLEMENTATION_SLOT);
    address storedImpl = address(uint160(uint256(rawImplSlot)));
    require(storedImpl == address(result.implementation), 'VERIFY: proxy implementation mismatch');

    // 3.2 Verify initialized storage pointers
    require(result.controller.directory() == params.directory, 'VERIFY: directory mismatch');
    require(result.controller.oracle() == params.oracle, 'VERIFY: oracle mismatch');
    require(result.controller.vault() == params.vault, 'VERIFY: vault mismatch');
    require(result.controller.treasury() == params.treasury, 'VERIFY: treasury mismatch');
    require(result.controller.token() == params.token, 'VERIFY: token mismatch');

    // 3.3 Verify default configurations
    require(result.controller.swapSlippageBps() == 100, 'VERIFY: default slippage mismatch');
    require(result.controller.maxDepositPerTx() == type(uint256).max, 'VERIFY: max deposit');
    require(result.controller.maxRedeemPerTx() == type(uint256).max, 'VERIFY: max redeem');
    require(!result.controller.paused(), 'VERIFY: controller paused on init');

    // 3.4 Verify roles on the Proxy
    require(
      result.controller.hasRole(result.controller.DEFAULT_ADMIN_ROLE(), params.admin),
      'VERIFY: admin role missing on proxy'
    );
    require(
      result.controller.hasRole(AccessRoles.GOVERNANCE_ROLE, params.admin),
      'VERIFY: gov role missing on proxy'
    );
    require(
      result.controller.hasRole(result.controller.GUARDIAN_ROLE(), params.admin),
      'VERIFY: guardian role missing on proxy'
    );
    require(
      result.controller.hasRole(result.controller.BOT_ROLE(), params.admin),
      'VERIFY: bot role missing on proxy'
    );

    console2.log('[OK] STEP 3: Proxy initialization and storage invariants verified');

    // -----------------------------------------------------------------
    // STEP 4: Wire Downstream Protocol Roles to the Proxy Address
    // -----------------------------------------------------------------
    bytes32 controllerRole = AccessRoles.CONTROLLER_ROLE;

    // 4.1 CustodyVault
    CustodyVault(params.vault).grantRole(controllerRole, address(result.proxy));
    require(
      CustodyVault(params.vault).hasRole(controllerRole, address(result.proxy)),
      'ROLE: vault grant failed'
    );

    // 4.2 Treasury
    Treasury(payable(params.treasury)).grantRole(controllerRole, address(result.proxy));
    require(
      Treasury(payable(params.treasury)).hasRole(controllerRole, address(result.proxy)),
      'ROLE: treasury grant failed'
    );

    // 4.3 UVBEV2 Index Token
    UVBEV2(params.token).grantRole(controllerRole, address(result.proxy));
    require(
      UVBEV2(params.token).hasRole(controllerRole, address(result.proxy)),
      'ROLE: token grant failed'
    );

    // 4.4 CostBasisManagerV2
    CostBasisManagerV2(params.costBasisManager).grantRole(controllerRole, address(result.proxy));
    require(
      CostBasisManagerV2(params.costBasisManager).hasRole(controllerRole, address(result.proxy)),
      'ROLE: cbm grant failed'
    );

    // 4.5 LiquidityManager
    LiquidityManager(params.liquidityManager).grantRole(controllerRole, address(result.proxy));
    require(
      LiquidityManager(params.liquidityManager).hasRole(controllerRole, address(result.proxy)),
      'ROLE: liquidity grant failed'
    );

    console2.log('[OK] STEP 4: CONTROLLER_ROLE granted to Proxy across all modules');

    // -----------------------------------------------------------------
    // STEP 5: Critical Safety Checks
    // -----------------------------------------------------------------
    // 5.1 Verify Implementation has ZERO protocol roles
    require(
      !CustodyVault(params.vault).hasRole(controllerRole, address(result.implementation)),
      'SAFETY: implementation holds vault role'
    );
    require(
      !Treasury(payable(params.treasury)).hasRole(controllerRole, address(result.implementation)),
      'SAFETY: implementation holds treasury role'
    );
    require(
      !UVBEV2(params.token).hasRole(controllerRole, address(result.implementation)),
      'SAFETY: implementation holds token role'
    );
    require(
      !CostBasisManagerV2(params.costBasisManager).hasRole(
        controllerRole,
        address(result.implementation)
      ),
      'SAFETY: implementation holds cbm role'
    );

    // 5.2 Verify Legacy Controller roles remain intact (NO accidental revocation)
    if (params.legacyController != address(0) && params.legacyController.code.length > 0) {
      require(
        CustodyVault(params.vault).hasRole(controllerRole, params.legacyController),
        'SAFETY: legacy vault role prematurely revoked'
      );
      require(
        UVBEV2(params.token).hasRole(controllerRole, params.legacyController),
        'SAFETY: legacy token role prematurely revoked'
      );
      console2.log('[OK] STEP 5: Legacy controller roles intact; Implementation holds zero roles');
    }
  }

  function _printManifest(
    DeploymentResult memory result,
    DeploymentParams memory params
  ) internal view {
    console2.log('');
    console2.log('===============================================================');
    console2.log('  DEPLOYMENT MANIFEST & VERIFICATION SUMMARY');
    console2.log('===============================================================');
    console2.log('Implementation Address: ', address(result.implementation));
    console2.log('ERC1967 Proxy Address:  ', address(result.proxy));
    console2.log('Admin Address:          ', params.admin);
    console2.log('Directory Address:      ', params.directory);
    console2.log('Oracle Address:         ', params.oracle);
    console2.log('Vault Address:          ', params.vault);
    console2.log('Treasury Address:       ', params.treasury);
    console2.log('Token Address:          ', params.token);
    console2.log('CostBasisManager:       ', params.costBasisManager);
    console2.log('LiquidityManager:       ', params.liquidityManager);
    console2.log('Legacy Controller:      ', params.legacyController);
    console2.log('===============================================================');
    console2.log('NEXT ACTIONS:');
    console2.log('1. Run VerifyUnifyVaultControllerUUPS.s.sol to confirm all invariants.');
    console2.log('2. Perform smoke test deposits/redemptions against the new Proxy.');
    console2.log('3. Run CutoverToUpgradeableController.s.sol to update ProtocolDirectory');
    console2.log('   and revoke legacy controller roles.');
    console2.log('===============================================================');
  }
}
