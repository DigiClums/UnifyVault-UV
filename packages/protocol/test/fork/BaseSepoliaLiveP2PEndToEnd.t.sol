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

  address public constant DIRECTORY_ADDR = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;

  address public seller = address(0x1111111111111111111111111111111111111111);
  address public buyer = address(0x2222222222222222222222222222222222222222);

  ProtocolDirectory public directory;
  UVBEV2 public token;
  CostBasisManagerV2 public cbm;
  P2PEscrowV2 public escrow;
  Marketplace public marketplace;
  address public treasuryAddr;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    directory = ProtocolDirectory(DIRECTORY_ADDR);
    token = UVBEV2(directory.getAddress(ModuleIds.TOKEN));
    cbm = CostBasisManagerV2(directory.getAddress(ModuleIds.COST_BASIS_MANAGER));
    escrow = P2PEscrowV2(payable(directory.getAddress(ModuleIds.P2P_ESCROW)));
    treasuryAddr = directory.getAddress(ModuleIds.TREASURY);

    marketplace = new Marketplace(address(escrow));

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
    uint256 escrowBalBefore = token.balanceOf(address(escrow));
    uint256 treasuryBalBefore = token.balanceOf(treasuryAddr);
    uint256 buyerBalBefore = token.balanceOf(buyer);

    // 1. Seller creates trade
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: tradeAmount,
      fiatAmount: fiatAmount,
      fiatCurrency: keccak256('INR'),
      paymentWindow: 3600
    });

    vm.prank(seller);
    uint256 tradeId = escrow.createTrade(params);

    assertEq(tradeId, 1, 'First trade must have ID 1');

    // Verify token was locked in escrow
    assertEq(
      token.balanceOf(address(escrow)),
      escrowBalBefore + tradeAmount,
      'Escrow balance must increase by trade amount'
    );
    assertEq(token.balanceOf(seller), 90 * 1e18, 'Seller balance must decrease by trade amount');

    // 2. Buyer submits payment proof
    bytes32 paymentRef = keccak256('UPI-UTR-1234567890');
    bytes32 evidenceHash = keccak256('ipfs://QmScreenshotEvidenceHash');

    vm.prank(buyer);
    escrow.submitPayment(tradeId, paymentRef, evidenceHash);

    // Verify trade state is now PAYMENT_SUBMITTED
    EscrowTypes.Trade memory tradeAfterPayment = escrow.getTrade(tradeId);
    assertEq(
      uint8(tradeAfterPayment.state),
      uint8(EscrowTypes.TradeState.PAYMENT_SUBMITTED),
      'State must be PAYMENT_SUBMITTED'
    );

    // 3. Seller confirms receipt and releases funds
    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    // 4. Invariant verifications
    assertEq(
      token.balanceOf(address(escrow)),
      escrowBalBefore,
      'Escrow balance must return to pre-trade balance'
    );

    assertEq(
      token.balanceOf(buyer),
      buyerBalBefore + expectedBuyerAmount,
      'Buyer must receive exactly 9.9 UVBE'
    );

    assertEq(
      token.balanceOf(treasuryAddr),
      treasuryBalBefore + expectedFee,
      'Treasury must receive exactly 0.1 UVBE fee'
    );

    assertEq(
      token.balanceOf(seller) +
        token.balanceOf(buyer) +
        token.balanceOf(treasuryAddr) +
        token.balanceOf(address(escrow)),
      100 * 1e18,
      'Total token conservation: must sum to original 100 UVBE'
    );

    uint256 sellerBasisAfter = cbm.costBasis(seller);
    assertTrue(
      sellerBasisAfter <= sellerBasisBefore,
      'Seller cost basis must decrease or stay conserved'
    );

    console.log('[PASS] Full P2P Escrow Lifecycle on Live Base Sepolia Verified');
  }
}
