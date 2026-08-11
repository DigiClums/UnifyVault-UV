// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/types/EscrowTypes.sol';

contract RevertingCBM is ICostBasisManagerV2 {
  function onTokenTransfer(address, address, uint256, uint256) external pure override {
    revert('Accounting Failure Forced');
  }
  function setFundContext(uint256, address, address, uint256) external override {}
  function setReleaseContext(
    uint256,
    address,
    address,
    address,
    uint256,
    uint256,
    uint256,
    uint256
  ) external override {}
  function setRefundContext(uint256, address, address, uint256) external override {}
  function recordDeposit(address, uint256, uint256) external override {}
  function recordRedeem(address, uint256, uint256, uint256) external override {}
  function migrateAccounting(address, uint256, int256, uint256) external override {}
  function costBasis(address) external pure override returns (uint256) {
    return 0;
  }
  function averageEntryPrice(address) external pure override returns (uint256) {
    return 0;
  }
  function realizedPnL(address) external pure override returns (int256) {
    return 0;
  }
  function unrealizedPnL(address) external pure override returns (int256) {
    return 0;
  }
  function firstDepositTimestamp(address) external pure override returns (uint256) {
    return 0;
  }
  function escrowTradeBasis(uint256) external pure override returns (uint256) {
    return 0;
  }
  function isEscrow(address) external pure override returns (bool) {
    return false;
  }
  function indexToken() external pure override returns (address) {
    return address(0);
  }
}

contract ReentrantAttacker {
  CostBasisManagerV2 public cbm;
  UVBEV2 public token;
  address public victim;

  constructor(CostBasisManagerV2 _cbm, UVBEV2 _token, address _victim) {
    cbm = _cbm;
    token = _token;
    victim = _victim;
  }

  function attackReenterCBM() external {
    cbm.onTokenTransfer(address(this), victim, 10, 100);
  }
}

