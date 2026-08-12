// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import { IMarketplace } from '../src/interfaces/IMarketplace.sol';
import { IP2PEscrow } from '../src/interfaces/IP2PEscrow.sol';
import { MarketplaceTypes } from '../src/types/MarketplaceTypes.sol';
import { EscrowTypes } from '../src/types/EscrowTypes.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract ReconcileBaseSepoliaStateScript is Script {
  address public constant MARKETPLACE = 0x5978273B16467E99f45984Dc8AE9048ba05a30F7;
  address public constant P2P_ESCROW = 0x6B0F46E4dF7Db5a09B98673fcd7af7E708332A44;
  address public constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function run() external view {
    console2.log("=== PHASE 7.4.1 - READ-ONLY ON-CHAIN RECONCILIATION ===");

    IMarketplace marketplace = IMarketplace(MARKETPLACE);
    IP2PEscrow escrow = IP2PEscrow(P2P_ESCROW);

    uint256 orderCount = marketplace.getOrderCount();
    console2.log("On-Chain Marketplace Order Count:", orderCount);

    for (uint256 i = 1; i <= orderCount; i++) {
      try marketplace.getOrder(i) returns (MarketplaceTypes.Order memory ord) {
        console2.log("--- ORDER #", i, "---");
        console2.log("   Maker:", ord.maker);
        console2.log("   Side (0=BUY, 1=SELL):", uint8(ord.side));
        console2.log("   Asset:", ord.asset);
        console2.log("   Amount:", ord.amount);
        console2.log("   Filled Amount:", ord.filledAmount);
        console2.log("   Price (INR):", ord.price);
        console2.log("   Status (0=ACTIVE, 1=PARTIALLY_FILLED, 2=FILLED, 3=CANCELLED):", uint8(ord.status));
      } catch {
        console2.log("   Order #", i, "not found");
      }
    }

    console2.log("-----------------------------------------");
    console2.log("On-Chain P2PEscrow Trades Inspection:");

    for (uint256 t = 1; t <= 10; t++) {
      try escrow.getTrade(t) returns (EscrowTypes.Trade memory trd) {
        console2.log("--- TRADE #", t, "---");
        console2.log("   Trade ID:", trd.tradeId);
        console2.log("   Buyer:", trd.buyer);
        console2.log("   Seller:", trd.seller);
        console2.log("   Asset:", trd.asset);
        console2.log("   Amount:", trd.amount);
        console2.log("   Fiat Amount:", trd.fiatAmount);
        console2.log("   State (0=NONE, 1=CREATED, 2=FUNDED, 3=SETTLED, 4=DISPUTED, 5=REFUNDED, 6=CANCELLED):", uint8(trd.state));
        console2.log("   Payment Window:", trd.paymentWindow);
        console2.log("   Funding Timestamp:", trd.fundingTimestamp);
        console2.log("   Payment Timestamp:", trd.paymentTimestamp);
        console2.log("   Dispute Initiator:", trd.disputeInitiator);
      } catch {
        console2.log("   Trade #", t, "does not exist on-chain");
      }
    }

    console2.log("-----------------------------------------");
    uint256 mpUsdcBal = IERC20(USDC_SEPOLIA).balanceOf(MARKETPLACE);
    console2.log("Marketplace USDC Balance:", mpUsdcBal);
    console2.log("=== RECONCILIATION SCRIPT COMPLETED ===");
  }
}
