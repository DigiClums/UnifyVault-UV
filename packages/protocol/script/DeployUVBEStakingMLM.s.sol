// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { IUVBEStakingMLM } from '../src/interfaces/IUVBEStakingMLM.sol';
import { UVBERewardReserve } from '../src/staking/UVBERewardReserve.sol';
import { UVBEStakingVault } from '../src/staking/UVBEStakingVault.sol';
import { UVBEReferralRegistry } from '../src/staking/UVBEReferralRegistry.sol';
import { UVBERewardDistributor } from '../src/staking/UVBERewardDistributor.sol';
import { UVBEV2 } from '../src/token/UVBEV2.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';

/**
 * @title DeployUVBEStakingMLMScript
 * @notice Deterministic deployment, one-time module mesh binding, and complete Timelock/Guardian role handover
 *         for the permanent UVBE Staking & MLM subsystem on Base Sepolia.
 */
contract DeployUVBEStakingMLMScript is Script {
  uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

  // Canonical Base Sepolia Addresses (Verified On-Chain)
  address public constant BASE_SEPOLIA_UVBE = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant BASE_SEPOLIA_TIMELOCK = 0x9094145Cd2AEA2f309eDf14237444a07edF98d02;

  UVBERewardReserve public reserve;
  UVBEStakingVault public vault;
  UVBEReferralRegistry public registry;
  UVBERewardDistributor public distributor;

  function run() external {
    address deployer = msg.sender;
    address genesisReferrer = deployer;
    address timelock = BASE_SEPOLIA_TIMELOCK;
    address guardian = BASE_SEPOLIA_TIMELOCK; // Canonical default guardian on Base Sepolia

    console.log('======================================================');
    console.log('  UVBE PERMANENT STAKING MLM DEPLOYMENT & HANDOVER');
    console.log('======================================================');
    console.log('Chain ID:           ', block.chainid);
    console.log('Deployer (Initial): ', deployer);
    console.log('Genesis Referrer:   ', genesisReferrer);
    console.log('Canonical UVBE:     ', BASE_SEPOLIA_UVBE);
    console.log('Timelock Controller:', timelock);
    console.log('Guardian Address:   ', guardian);

    vm.startBroadcast();

    // ---------------------------------------------------------------
    // STEP 1 — Deploy all 4 Subsystem Contracts
    // ---------------------------------------------------------------
    reserve = new UVBERewardReserve(deployer, BASE_SEPOLIA_UVBE);
    console.log('1. UVBERewardReserve deployed at:   ', address(reserve));

    vault = new UVBEStakingVault(deployer, BASE_SEPOLIA_UVBE);
    console.log('2. UVBEStakingVault deployed at:     ', address(vault));

    registry = new UVBEReferralRegistry(deployer, genesisReferrer);
    console.log('3. UVBEReferralRegistry deployed at: ', address(registry));

    distributor = new UVBERewardDistributor(deployer, BASE_SEPOLIA_UVBE);
    console.log('4. UVBERewardDistributor deployed at:', address(distributor));

    // ---------------------------------------------------------------
    // STEP 2 — One-Time Immutable Module Mesh Wiring
    // ---------------------------------------------------------------
    reserve.setDistributor(address(distributor));
    vault.setModules(address(registry), address(distributor));
    registry.setModules(address(vault), address(distributor));
    distributor.setModules(address(reserve), address(vault), address(registry));
    console.log('Module mesh successfully wired and permanently frozen.');

    // ---------------------------------------------------------------
    // STEP 3 — Grant Roles to Timelock & Guardian
    // ---------------------------------------------------------------
    reserve.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, timelock);
    reserve.grantRole(AccessRoles.GOVERNANCE_ROLE, timelock);
    reserve.grantRole(AccessRoles.GUARDIAN_ROLE, guardian);

    vault.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, timelock);
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, timelock);
    vault.grantRole(AccessRoles.GUARDIAN_ROLE, guardian);

    registry.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, timelock);
    registry.grantRole(AccessRoles.GOVERNANCE_ROLE, timelock);

    distributor.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, timelock);
    distributor.grantRole(AccessRoles.GOVERNANCE_ROLE, timelock);
    distributor.grantRole(AccessRoles.GUARDIAN_ROLE, guardian);
    console.log('Administrative, Governance, and Guardian roles granted to Timelock/Guardian.');

    // ---------------------------------------------------------------
    // STEP 4 — Renounce All Deployer Roles (Zero Lingering Privileges)
    // ---------------------------------------------------------------
    reserve.renounceRole(AccessRoles.GUARDIAN_ROLE, deployer);
    reserve.renounceRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    reserve.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);

    vault.renounceRole(AccessRoles.GUARDIAN_ROLE, deployer);
    vault.renounceRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    vault.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);

    registry.renounceRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    registry.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);

    distributor.renounceRole(AccessRoles.GUARDIAN_ROLE, deployer);
    distributor.renounceRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    distributor.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);
    console.log('All deployer roles permanently renounced.');

    vm.stopBroadcast();

    // ---------------------------------------------------------------
    // STEP 5 — Post-Deployment & Post-Handover State Invariant Verification
    // ---------------------------------------------------------------
    _verifyDeployment(deployer, timelock, guardian, genesisReferrer);
  }

  function _verifyDeployment(
    address deployer,
    address timelock,
    address guardian,
    address genesisReferrer
  ) internal view {
    // 1. Module Pointer Verification
    require(reserve.distributor() == address(distributor), 'Reserve distributor mismatch');
    require(vault.registry() == address(registry), 'Vault registry mismatch');
    require(vault.distributor() == address(distributor), 'Vault distributor mismatch');
    require(registry.vault() == address(vault), 'Registry vault mismatch');
    require(registry.distributor() == address(distributor), 'Registry distributor mismatch');
    require(distributor.reserve() == address(reserve), 'Distributor reserve mismatch');
    require(distributor.vault() == address(vault), 'Distributor vault mismatch');
    require(distributor.registry() == address(registry), 'Distributor registry mismatch');

    // 2. Economic & Protocol Constant Verification
    require(distributor.RECURRING_ANNUAL_BPS() == 1800, 'Invalid recurring rate');
    require(distributor.SECONDS_PER_YEAR() == 31536000, 'Invalid year seconds');
    require(vault.MIN_STAKE() == 50 * 1e18, 'Invalid min stake');
    require(vault.MAX_STAKE() == 100_000 * 1e18, 'Invalid max stake');
    require(registry.genesisReferrer() == genesisReferrer, 'Genesis referrer mismatch');

    // 3. Zero Lingering Deployer Role Verification
    require(
      !reserve.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer),
      'Deployer still admin on reserve'
    );
    require(
      !reserve.hasRole(AccessRoles.GOVERNANCE_ROLE, deployer),
      'Deployer still governance on reserve'
    );
    require(
      !reserve.hasRole(AccessRoles.GUARDIAN_ROLE, deployer),
      'Deployer still guardian on reserve'
    );

    require(
      !vault.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer),
      'Deployer still admin on vault'
    );
    require(
      !vault.hasRole(AccessRoles.GOVERNANCE_ROLE, deployer),
      'Deployer still governance on vault'
    );
    require(
      !vault.hasRole(AccessRoles.GUARDIAN_ROLE, deployer),
      'Deployer still guardian on vault'
    );

    require(
      !registry.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer),
      'Deployer still admin on registry'
    );
    require(
      !registry.hasRole(AccessRoles.GOVERNANCE_ROLE, deployer),
      'Deployer still governance on registry'
    );

    require(
      !distributor.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer),
      'Deployer still admin on distributor'
    );
    require(
      !distributor.hasRole(AccessRoles.GOVERNANCE_ROLE, deployer),
      'Deployer still governance on distributor'
    );
    require(
      !distributor.hasRole(AccessRoles.GUARDIAN_ROLE, deployer),
      'Deployer still guardian on distributor'
    );

    // 4. Timelock Authority Verification
    require(
      reserve.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, timelock),
      'Timelock missing admin on reserve'
    );
    require(
      reserve.hasRole(AccessRoles.GOVERNANCE_ROLE, timelock),
      'Timelock missing governance on reserve'
    );

    require(
      vault.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, timelock),
      'Timelock missing admin on vault'
    );
    require(
      vault.hasRole(AccessRoles.GOVERNANCE_ROLE, timelock),
      'Timelock missing governance on vault'
    );

    require(
      registry.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, timelock),
      'Timelock missing admin on registry'
    );
    require(
      registry.hasRole(AccessRoles.GOVERNANCE_ROLE, timelock),
      'Timelock missing governance on registry'
    );

    require(
      distributor.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, timelock),
      'Timelock missing admin on distributor'
    );
    require(
      distributor.hasRole(AccessRoles.GOVERNANCE_ROLE, timelock),
      'Timelock missing governance on distributor'
    );

    // 5. Guardian Authority Verification
    require(reserve.hasRole(AccessRoles.GUARDIAN_ROLE, guardian), 'Guardian missing on reserve');
    require(vault.hasRole(AccessRoles.GUARDIAN_ROLE, guardian), 'Guardian missing on vault');
    require(
      distributor.hasRole(AccessRoles.GUARDIAN_ROLE, guardian),
      'Guardian missing on distributor'
    );

    // 6. Zero-Touch Core Isolation (Zero Controller Role on UVBE)
    require(
      !UVBEV2(BASE_SEPOLIA_UVBE).hasRole(AccessRoles.CONTROLLER_ROLE, address(vault)),
      'Vault has CONTROLLER_ROLE'
    );
    require(
      !UVBEV2(BASE_SEPOLIA_UVBE).hasRole(AccessRoles.CONTROLLER_ROLE, address(distributor)),
      'Distributor has CONTROLLER_ROLE'
    );
    require(
      !UVBEV2(BASE_SEPOLIA_UVBE).hasRole(AccessRoles.CONTROLLER_ROLE, address(reserve)),
      'Reserve has CONTROLLER_ROLE'
    );
    require(
      !UVBEV2(BASE_SEPOLIA_UVBE).hasRole(AccessRoles.CONTROLLER_ROLE, address(registry)),
      'Registry has CONTROLLER_ROLE'
    );

    console.log('=== Post-Deployment & Role Handover Verification Complete: ALL CHECKS PASSED ===');
  }
}