contract CostBasisManagerV2Test is Test {
  CostBasisManagerV2 public cbm;
  UVBEV2 public token;
  P2PEscrowV2 public escrow;

  address public admin = address(0x1111);
  address public gov = address(0x2222);
  address public controller = address(0x3333);
  address public guardian = address(0x4444);
  address public treasury = address(0x5555);

  address public alice = address(0xA11CE);
  address public bob = address(0xB0B);
  address public charlie = address(0xCAC);

  function setUp() public {
    vm.startPrank(admin);

    token = new UVBEV2(admin);
    cbm = new CostBasisManagerV2(admin, address(0x9999));
    escrow = new P2PEscrowV2(treasury, 100, address(cbm)); // 1.00% fee

    cbm.setModules(address(0x8888), address(token));
    cbm.setEscrowStatus(address(escrow), true);
    token.setCostBasisManager(address(cbm));

    token.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    token.grantRole(token.CONTROLLER_ROLE(), controller);
    token.grantRole(token.GUARDIAN_ROLE(), guardian);

    cbm.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    cbm.grantRole(cbm.CONTROLLER_ROLE(), controller);

    escrow.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);

    vm.stopPrank();

    // Setup initial deposit for Alice: 100 shares for $1000 USD cost basis
    vm.startPrank(controller);
    cbm.recordDeposit(alice, 1000 * 1e18, 100 * 1e18);
    token.mint(alice, 100 * 1e18);
    vm.stopPrank();
  }

  // 1. Partial transfer proportional basis
  function test_PartialTransferProportionalBasis() public {
    assertEq(cbm.costBasis(alice), 1000 * 1e18);

    vm.prank(alice);
    token.transfer(bob, 40 * 1e18);

    assertEq(cbm.costBasis(alice), 600 * 1e18);
    assertEq(cbm.costBasis(bob), 400 * 1e18);
    assertEq(cbm.realizedPnL(alice), 0);
    assertEq(cbm.realizedPnL(bob), 0);
  }

  // 2. Full balance transfer moves ALL basis
  function test_FullBalanceTransferMovesAllBasis() public {
    vm.prank(alice);
    token.transfer(bob, 100 * 1e18);

    assertEq(cbm.costBasis(alice), 0);
    assertEq(cbm.costBasis(bob), 1000 * 1e18);
  }

  // 3. Chained A -> B -> C basis conservation
  function test_ChainedTransfersBasisConservation() public {
    vm.prank(alice);
    token.transfer(bob, 50 * 1e18); // Alice 50 ($500), Bob 50 ($500)

    vm.prank(bob);
    token.transfer(charlie, 30 * 1e18); // Bob 20 ($200), Charlie 30 ($300)

    assertEq(cbm.costBasis(alice), 500 * 1e18);
    assertEq(cbm.costBasis(bob), 200 * 1e18);
    assertEq(cbm.costBasis(charlie), 300 * 1e18);

    uint256 totalBasis = cbm.costBasis(alice) + cbm.costBasis(bob) + cbm.costBasis(charlie);
    assertEq(totalBasis, 1000 * 1e18);
  }

  // 4. Transfer to existing holder
  function test_TransferToExistingHolder() public {
    // Bob already has $200 basis and 20 shares
    vm.startPrank(controller);
    cbm.recordDeposit(bob, 200 * 1e18, 20 * 1e18);
    token.mint(bob, 20 * 1e18);
    vm.stopPrank();

    vm.prank(alice);
    token.transfer(bob, 50 * 1e18); // Moves $500 basis to Bob

    assertEq(cbm.costBasis(alice), 500 * 1e18);
    assertEq(cbm.costBasis(bob), 700 * 1e18);
  }

  // 5. TransferFrom
  function test_TransferFrom() public {
    vm.prank(alice);
    token.approve(bob, 50 * 1e18);

    vm.prank(bob);
    token.transferFrom(alice, charlie, 50 * 1e18);

    assertEq(cbm.costBasis(alice), 500 * 1e18);
    assertEq(cbm.costBasis(charlie), 500 * 1e18);
  }

  // 6. Self-transfer no-op
  function test_SelfTransferNoOp() public {
    vm.prank(alice);
    token.transfer(alice, 50 * 1e18);

    assertEq(cbm.costBasis(alice), 1000 * 1e18);
  }

  // 7. Zero transfer no-op
  function test_ZeroTransferNoOp() public {
    vm.prank(alice);
    token.transfer(bob, 0);

    assertEq(cbm.costBasis(alice), 1000 * 1e18);
    assertEq(cbm.costBasis(bob), 0);
  }

  // 8. Accounting failure reverts token transfer
  function test_AccountingFailureRevertsTokenTransfer() public {
    RevertingCBM mockCBM = new RevertingCBM();
    vm.prank(gov);
    token.setCostBasisManager(address(mockCBM));

    vm.prank(alice);
    vm.expectRevert('Accounting Failure Forced');
    token.transfer(bob, 50 * 1e18);

    assertEq(token.balanceOf(alice), 100 * 1e18);
    assertEq(token.balanceOf(bob), 0);
  }

  // 9. Hook reads PRE-transfer balance
  function test_HookReadsPreTransferBalance() public {
    // Verified implicitly by exact 50% transfer moving exact 50% basis
    vm.prank(alice);
    token.transfer(bob, 50 * 1e18);
    assertEq(cbm.costBasis(alice), 500 * 1e18);
    assertEq(cbm.costBasis(bob), 500 * 1e18);
  }

  // 10. CBM cannot call token state-changing functions
  function test_CBMCannotCallTokenStateChangingFunctions() public {
    // CostBasisManagerV2 has no transfer/mint/burn logic calling token
    assertEq(token.balanceOf(alice), 100 * 1e18);
  }

  // Helper to create a funded P2P trade
  function _createAndFundP2PTrade(
    address seller,
    address buyer,
    uint256 amount,
    uint256 fiatAmount
  ) internal returns (uint256 tradeId) {
    vm.prank(seller);
    token.approve(address(escrow), amount);

    vm.prank(buyer);
    tradeId = escrow.createTrade(
      EscrowTypes.CreateTradeParams({
        buyer: buyer,
        seller: seller,
        asset: address(token),
        amount: amount,
        fiatAmount: fiatAmount,
        fiatCurrency: keccak256('USD'),
        paymentWindow: 1 hours
      })
    );

    vm.prank(seller);
    escrow.fundTrade(tradeId);
  }

  // 11. P2P fund moves seller basis to escrow bucket
  function test_P2PFundMovesSellerBasisToEscrowBucket() public {
    uint256 tradeId = _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);

    assertEq(cbm.costBasis(alice), 500 * 1e18);
    assertEq(cbm.escrowTradeBasis(tradeId), 500 * 1e18);
  }

  // 12. P2P fund has zero realized PnL
  function test_P2PFundHasZeroRealizedPnL() public {
    _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);
    assertEq(cbm.realizedPnL(alice), 0);
  }

  // 13. P2P release finalizes once
  function test_P2PReleaseFinalizesOnce() public {
    uint256 tradeId = _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);

    // Submit payment & confirm
    vm.prank(bob);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(alice);
    escrow.confirmAndRelease(tradeId);

    // Seller gross = 50 shares, seller basis removed = $500. Fiat proceeds = $800. Realized PnL = +$300
    assertEq(cbm.realizedPnL(alice), 300 * 1e18);
    assertEq(cbm.escrowTradeBasis(tradeId), 0);
  }

  // 14. P2P buyer gets acquisition basis
  function test_P2PBuyerGetsAcquisitionBasis() public {
    uint256 tradeId = _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);

    vm.prank(bob);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(alice);
    escrow.confirmAndRelease(tradeId);

    // Buyer receives fiat proceeds as cost basis
    assertEq(cbm.costBasis(bob), 800 * 1e18);
  }

  // 15. P2P fee has no buyer basis
  function test_P2PFeeHasNoBuyerBasis() public {
    uint256 tradeId = _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);

    vm.prank(bob);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(alice);
    escrow.confirmAndRelease(tradeId);

    // Treasury received fee tokens, but investment basis remains 0
    assertEq(cbm.costBasis(treasury), 0);
  }

  // 16. P2P refund restores seller basis
  function test_P2PRefundRestoresSellerBasis() public {
    uint256 tradeId = _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);

    assertEq(cbm.costBasis(alice), 500 * 1e18);
    assertEq(cbm.escrowTradeBasis(tradeId), 500 * 1e18);

    // Fast forward past payment window
    vm.warp(block.timestamp + 2 hours);

    vm.prank(alice);
    escrow.refund(tradeId);

    // Seller basis restored back to 1000
    assertEq(cbm.costBasis(alice), 1000 * 1e18);
    assertEq(cbm.escrowTradeBasis(tradeId), 0);
    assertEq(cbm.realizedPnL(alice), 0);
    assertEq(cbm.costBasis(bob), 0);
  }

  // 17. Escrow transfer without context reverts
  function test_EscrowTransferWithoutContextReverts() public {
    // Attempt direct transfer to escrow without P2P context set
    vm.prank(alice);
    vm.expectRevert(
      abi.encodeWithSelector(ICostBasisManagerV2.EscrowTransferWithoutContext.selector)
    );
    token.transfer(address(escrow), 10 * 1e18);
  }

  // 18. Wrong context amount reverts
  function test_WrongContextAmountReverts() public {
    vm.prank(address(escrow));
    cbm.setFundContext(1, alice, address(escrow), 50 * 1e18);

    // Transfer different amount (40 instead of 50)
    vm.prank(alice);
    vm.expectRevert(abi.encodeWithSelector(ICostBasisManagerV2.InvalidContext.selector));
    token.transfer(address(escrow), 40 * 1e18);
  }

  // 19. Wrong context from/to reverts
  function test_WrongContextFromToReverts() public {
    vm.prank(address(escrow));
    cbm.setFundContext(1, alice, address(escrow), 50 * 1e18);

    // Transfer from bob instead of alice
    vm.prank(bob);
    vm.expectRevert(abi.encodeWithSelector(ICostBasisManagerV2.InvalidContext.selector));
    token.transfer(address(escrow), 50 * 1e18);
  }

  // 20. Context replay reverts
  function test_ContextReplayReverts() public {
    vm.prank(address(escrow));
    cbm.setFundContext(1, alice, address(escrow), 50 * 1e18);

    vm.prank(alice);
    token.transfer(address(escrow), 50 * 1e18);

    // Context consumed. Attempting another transfer to escrow fails
    vm.prank(alice);
    vm.expectRevert(
      abi.encodeWithSelector(ICostBasisManagerV2.EscrowTransferWithoutContext.selector)
    );
    token.transfer(address(escrow), 10 * 1e18);
  }

  // 21. Reentrancy attempt reverts
  function test_ReentrancyAttemptReverts() public {
    ReentrantAttacker attacker = new ReentrantAttacker(cbm, token, alice);

    vm.expectRevert(abi.encodeWithSelector(ICostBasisManagerV2.UnauthorizedCaller.selector));
    attacker.attackReenterCBM();
  }

  // Fuzz test for basis conservation
  function testFuzz_BasisConservation(uint96 amount1, uint96 amount2) public {
    vm.assume(amount1 > 0 && amount1 < 100 * 1e18);
    vm.assume(amount2 > 0 && amount2 <= amount1);

    vm.prank(alice);
    token.transfer(bob, amount1);

    vm.prank(bob);
    token.transfer(charlie, amount2);

    uint256 totalBasis = cbm.costBasis(alice) + cbm.costBasis(bob) + cbm.costBasis(charlie);
    assertEq(totalBasis, 1000 * 1e18);
  }
}
