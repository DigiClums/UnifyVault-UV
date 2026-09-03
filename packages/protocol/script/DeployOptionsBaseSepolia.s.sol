// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/options/UVNiftyIndexManager.sol';
import '../src/options/UVOptionMarketFactory.sol';
import '../src/options/UVOptionPricingEngine.sol';
import '../src/options/UVOptionMarginEngine.sol';
import '../src/options/UVLiquidityVault.sol';
import '../src/options/UVOptionPositionManager.sol';
import '../src/options/UVOptionSettlementVault.sol';

/**
 * @title DeployOptionsProtocolBaseSepolia
 * @notice Automated deployment script for UVBE Options Protocol on Base Sepolia.
 */
contract DeployOptionsProtocolBaseSepolia is Script {
  address public constant BASE_SEPOLIA_UVBE = 0xa3dB7C3DEe9a50d966a06E19B5dF4FCdEe615BDe;
  address public constant BASE_SEPOLIA_ORACLE_MANAGER = 0xABfE3034DB275E32dE396c7bDd1649a62Ac9e5a6;
  bytes32 public constant UVBE_ASSET_ID = keccak256('UVBE');
  bytes32 public constant BTC_ASSET_ID = keccak256('BTC');
  bytes32 public constant ETH_ASSET_ID = keccak256('ETH');

  function run() external {
    uint256 deployerPrivateKey = vm.envOr('PRIVATE_KEY', uint256(0));
    address deployer = deployerPrivateKey != 0 ? vm.addr(deployerPrivateKey) : msg.sender;

    vm.startBroadcast(deployerPrivateKey);

    // 1. Deploy Index Manager
    UVNiftyIndexManager indexManager = new UVNiftyIndexManager(
      deployer,
      BASE_SEPOLIA_ORACLE_MANAGER
    );

    // 2. Deploy Market Factory
    UVOptionMarketFactory marketFactory = new UVOptionMarketFactory(deployer);

    // 3. Deploy Pricing Engine (EIP-712 Domain)
    UVOptionPricingEngine pricingEngine = new UVOptionPricingEngine(
      deployer,
      address(marketFactory),
      address(indexManager),
      BASE_SEPOLIA_ORACLE_MANAGER,
      UVBE_ASSET_ID
    );

    // 4. Deploy Margin Engine
    UVOptionMarginEngine marginEngine = new UVOptionMarginEngine(
      deployer,
      address(marketFactory),
      BASE_SEPOLIA_ORACLE_MANAGER,
      UVBE_ASSET_ID
    );

    // 5. Deploy Liquidity Vault
    UVLiquidityVault liquidityVault = new UVLiquidityVault(deployer, BASE_SEPOLIA_UVBE);

    // 6. Deploy Position Manager
    UVOptionPositionManager positionManager = new UVOptionPositionManager(
      deployer,
      address(marketFactory),
      address(pricingEngine),
      address(marginEngine),
      address(liquidityVault)
    );

    // 7. Deploy Settlement Vault
    UVOptionSettlementVault settlementVault = new UVOptionSettlementVault(
      deployer,
      address(marketFactory),
      address(positionManager),
      address(indexManager),
      BASE_SEPOLIA_ORACLE_MANAGER,
      address(liquidityVault),
      UVBE_ASSET_ID
    );

    // 8. Configure Granular Roles
    liquidityVault.grantRole(liquidityVault.POSITION_MANAGER_ROLE(), address(positionManager));
    liquidityVault.grantRole(liquidityVault.SETTLEMENT_VAULT_ROLE(), address(settlementVault));
    positionManager.grantRole(positionManager.SETTLEMENT_VAULT_ROLE(), address(settlementVault));

    vm.stopBroadcast();
  }
}
