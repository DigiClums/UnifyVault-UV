// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script } from 'forge-std/Script.sol';
import { console2 } from 'forge-std/console2.sol';
import { Marketplace } from '../src/marketplace/Marketplace.sol';
import { P2PEscrow } from '../src/escrow/P2PEscrow.sol';

contract DeployMarketplaceScript is Script {
  address public constant P2P_ESCROW_TARGET = 0x6B0F46E4dF7Db5a09B98673fcd7af7E708332A44;
  uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

  function run() external returns (address marketplaceAddress) {
    require(
      block.chainid == BASE_SEPOLIA_CHAIN_ID,
      "Must deploy only to Base Sepolia"
    );

    // Verify P2PEscrow bytecode and totalTrades prior to deployment
    require(P2P_ESCROW_TARGET.code.length > 0, "P2PEscrow has no bytecode");
    uint256 trades = P2PEscrow(payable(P2P_ESCROW_TARGET)).totalTrades();

    console2.log("=== Deploying Marketplace to Base Sepolia ===");
    console2.log("Deployer:", msg.sender);
    console2.log("Target P2PEscrow:", P2P_ESCROW_TARGET);
    console2.log("P2PEscrow verified totalTrades:", trades);

    vm.startBroadcast();

    Marketplace marketplace = new Marketplace(P2P_ESCROW_TARGET);
    marketplaceAddress = address(marketplace);

    vm.stopBroadcast();

    console2.log("Marketplace deployed at:", marketplaceAddress);
    console2.log("Verified p2pEscrow():", address(marketplace.p2pEscrow()));
    console2.log("Verified getOrderCount():", marketplace.getOrderCount());
    console2.log("Verified defaultPaymentWindow():", marketplace.defaultPaymentWindow());
  }
}
