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
  function setEscrowStatus(address, bool) external override {}
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
    cbm.onTokenTransfer(victim, address(this), 10 * 1e18, 100 * 1e18);
  }
}

contract CostBasisManagerV2Test is Test {
  CostBasisManagerV2 public cbm;
  UVBEV2 public token;
  P2PEscrowV2 public escrow;

  address public admin = address(this);
  address public controller = address(0x111);
  address public directory = address(0x222);
  address public treasury = address(0x333);

  address public alice = address(0xAA1);
  address public bob = address(0xBB2);
  address public charlie = address(0xCC3);

  function setUp() public {
    cbm = new CostBasisManagerV2(admin, directory);
    token = new UVBEV2(admin);
    escrow = new P2PEscrowV2(treasury, 100); // 1% fee

    cbm.grantRole(cbm.CONTROLLER_ROLE(), controller);
    cbm.setModules(address(0), address(token));
    cbm.setEscrowStatus(address(escrow), true);

    token.grantRole(token.CONTROLLER_ROLE(), admin);
    token.grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    token.setCostBasisManager(address(cbm));

    // Mint shares to alice
    token.mint(alice, 100 * 1e18);

    // Set initial cost basis for alice: $1,000 for 100 shares
    vm.prank(controller);
    cbm.recordDeposit(alice, 1000 * 1e18, 100 * 1e18);
  }

  // 1. Initial setup verification
  function test_InitialState() public {
    assertEq(cbm.costBasis(alice), 1000 * 1e18);
    assertEq(cbm.realizedPnL(alice), 0);
    assertEq(cbm.averageEntryPrice(alice), 10 * 1e18); // $10 per share
  }

  // 2. Deposit accumulates cost basis
  function test_RecordDepositAccumulatesBasis() public {
    vm.prank(controller);
    cbm.recordDeposit(alice, 500 * 1e18, 50 * 1e18);

    assertEq(cbm.costBasis(alice), 1500 * 1e18);
  }

  // 3. Ordinary Transfer moves proportional basis
  function test_OrdinaryTransferMovesProportionalBasis() public {
    // Alice transfers 50 shares (50%) to Bob
    vm.prank(alice);
    token.transfer(bob, 50 * 1e18);

    assertEq(cbm.costBasis(alice), 500 * 1e18);
    assertEq(cbm.costBasis(bob), 500 * 1e18);
    assertEq(cbm.realizedPnL(alice), 0);
    assertEq(cbm.realizedPnL(bob), 0);
  }

  // 4. Ordinary Transfer retains total basis conservation
  function test_OrdinaryTransferConservesTotalBasis() public {
    vm.prank(alice);
    token.transfer(bob, 30 * 1e18);

    vm.prank(bob);
    token.transfer(charlie, 10 * 1e18);

    uint256 totalBasis = cbm.costBasis(alice) + cbm.costBasis(bob) + cbm.costBasis(charlie);
    assertEq(totalBasis, 1000 * 1e18);
  }

  // 5. Redemption calculates realized PnL and reduces basis
  function test_RecordRedeemCalculatesRealizedPnL() public {
    // Alice redeems 50 shares (cost basis = $500) for $600 payout (+$100 realized gain)
    vm.prank(controller);
    cbm.recordRedeem(alice, 100 * 1e18, 50 * 1e18, 600 * 1e18);

    assertEq(cbm.costBasis(alice), 500 * 1e18);
    assertEq(cbm.realizedPnL(alice), 100 * 1e18);
  }

  // 6. Full redemption clears basis
  function test_FullRedemptionClearsBasis() public {
    vm.prank(controller);
    cbm.recordRedeem(alice, 100 * 1e18, 100 * 1e18, 1200 * 1e18);

    assertEq(cbm.costBasis(alice), 0);
    assertEq(cbm.realizedPnL(alice), 200 * 1e18);
  }

  // 7. Migration hook sets accounting state
  function test_MigrateAccounting() public {
    address newUser = address(0x999);
    cbm.migrateAccounting(newUser, 2000 * 1e18, 150 * 1e18, block.timestamp);

    assertEq(cbm.costBasis(newUser), 2000 * 1e18);
    assertEq(cbm.realizedPnL(newUser), 150 * 1e18);
  }

  // Helper for P2P trade
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

  // 8. P2P fund does NOT mutate seller cost basis or generate realized PnL
  function test_P2PFundDoesNotMutateSellerCostBasis() public {
    _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);

    // Escrow exclusion guard prevents portfolio accounting mutation
    assertEq(cbm.costBasis(alice), 1000 * 1e18);
    assertEq(cbm.realizedPnL(alice), 0);
  }

  // 9. P2P release does NOT mutate buyer or seller investment cost basis or generate realized PnL
  function test_P2PReleaseDoesNotMutateBuyerOrSellerCostBasis() public {
    uint256 tradeId = _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);

    vm.prank(bob);
    escrow.submitPayment(tradeId, keccak256('REF1'), keccak256('EVIDENCE1'));

    vm.prank(alice);
    escrow.confirmAndRelease(tradeId);

    // P2P release does NOT alter investment cost basis or generate investment PnL
    assertEq(cbm.realizedPnL(alice), 0);
    assertEq(cbm.costBasis(alice), 1000 * 1e18);
    assertEq(cbm.costBasis(bob), 0);
  }

  // 10. P2P refund does NOT mutate portfolio cost basis
  function test_P2PRefundDoesNotMutateCostBasis() public {
    uint256 tradeId = _createAndFundP2PTrade(alice, bob, 50 * 1e18, 800 * 1e18);

    vm.warp(block.timestamp + 2 hours);

    vm.prank(alice);
    escrow.refund(tradeId);

    assertEq(cbm.costBasis(alice), 1000 * 1e18);
    assertEq(cbm.realizedPnL(alice), 0);
    assertEq(cbm.costBasis(bob), 0);
  }

  // 11. Reentrancy attempt reverts
  function test_ReentrancyAttemptReverts() public {
    ReentrantAttacker attacker = new ReentrantAttacker(cbm, token, alice);

    vm.expectRevert(abi.encodeWithSelector(ICostBasisManagerV2.UnauthorizedCaller.selector));
    attacker.attackReenterCBM();
  }

  // Fuzz test for basis conservation on ordinary transfers
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
