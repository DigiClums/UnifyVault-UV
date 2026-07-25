// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/vault/LiquidityManager.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/swap/SwapAdapter.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/constants/ModuleIds.sol';

interface ITestTreasury {
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract RecoverDeploymentScript is Script {
  // Existing deployed contract addresses on Base Sepolia
  address public constant PROTOCOL_DIRECTORY = 0xDd29e54f91b86f3e4609AA2e279e04E98dcAb722;
  address public constant ORACLE_MANAGER = 0x31bCf1a4155c14C60dA18fAd7717B44C3B881D7E;
  address public constant CUSTODY_VAULT = 0x30d7fdAfeB293f52627b923Efd3B7E7B1F3974c4;
  address public constant TREASURY = 0x9A81A0917179769B8BaB5058F8a8625fC472e5D9;
  address public constant UVBTC_ETH_TOKEN = 0x7179B73F30ecC0F00cB6D8b1E72a0bB7C197f07e;
  address public constant MOCK_COLLATERAL = 0x9A52913A0CBDDd670B7C492733D21306Ba57416D;
  address public constant DUMMY_ROUTER = 0x261F2B357410c707010b07590d05C00f5C345719;

  function run() external {
    vm.startBroadcast();

    address deployer = msg.sender;
    ProtocolDirectory directory = ProtocolDirectory(PROTOCOL_DIRECTORY);

    // 1. Deploy updated UnifyVaultController
    UnifyVaultController controller = new UnifyVaultController(
      PROTOCOL_DIRECTORY,
      ORACLE_MANAGER,
      CUSTODY_VAULT,
      TREASURY,
      UVBTC_ETH_TOKEN
    );

    // 2. Deploy missing LiquidityManager
    LiquidityManager liquidityManager = new LiquidityManager(deployer, address(directory));

    // 3. Deploy missing SwapAdapter
    SwapAdapter swapAdapter = new SwapAdapter(deployer, DUMMY_ROUTER);

    // 4. Deploy missing StrategyManager
    address[] memory initAssets = new address[](1);
    initAssets[0] = MOCK_COLLATERAL;
    uint256[] memory initWeights = new uint256[](1);
    initWeights[0] = 10000;

    StrategyManager strategyManager = new StrategyManager(deployer, initAssets, initWeights);

    // 5. Deploy missing PortfolioManager
    PortfolioManager portfolioManager = new PortfolioManager(
      deployer,
      address(directory),
      address(strategyManager),
      ORACLE_MANAGER,
      CUSTODY_VAULT,
      UVBTC_ETH_TOKEN
    );

    // 6. Grant roles to new UnifyVaultController
    CustodyVault vault = CustodyVault(CUSTODY_VAULT);
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));

    ITestTreasury treasury = ITestTreasury(TREASURY);
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));

    UVBTCETHToken token = UVBTCETHToken(UVBTC_ETH_TOKEN);
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // 7. Update or register all 5 modules in ProtocolDirectory
    _registerOrUpdate(directory, ModuleIds.DEPOSIT_MANAGER, address(controller));
    _registerOrUpdate(directory, ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
    _registerOrUpdate(directory, ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    _registerOrUpdate(directory, ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    _registerOrUpdate(directory, ModuleIds.SWAP_ADAPTER, address(swapAdapter));

    // 8. Sync modules on LiquidityManager
    liquidityManager.syncModules();

    vm.stopBroadcast();
  }

  function _registerOrUpdate(ProtocolDirectory directory, bytes32 id, address target) internal {
    if (directory.exists(id)) {
      directory.updateAddress(id, target);
    } else {
      directory.registerAddress(id, target);
    }
  }
}
