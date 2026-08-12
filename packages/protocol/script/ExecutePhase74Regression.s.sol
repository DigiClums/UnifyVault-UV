// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import { IMarketplace } from '../src/interfaces/IMarketplace.sol';
import { IP2PEscrow } from '../src/interfaces/IP2PEscrow.sol';
import { MarketplaceTypes } from '../src/types/MarketplaceTypes.sol';
import { EscrowTypes } from '../src/types/EscrowTypes.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract ExecutePhase74RegressionScript is Script {
  address public constant MARKETPLACE = 0x5978273B16467E99f45984Dc8AE9048ba05a30F7;
  address public constant P2P_ESCROW = 0x6B0F46E4dF7Db5a09B98673fcd7af7E708332A44;
  address public constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function run() external {
    console2.log("=== PHASE 7.4 - CONTROLLED P2P E2E REGRESSION & PRODUCTION GATE ===");

    IMarketplace marketplace = IMarketplace(MARKETPLACE);
    IP2PEscrow escrow = IP2PEscrow(P2P_ESCROW);

    console2.log("Marketplace Address:", address(marketplace));
    console2.log("Linked P2PEscrow Address:", address(escrow));
    console2.log("USDC Asset Address:", USDC_SEPOLIA);

    // 1. Snapshot Existing Trades #3, #4, #5, #6
    console2.log("1. Snapshotting existing Trades #3, #4, #5, #6...");

    EscrowTypes.Trade memory t3Pre;
    EscrowTypes.Trade memory t4Pre;
    EscrowTypes.Trade memory t5Pre;
    EscrowTypes.Trade memory t6Pre;

    try escrow.getTrade(3) returns (EscrowTypes.Trade memory t) { t3Pre = t; console2.log("   Trade #3 State:", uint8(t.state)); } catch {}
    try escrow.getTrade(4) returns (EscrowTypes.Trade memory t) { t4Pre = t; console2.log("   Trade #4 State:", uint8(t.state)); } catch {}
    try escrow.getTrade(5) returns (EscrowTypes.Trade memory t) { t5Pre = t; console2.log("   Trade #5 State:", uint8(t.state)); } catch {}
    try escrow.getTrade(6) returns (EscrowTypes.Trade memory t) { t6Pre = t; console2.log("   Trade #6 State:", uint8(t.state)); } catch {}

    address seller = address(0x1111111111111111111111111111111111111111);
    address buyer = address(0x2222222222222222222222222222222222222222);
    uint256 matchAmount = 100000; // 0.10 USDC (6 decimals)

    // 2. Create fresh small SELL Order
    console2.log("2. Creating fresh SELL order...");
    vm.startBroadcast(seller);

    uint256 sellOrderId = marketplace.createSellOrder(
      USDC_SEPOLIA,
      matchAmount,
      90, // 90 INR
      keccak256("INR"),
      0,
      matchAmount
    );
    console2.log("   Fresh SELL Order ID:", sellOrderId);

    vm.stopBroadcast();

    // 3. Buyer creates counter BUY order
    console2.log("3. Taker creating counter BUY order...");
    vm.startBroadcast(buyer);

    uint256 buyOrderId = marketplace.createBuyOrder(
      USDC_SEPOLIA,
      matchAmount,
      90, // 90 INR
      keccak256("INR"),
      0,
      matchAmount
    );
    console2.log("   Fresh Counter BUY Order ID:", buyOrderId);
    require(buyOrderId != sellOrderId, "BUY ID must not equal SELL ID");

    // 4. Match Orders
    console2.log("4. Executing Marketplace.matchOrders(buyOrderId, sellOrderId, matchAmount)...");
    (uint256 matchId, uint256 freshTradeId) = marketplace.matchOrders(
      buyOrderId,
      sellOrderId,
      matchAmount
    );

    vm.stopBroadcast();

    console2.log("   Fresh Match ID:", matchId);
    console2.log("   Spawned Fresh P2PEscrow Trade ID:", freshTradeId);

    // 5. Verify Fresh Trade Details
    console2.log("5. Verifying fresh trade parameters...");
    EscrowTypes.Trade memory freshTrade = escrow.getTrade(freshTradeId);

    console2.log("   Fresh Trade ID:", freshTrade.tradeId);
    console2.log("   Fresh Trade Seller:", freshTrade.seller);
    console2.log("   Fresh Trade Buyer:", freshTrade.buyer);
    console2.log("   Fresh Trade Asset:", freshTrade.asset);
    console2.log("   Fresh Trade Amount:", freshTrade.amount);
    console2.log("   Fresh Trade State (1=CREATED):", uint8(freshTrade.state));

    require(freshTrade.seller == seller, "Seller mismatch");
    require(freshTrade.buyer == buyer, "Buyer mismatch");
    require(freshTrade.asset == USDC_SEPOLIA, "Asset mismatch");
    require(freshTrade.amount == matchAmount, "Amount mismatch");
    require(uint8(freshTrade.state) == 1, "State must be CREATED (1)");

    // 6. Non-custodial invariant
    console2.log("6. Verifying Marketplace USDC balance...");
    uint256 mpBalance = IERC20(USDC_SEPOLIA).balanceOf(MARKETPLACE);
    console2.log("   Marketplace USDC Balance:", mpBalance);
    require(mpBalance == 0, "Marketplace USDC balance must be 0");

    // 7. Verify Trades #3, #4, #5, #6 Preservation
    console2.log("7. Re-verifying Trades #3, #4, #5, #6 preservation...");

    if (t3Pre.tradeId > 0) {
      EscrowTypes.Trade memory t = escrow.getTrade(3);
      require(t.seller == t3Pre.seller && t.buyer == t3Pre.buyer && t.amount == t3Pre.amount && t.state == t3Pre.state, "Trade #3 altered");
      console2.log("   Trade #3: UNCHANGED (State=", uint8(t.state), ")");
    }

    if (t4Pre.tradeId > 0) {
      EscrowTypes.Trade memory t = escrow.getTrade(4);
      require(t.seller == t4Pre.seller && t.buyer == t4Pre.buyer && t.amount == t4Pre.amount && t.state == t4Pre.state, "Trade #4 altered");
      console2.log("   Trade #4: UNCHANGED (State=", uint8(t.state), ")");
    }

    if (t5Pre.tradeId > 0) {
      EscrowTypes.Trade memory t = escrow.getTrade(5);
      require(t.seller == t5Pre.seller && t.buyer == t5Pre.buyer && t.amount == t5Pre.amount && t.state == t5Pre.state, "Trade #5 altered");
      console2.log("   Trade #5: UNCHANGED (State=", uint8(t.state), ")");
    }

    if (t6Pre.tradeId > 0) {
      EscrowTypes.Trade memory t = escrow.getTrade(6);
      require(t.seller == t6Pre.seller && t.buyer == t6Pre.buyer && t.amount == t6Pre.amount && t.state == t6Pre.state, "Trade #6 altered");
      console2.log("   Trade #6: UNCHANGED (State=", uint8(t.state), ")");
    }

    console2.log("=== PHASE 7.4 FOUNDRY ON-CHAIN REGRESSION GATE PASSED ===");
  }
}
