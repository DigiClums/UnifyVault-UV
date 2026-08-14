// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import { IMarketplace } from '../src/interfaces/IMarketplace.sol';
import { IP2PEscrow } from '../src/interfaces/IP2PEscrow.sol';
import { MarketplaceTypes } from '../src/types/MarketplaceTypes.sol';
import { EscrowTypes } from '../src/types/EscrowTypes.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract ExecuteH1BaseSepoliaSmokeTestScript is Script {
  address public constant MARKETPLACE = 0xe908377f96F313a6b7771570ff6Fb414D38F451A;
  address public constant P2P_ESCROW = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;
  address public constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function run() external {
    console2.log('=== PHASE 7.2.4 - BASE SEPOLIA H1 TAKE ORDER SMOKE TEST ===');

    IMarketplace marketplace = IMarketplace(MARKETPLACE);
    IP2PEscrow escrow = IP2PEscrow(P2P_ESCROW);

    console2.log('Marketplace Address:', address(marketplace));
    console2.log('Linked P2PEscrow Address:', address(escrow));
    console2.log('USDC Asset Address:', USDC_SEPOLIA);

    // 1. Verify Existing Trades #3, #4, #5 on-chain state
    console2.log('1. Verifying existing Trades #3, #4, #5 on-chain state...');

    EscrowTypes.Trade memory trade3Initial;
    EscrowTypes.Trade memory trade4Initial;
    EscrowTypes.Trade memory trade5Initial;

    try escrow.getTrade(3) returns (EscrowTypes.Trade memory t3) {
      trade3Initial = t3;
      console2.log('   Trade #3 Seller:', t3.seller);
      console2.log('   Trade #3 Buyer:', t3.buyer);
      console2.log('   Trade #3 State:', uint8(t3.state));
    } catch {
      console2.log('   Trade #3 not found on-chain');
    }

    try escrow.getTrade(4) returns (EscrowTypes.Trade memory t4) {
      trade4Initial = t4;
      console2.log('   Trade #4 Seller:', t4.seller);
      console2.log('   Trade #4 Buyer:', t4.buyer);
      console2.log('   Trade #4 State:', uint8(t4.state));
    } catch {
      console2.log('   Trade #4 not found on-chain');
    }

    try escrow.getTrade(5) returns (EscrowTypes.Trade memory t5) {
      trade5Initial = t5;
      console2.log('   Trade #5 Seller:', t5.seller);
      console2.log('   Trade #5 Buyer:', t5.buyer);
      console2.log('   Trade #5 State:', uint8(t5.state));
    } catch {
      console2.log('   Trade #5 not found on-chain');
    }

    address seller = address(0x1111111111111111111111111111111111111111);
    address buyer = address(0x2222222222222222222222222222222222222222);
    uint256 matchAmount = 100000; // 0.1 USDC (6 decimals)

    // 2. Create fresh small SELL Order by Seller
    console2.log('2. Creating fresh small SELL order on-chain...');
    vm.startBroadcast(seller);

    uint256 sellOrderId = marketplace.createSellOrder(
      USDC_SEPOLIA,
      matchAmount,
      90, // 90 INR
      keccak256('INR'),
      0,
      matchAmount
    );
    console2.log('   Created SELL Order ID:', sellOrderId);

    vm.stopBroadcast();

    // 3. Take SELL Order: Buyer creates counter BUY order
    console2.log('3. Taker creating counter BUY order on-chain...');
    vm.startBroadcast(buyer);

    uint256 buyOrderId = marketplace.createBuyOrder(
      USDC_SEPOLIA,
      matchAmount,
      90, // 90 INR
      keccak256('INR'),
      0,
      matchAmount
    );
    console2.log('   Created Counter BUY Order ID:', buyOrderId);

    require(buyOrderId != sellOrderId, 'BUY ID must not equal SELL ID');

    // 4. Match Orders: Marketplace.matchOrders(buyOrderId, sellOrderId, amount)
    console2.log('4. Executing Marketplace.matchOrders(buyOrderId, sellOrderId, matchAmount)...');
    (uint256 matchId, uint256 escrowTradeId) = marketplace.matchOrders(
      buyOrderId,
      sellOrderId,
      matchAmount
    );

    vm.stopBroadcast();

    console2.log('   Match ID:', matchId);
    console2.log('   Spawned P2PEscrow Trade ID:', escrowTradeId);

    // 5. Verify Spawned P2PEscrow Trade Details
    console2.log('5. Verifying spawned P2PEscrow Trade details...');
    EscrowTypes.Trade memory newTrade = escrow.getTrade(escrowTradeId);

    console2.log('   Trade ID:', newTrade.tradeId);
    console2.log('   Trade Seller:', newTrade.seller);
    console2.log('   Trade Buyer:', newTrade.buyer);
    console2.log('   Trade Asset:', newTrade.asset);
    console2.log('   Trade Amount:', newTrade.amount);
    console2.log('   Trade State (1=CREATED):', uint8(newTrade.state));

    require(newTrade.seller == seller, 'Trade seller mismatch');
    require(newTrade.buyer == buyer, 'Trade buyer mismatch');
    require(newTrade.asset == USDC_SEPOLIA, 'Trade asset mismatch');
    require(newTrade.amount == matchAmount, 'Trade amount mismatch');
    require(uint8(newTrade.state) == 1, 'Trade state expected CREATED');

    // 6. Verify Marketplace USDC Balance remains 0
    console2.log('6. Verifying Marketplace contract balance...');
    uint256 mpBalance = IERC20(USDC_SEPOLIA).balanceOf(MARKETPLACE);
    console2.log('   Marketplace USDC Balance:', mpBalance);
    require(mpBalance == 0, 'Marketplace USDC balance must be 0 (non-custodial)');

    // 7. Re-verify existing Trades #3, #4, #5 state integrity
    console2.log('7. Re-verifying existing Trades #3, #4, #5 state integrity...');
    if (trade3Initial.tradeId > 0) {
      EscrowTypes.Trade memory t3Post = escrow.getTrade(3);
      require(t3Post.seller == trade3Initial.seller, 'Trade #3 seller modified');
      require(t3Post.buyer == trade3Initial.buyer, 'Trade #3 buyer modified');
      require(t3Post.amount == trade3Initial.amount, 'Trade #3 amount modified');
      require(t3Post.state == trade3Initial.state, 'Trade #3 state modified');
      console2.log('   Trade #3 integrity verified: Unchanged');
    }

    if (trade4Initial.tradeId > 0) {
      EscrowTypes.Trade memory t4Post = escrow.getTrade(4);
      require(t4Post.seller == trade4Initial.seller, 'Trade #4 seller modified');
      require(t4Post.buyer == trade4Initial.buyer, 'Trade #4 buyer modified');
      require(t4Post.amount == trade4Initial.amount, 'Trade #4 amount modified');
      require(t4Post.state == trade4Initial.state, 'Trade #4 state modified');
      console2.log('   Trade #4 integrity verified: Unchanged');
    }

    if (trade5Initial.tradeId > 0) {
      EscrowTypes.Trade memory t5Post = escrow.getTrade(5);
      require(t5Post.seller == trade5Initial.seller, 'Trade #5 seller modified');
      require(t5Post.buyer == trade5Initial.buyer, 'Trade #5 buyer modified');
      require(t5Post.amount == trade5Initial.amount, 'Trade #5 amount modified');
      require(t5Post.state == trade5Initial.state, 'Trade #5 state modified');
      console2.log('   Trade #5 integrity verified: Unchanged');
    }

    console2.log('=== PHASE 7.2.4 H1 SMOKE TEST SUCCESSFUL ===');
  }
}
