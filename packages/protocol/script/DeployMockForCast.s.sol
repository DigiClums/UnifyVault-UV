// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../src/ProtocolDirectory.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';

contract MockUSDC is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {}

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockTreasury {}

contract DeployMockForCastScript is Script {
  function run() external {
    vm.startBroadcast();
    address deployer = msg.sender;

    ProtocolDirectory directory = new ProtocolDirectory();
    OracleManager oracleManager = new OracleManager();
    MockOracleProvider oracleProvider = new MockOracleProvider();
    CustodyVault vault = new CustodyVault();
    UVBTCETHToken token = new UVBTCETHToken();
    MockUSDC usdc = new MockUSDC();
    MockTreasury treasury = new MockTreasury();

    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    token.grantRole(token.CONTROLLER_ROLE(), deployer);

    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    oracleProvider.registerAsset(usdcId, 1 * 10 ** 18, 18, block.timestamp, 1);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    vault.registerAsset(address(usdc), 6);

    UnifyVaultController controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    address[] memory initialAssets = new address[](1);
    initialAssets[0] = address(usdc);
    uint256[] memory initialWeights = new uint256[](1);
    initialWeights[0] = 10000;

    StrategyManager strategyManager = new StrategyManager(deployer, initialAssets, initialWeights);
    PortfolioManager portfolioManager = new PortfolioManager(
      deployer,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));

    portfolioManager.grantRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    strategyManager.grantRole(AccessRoles.GOVERNANCE_ROLE, deployer);

    portfolioManager.syncModules();

    vm.stopBroadcast();

    console2.log('DEPLOYED CONTROLLER:', address(controller));
    console2.log('DEPLOYED USDC:', address(usdc));
  }
}
