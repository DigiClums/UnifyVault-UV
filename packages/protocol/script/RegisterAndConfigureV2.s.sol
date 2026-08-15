// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';

interface ITreasuryMinimal {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function hasRole(bytes32 role, address account) external view returns (bool);
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract RegisterAndConfigureV2Script is Script {
  address public constant DIRECTORY = 0xB5dd6d766867cB4c299AD2711068455C718EDDbc;
  address public constant CONTROLLER = 0x6cEb36711373ebf585499A2dd5e9084115AA7211;
  address public constant VAULT = 0x54696d5d00b58F27F9d8C358560ff2a7d10d409e;
  address public constant TREASURY = 0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D;
  address public constant FEE_MANAGER = 0x1234567890123456789012345678901234567890;
  address public constant ORACLE = 0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635;
  address public constant TOKEN = 0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function run() external {
    vm.startBroadcast();

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);
    CustodyVault custodyVault = CustodyVault(VAULT);
    UVBTCETHToken uvToken = UVBTCETHToken(TOKEN);
    ITreasuryMinimal treasury = ITreasuryMinimal(TREASURY);

    console.log('=== REGISTERING CONTRACTS IN PROTOCOL DIRECTORY ===');
    _registerOrUpdate(dir, ModuleIds.TREASURY, TREASURY);
    _registerOrUpdate(dir, ModuleIds.FEE_MANAGER, FEE_MANAGER);
    _registerOrUpdate(dir, ModuleIds.VAULT, VAULT);
    _registerOrUpdate(dir, ModuleIds.DEPOSIT_MANAGER, CONTROLLER);
    _registerOrUpdate(dir, ModuleIds.ORACLE, ORACLE);
    _registerOrUpdate(dir, ModuleIds.TOKEN, TOKEN);

    console.log('=== CONFIGURING ACCESS ROLES ===');
    custodyVault.grantRole(custodyVault.CONTROLLER_ROLE(), CONTROLLER);
    treasury.grantRole(treasury.CONTROLLER_ROLE(), CONTROLLER);
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), CONTROLLER);

    console.log('=== REGISTERING ASSETS IN VAULT AND TREASURY ===');
    custodyVault.registerAsset(USDC, 6);
    treasury.registerAsset(USDC, 6);

    vm.stopBroadcast();

    console.log('[SUCCESS] All contracts registered and roles granted!');
  }

  function _registerOrUpdate(ProtocolDirectory dir, bytes32 id, address target) internal {
    if (dir.exists(id)) {
      if (dir.getAddress(id) != target) {
        dir.updateAddress(id, target);
      }
    } else {
      dir.registerAddress(id, target);
    }
  }
}
