// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script } from 'forge-std/Script.sol';
import { console2 } from 'forge-std/console2.sol';
import { IMarketplace } from '../src/interfaces/IMarketplace.sol';
import { MarketplaceTypes } from '../src/types/MarketplaceTypes.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract SmokeTestSellOrderScript is Script {
  address public constant MARKETPLACE = 0x5978273B16467E99f45984Dc8AE9048ba05a30F7;
  address public constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function run() external {
    address seller = msg.sender;

    console2.log("=== Phase 7.1.4 Live Base Sepolia SELL Order Smoke Test ===");
    console2.log("Seller Address:", seller);
    console2.log("Marketplace Address:", MARKETPLACE);
    console2.log("USDC Asset Address:", USDC_SEPOLIA);

    // 1. Read real seller balance on-chain
    uint256 sellerBalance = IERC20(USDC_SEPOLIA).balanceOf(seller);
    console2.log("Real Seller USDC Balance (raw units):", sellerBalance);

    uint256 requestedAmount = 500000; // 0.5 USDC
    require(sellerBalance >= requestedAmount, "Insufficient USDC balance for test");

    IMarketplace marketplace = IMarketplace(MARKETPLACE);

    vm.startBroadcast();

    // 2. Submit createSellOrder on-chain
    uint256 orderId = marketplace.createSellOrder(
      USDC_SEPOLIA,
      requestedAmount,
      90, // 90 INR
      keccak256("INR"),
      0,
      requestedAmount
    );

    vm.stopBroadcast();

    console2.log("Created Sell Order ID:", orderId);

    // 3. Read getOrder() from Marketplace on-chain to verify details
    MarketplaceTypes.Order memory order = marketplace.getOrder(orderId);

    console2.log("--- On-Chain Verified Order State ---");
    console2.log("Order ID:", order.orderId);
    console2.log("Order Maker:", order.maker);
    console2.log("Order Asset:", order.asset);
    console2.log("Order Side (0=BUY, 1=SELL):", uint8(order.side));
    console2.log("Order Amount:", order.amount);
    console2.log("Order Price (INR):", order.price);
    console2.log("Order Status (0=OPEN, 1=FILLED, 2=CANCELLED):", uint8(order.status));

    require(order.maker == seller, "Maker mismatch");
    require(order.asset == USDC_SEPOLIA, "Asset mismatch");
    require(uint8(order.side) == 1, "Side mismatch (expected SELL)");
    require(order.amount == requestedAmount, "Amount mismatch");
    require(order.price == 90, "Price mismatch");
    require(uint8(order.status) == 0, "Status mismatch (expected OPEN)");

    // 4. Verify Marketplace contract balance is still 0 (non-custodial check)
    uint256 marketplaceUsdcBalance = IERC20(USDC_SEPOLIA).balanceOf(MARKETPLACE);
    console2.log("Marketplace USDC Balance post-order:", marketplaceUsdcBalance);
    require(marketplaceUsdcBalance == 0, "Marketplace balance must be 0 (non-custodial creation)");

    console2.log("=== LIVE SMOKE TEST SUCCESSFUL ===");
  }
}
