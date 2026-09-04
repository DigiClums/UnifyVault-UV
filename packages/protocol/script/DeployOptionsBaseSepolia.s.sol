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
  address public constant BASE_SEPOLIA_UVBE = 0xA3Db7c3DeE9A50D966A06e19b5DF4FCDee615BdE;
  address public constant BASE_SEPOLIA_ORACLE_MANAGER = 0xabFE3034Db275e32dE396c7Bdd1649a62Ac9e5A6;
  bytes32 public constant UVBE_ASSET_ID = keccak256('UVBE');
  bytes32 public constant BTC_ASSET_ID = keccak256('BTC');
  bytes32 public constant ETH_ASSET_ID = keccak256('ETH');

  function run() external {
    address deployer = msg.sender;

    vm.startBroadcast();

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
