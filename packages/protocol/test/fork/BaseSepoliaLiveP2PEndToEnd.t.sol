// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/marketplace/Marketplace.sol';
import '../../src/constants/ModuleIds.sol';
import '../../src/types/EscrowTypes.sol';
import '../../src/libraries/AccessRoles.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

contract BaseSepoliaLiveP2PEndToEndTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  address public constant DIRECTORY_ADDR = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant TOKEN_ADDR = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant CBM_ADDR = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;
  address public constant ESCROW_ADDR = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;
  address public constant TREASURY_ADDR = 0xB8c8113a042f39936dD966A5983fAaE2bF7b7290;
  address public constant MARKETPLACE_ADDR = 0xe908377f96F313a6b7771570ff6Fb414D38F451A;

  address public seller = address(0x1111111111111111111111111111111111111111);
  address public buyer = address(0x2222222222222222222222222222222222222222);

  ProtocolDirectory public directory;
  UVBEV2 public token;
  CostBasisManagerV2 public cbm;
  P2PEscrowV2 public escrow;
  Marketplace public marketplace;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    directory = ProtocolDirectory(DIRECTORY_ADDR);
    token = UVBEV2(TOKEN_ADDR);
    cbm = CostBasisManagerV2(CBM_ADDR);
    escrow = P2PEscrowV2(payable(ESCROW_ADDR));
    marketplace = Marketplace(payable(MARKETPLACE_ADDR));

    // Fund seller with UVBE on fork
    deal(address(token), seller, 100 * 1e18);

    vm.prank(seller);
    token.approve(address(escrow), type(uint256).max);

    vm.prank(seller);
    token.approve(address(marketplace), type(uint256).max);
  }

  function test_Live_DirectP2PEscrow_1PercentFee_FullFlow() public {
    uint256 tradeAmount = 10 * 1e18; // 10 UVBE
    uint256 fiatAmount = 1000 * 1e2; // 1000 INR
    uint256 expectedFee = (tradeAmount * 100) / 10000; // 0.1 UVBE (1%)
    uint256 expectedBuyerAmount = tradeAmount - expectedFee; // 9.9 UVBE (99%)

    uint256 sellerBasisBefore = cbm.costBasis(seller);
    int256 sellerPnlBefore = cbm.realizedPnL(seller);
    uint256 escrowBalBefore = token.balanceOf(address(escrow));
    uint256 treasuryBalBefore = token.balanceOf(TREASURY_ADDR);
    uint256 buyerBalBefore = token.balanceOf(buyer);

    // 1. Seller creates trade (auto-funded since caller is seller and allowance is set)
    vm.prank(seller);
    uint256 tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: tradeAmount,
        fiatAmount: fiatAmount,
        fiatCurrency: keccak256('INR'),
        paymentWindow: 1 hours
      })
    );

    EscrowTypes.Trade memory tFunded = escrow.getTrade(tradeId);
    assertEq(uint8(tFunded.state), uint8(EscrowTypes.TradeState.FUNDED), 'Trade should be FUNDED');
    assertEq(
      token.balanceOf(address(escrow)) - escrowBalBefore,
      tradeAmount,
      'Escrow received exact locked shares'
    );

    // 2. Buyer submits payment
    bytes32 pRef = keccak256(abi.encodePacked('LIVE_P2P_REF', block.timestamp, tradeId));
    bytes32 eHash = keccak256(abi.encodePacked('LIVE_P2P_PROOF', block.timestamp, tradeId));

    vm.prank(buyer);
    escrow.submitPayment(tradeId, pRef, eHash);

    EscrowTypes.Trade memory tPaid = escrow.getTrade(tradeId);
    assertEq(
      uint8(tPaid.state),
      uint8(EscrowTypes.TradeState.PAYMENT_SUBMITTED),
      'State: PAYMENT_SUBMITTED'
    );

    // 3. Seller confirms and releases
    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    EscrowTypes.Trade memory tReleased = escrow.getTrade(tradeId);
    assertEq(uint8(tReleased.state), uint8(EscrowTypes.TradeState.RELEASED), 'State: RELEASED');

    // 4. Invariant verifications
    uint256 buyerBalAfter = token.balanceOf(buyer);
    uint256 treasuryBalAfter = token.balanceOf(TREASURY_ADDR);

    assertEq(buyerBalAfter - buyerBalBefore, expectedBuyerAmount, 'Buyer received 99% net shares');
    assertEq(
      treasuryBalAfter - treasuryBalBefore,
      expectedFee,
      'Treasury received exact 1% fee shares'
    );

    // Verify accounting neutrality
    assertEq(cbm.realizedPnL(seller), sellerPnlBefore, 'P2P must not mutate seller realized PnL');
    assertEq(cbm.costBasis(TREASURY_ADDR), 0, 'Treasury fee shares must have 0 cost basis');
  }

  function test_Live_MarketplaceMatch_To_EscrowFlow() public {
    uint256 matchAmount = 5 * 1e18; // 5 UVBE

    // 1. Seller creates Sell Order on Marketplace
    vm.prank(seller);
    uint256 sellOrderId = marketplace.createSellOrder(
      address(token),
      matchAmount,
      100, // 100 INR / UVBE
      keccak256('INR'),
      0,
      matchAmount
    );

    // 2. Buyer creates Buy Order on Marketplace
    vm.prank(buyer);
    uint256 buyOrderId = marketplace.createBuyOrder(
      address(token),
      matchAmount,
      100, // 100 INR / UVBE
      keccak256('INR'),
      0,
      matchAmount
    );

    // 3. Match Orders
    vm.prank(buyer);
    (uint256 matchId, uint256 tradeId) = marketplace.matchOrders(
      buyOrderId,
      sellOrderId,
      matchAmount
    );

    assertGt(matchId, 0, 'Match ID must be > 0');
    assertGt(tradeId, 0, 'Escrow Trade ID must be > 0');

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(trade.seller, seller, 'Seller match');
    assertEq(trade.buyer, buyer, 'Buyer match');
    assertEq(trade.asset, address(token), 'Asset match');
    assertEq(trade.amount, matchAmount, 'Amount match');
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.CREATED), 'State CREATED');
  }
}
