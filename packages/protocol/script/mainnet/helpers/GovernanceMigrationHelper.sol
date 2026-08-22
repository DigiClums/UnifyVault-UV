// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { console } from 'forge-std/Script.sol';
import { IAccessControl } from '@openzeppelin/contracts/access/IAccessControl.sol';
import { AccessRoles } from 'src/libraries/AccessRoles.sol';

interface VmExt {
  function readFile(string calldata path) external view returns (string memory);
  function writeFile(string calldata path, string calldata data) external;
  function removeFile(string calldata path) external;
  function setEnv(string calldata key, string calldata value) external;
  function parseJsonAddress(
    string calldata json,
    string calldata key
  ) external pure returns (address);
  function parseJsonBool(string calldata json, string calldata key) external pure returns (bool);
  function envOr(
    string calldata key,
    string calldata defaultValue
  ) external view returns (string memory);
  function envOr(string calldata key, bool defaultValue) external view returns (bool);
  function parseAddress(string calldata stringifiedAddress) external pure returns (address);
}

struct TargetContract {
  string name;
  address addr;
}

struct MigrationConfig {
  address newAdmin;
  address oldAdmin;
  address guardian;
  bool confirmRenounce;
  TargetContract[] contracts;
}

library GovernanceMigrationHelper {
  uint256 internal constant BASE_MAINNET_CHAIN_ID = 8453;
  bytes32 public constant DEFAULT_ADMIN_ROLE =
    0x0000000000000000000000000000000000000000000000000000000000000000;
  bytes32 public constant GOVERNANCE_ROLE = keccak256('GOVERNANCE_ROLE');
  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');
  bytes32 public constant CONTROLLER_ROLE = keccak256('CONTROLLER_ROLE');
  bytes32 public constant BOT_ROLE = keccak256('BOT_ROLE');

  function loadConfig(address vmAddr) internal view returns (MigrationConfig memory config) {
    VmExt vm = VmExt(vmAddr);

    string memory configPath = vm.envOr('CONFIG_PATH', '');
    if (bytes(configPath).length == 0) {
      if (block.chainid == BASE_MAINNET_CHAIN_ID) {
        configPath = 'script/mainnet/config/base_mainnet.json';
      } else {
        configPath = 'script/mainnet/config/base_sepolia.json';
      }
    }

    // Explicit network safety guard: never allow base_sepolia config on Base Mainnet (8453)
    if (block.chainid == BASE_MAINNET_CHAIN_ID) {
      require(
        !_containsSubstr(configPath, 'sepolia') && !_containsSubstr(configPath, '84532'),
        'GovernanceMigrationHelper: Base Sepolia configuration cannot be used on Base Mainnet (8453)'
      );
    }

    string memory json = vm.readFile(configPath);

    config.newAdmin = vm.parseJsonAddress(json, '.newAdmin');
    config.oldAdmin = vm.parseJsonAddress(json, '.oldAdmin');
    config.guardian = vm.parseJsonAddress(json, '.guardian');
    config.confirmRenounce = vm.parseJsonBool(json, '.confirmRenounce');

    // Require explicit confirmation flag for any role modification
    try vm.envOr('CONFIRM_RENOUNCE', false) returns (bool res) {
      if (res) {
        config.confirmRenounce = true;
      }
    } catch {}

    string[11] memory names = [
      'ProtocolDirectory',
      'UnifyVaultController',
      'CustodyVault',
      'Treasury',
      'FeeManager',
      'OracleManager',
      'UVBTCETHToken',
      'LiquidityManager',
      'StrategyManager',
      'PortfolioManager',
      'SwapAdapter'
    ];

    uint256 validCount = 0;
    for (uint256 i = 0; i < names.length; i++) {
      string memory key = string.concat('.contracts.', names[i]);
      try vm.parseJsonAddress(json, key) returns (address addr) {
        if (addr != address(0)) {
          validCount++;
        }
      } catch {}
    }

    config.contracts = new TargetContract[](validCount);
    uint256 idx = 0;
    for (uint256 i = 0; i < names.length; i++) {
      string memory key = string.concat('.contracts.', names[i]);
      try vm.parseJsonAddress(json, key) returns (address addr) {
        if (addr != address(0)) {
          config.contracts[idx] = TargetContract({ name: names[i], addr: addr });
          idx++;
        }
      } catch {}
    }
  }

  /// @notice Guards any role-changing script on Base Mainnet. This is separate
  /// from renounce confirmation so grants cannot be broadcast accidentally.
  function requireMainnetGovernanceConfirmation(address vmAddr) internal view {
    if (block.chainid != BASE_MAINNET_CHAIN_ID) return;
    require(
      VmExt(vmAddr).envOr('CONFIRM_MAINNET_GOVERNANCE_ACTION', false),
      'GovernanceMigrationHelper: set CONFIRM_MAINNET_GOVERNANCE_ACTION=true for Base Mainnet role changes'
    );
  }

  function checkRole(
    address contractAddr,
    bytes32 role,
    address account
  ) internal view returns (bool) {
    if (contractAddr == address(0) || contractAddr.code.length == 0) return false;
    try IAccessControl(contractAddr).hasRole(role, account) returns (bool hasIt) {
      return hasIt;
    } catch {
      return false;
    }
  }

  function _containsSubstr(string memory what, string memory where) internal pure returns (bool) {
    bytes memory whatBytes = bytes(what);
    bytes memory whereBytes = bytes(where);
    if (whereBytes.length == 0 || whereBytes.length > whatBytes.length) return false;
    for (uint256 i = 0; i <= whatBytes.length - whereBytes.length; i++) {
      bool matchFound = true;
      for (uint256 j = 0; j < whereBytes.length; j++) {
        if (whatBytes[i + j] != whereBytes[j]) {
          matchFound = false;
          break;
        }
      }
      if (matchFound) return true;
    }
    return false;
  }
}
