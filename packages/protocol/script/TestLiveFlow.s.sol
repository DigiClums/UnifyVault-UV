// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface IMockMint {
  function mint(address to, uint256 amount) external;
}

contract TestLiveFlowScript is Script {
  address public constant PROTOCOL_DIRECTORY = 0xDd29e54f91b86f3e4609AA2e279e04E98dcAb722;
  address public constant ORACLE_PROVIDER = 0x8F027E207Cf40d7446Aa0F818f32bdC7E6bbb362;
  address public constant CUSTODY_VAULT = 0x30d7fdAfeB293f52627b923Efd3B7E7B1F3974c4;
  address public constant UVBTC_ETH_TOKEN = 0x7179B73F30ecC0F00cB6D8b1E72a0bB7C197f07e;
  address public constant MOCK_COLLATERAL = 0x9A52913A0CBDDd670B7C492733D21306Ba57416D;

  function run() external {
    vm.startBroadcast();
    _executeFlow(msg.sender);
    vm.stopBroadcast();
  }

  function _executeFlow(address user) internal {
    ProtocolDirectory directory = ProtocolDirectory(PROTOCOL_DIRECTORY);
    UnifyVaultController controller = UnifyVaultController(
      directory.getAddress(ModuleIds.DEPOSIT_MANAGER)
    );
    UVBTCETHToken token = UVBTCETHToken(UVBTC_ETH_TOKEN);

    _updateOracle();

    uint256 depositAmount = 10 * 10 ** 18;
    IMockMint(MOCK_COLLATERAL).mint(user, depositAmount);
    IERC20(MOCK_COLLATERAL).approve(address(controller), depositAmount);

    controller.deposit(MOCK_COLLATERAL, depositAmount, 0, user);

    uint256 redeemShares = token.balanceOf(user) / 2;
    controller.redeem(MOCK_COLLATERAL, redeemShares, 0, user, block.timestamp + 300);
  }

  function _updateOracle() internal {
    bytes32 assetId = bytes32(uint256(uint160(MOCK_COLLATERAL)));
    MockOracleProvider(ORACLE_PROVIDER).setTimestamp(assetId, block.timestamp);
  }
}
