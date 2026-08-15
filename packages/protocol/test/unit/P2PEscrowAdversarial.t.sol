// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/escrow/P2PEscrow.sol';
import { Errors as ProtocolErrors } from '../../src/errors/Errors.sol';
import '../../src/events/Events.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/types/EscrowTypes.sol';

contract MaliciousReentrantAttacker {
  P2PEscrow public escrow;
  uint256 public tradeId;
  bool public attackExecuted;

  constructor(address payable escrowAddress) {
    escrow = P2PEscrow(escrowAddress);
  }

  function setTradeId(uint256 id) external {
    tradeId = id;
  }

  receive() external payable {
    if (!attackExecuted && address(escrow).balance > 0) {
      attackExecuted = true;
      // Reentrancy attack attempt during native ETH payout
      try escrow.confirmAndRelease(tradeId) {} catch {}
      try escrow.refund(tradeId) {} catch {}
    }
  }
}

contract MockERC20Adversarial is ERC20 {
  uint8 private _decimals;

  constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
    _decimals = decimals_;
    _mint(msg.sender, 1000000 * 10 ** decimals_);
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockFeeOnTransferToken is ERC20 {
  constructor(string memory name, string memory symbol, uint8) ERC20(name, symbol) {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }

  function _update(address from, address to, uint256 value) internal override {
    if (from != address(0) && to != address(0)) {
      uint256 fee = (value * 10) / 100; // 10% fee on transfer
      super._update(from, address(0xdad), fee);
      super._update(from, to, value - fee);
    } else {
      super._update(from, to, value);
    }
  }
}

contract P2PEscrowAdversarialTest is Test {
  P2PEscrow public escrow;
  MockERC20Adversarial public token;

  address public treasury = address(0x888);
  address public arbitrator = address(0x999);
  address public seller = address(0x111);
  address public buyer = address(0x222);
  address public attacker = address(0x666);

  uint256 public constant TRADE_AMOUNT = 1000 * 1e18;
  uint256 public constant FIAT_AMOUNT = 1000 * 1e2;
  bytes32 public constant CURRENCY_USD = keccak256('USD');
  uint256 public constant PAYMENT_WINDOW = 15 minutes;

  function setUp() public {
    escrow = new P2PEscrow(treasury, 10); // 0.10% fee
    token = new MockERC20Adversarial('USD Coin', 'USDC', 18);

    escrow.grantRole(AccessRoles.ARBITRATOR_ROLE, arbitrator);

    token.mint(seller, 100000 * 1e18);
    token.mint(buyer, 100000 * 1e18);

    vm.deal(seller, 100 ether);
    vm.deal(buyer, 100 ether);

    vm.prank(seller);
    token.approve(address(escrow), type(uint256).max);

    vm.prank(buyer);
    token.approve(address(escrow), type(uint256).max);
  }

  // 1. Reentrancy Attack Test
  function test_Adversarial_ReentrancyProtection_NativeETH() public {
    MaliciousReentrantAttacker reentrantBuyer = new MaliciousReentrantAttacker(
      payable(address(escrow))
    );

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: address(reentrantBuyer),
      seller: seller,
      asset: address(0), // Native ETH
      amount: 1 ether,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(seller);
    uint256 tradeId = escrow.createTrade{ value: 1 ether }(params);
    reentrantBuyer.setTradeId(tradeId);

    vm.prank(address(reentrantBuyer));
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    // Seller confirms release to reentrant buyer
    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    // Verify trade completed safely and no double withdrawal occurred
    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.RELEASED));
    assertEq(address(escrow).balance, 0);
  }

  // 2. Unauthorized Release Attempt
  function test_Adversarial_UnauthorizedRelease_Prevented() public {
    uint256 tradeId = _createAndFundTrade();
    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    // Buyer or attacker attempts to self-release funds
    vm.prank(buyer);
    vm.expectRevert(ProtocolErrors.InvalidTradeParty.selector);
    escrow.confirmAndRelease(tradeId);

    vm.prank(attacker);
    vm.expectRevert(ProtocolErrors.InvalidTradeParty.selector);
    escrow.confirmAndRelease(tradeId);
  }

  // 3. Unauthorized Refund Attempt
  function test_Adversarial_UnauthorizedRefund_Prevented() public {
    uint256 tradeId = _createAndFundTrade();

    // Seller tries to claim refund while payment window is active
    vm.prank(seller);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.TradePaymentWindowActive.selector,
        tradeId,
        block.timestamp + PAYMENT_WINDOW,
        block.timestamp
      )
    );
    escrow.refund(tradeId);

    // Attacker tries to refund non-existent trade
    vm.prank(attacker);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.TradeDoesNotExist.selector, 9999));
    escrow.refund(9999);
  }

  // 4. Evidence Replay & Tampering Attempt
  function test_Adversarial_EvidenceReplay_Prevented() public {
    uint256 tradeId1 = _createAndFundTrade();
    bytes32 evidenceHash = keccak256('EVIDENCE_PROOF_A');

    vm.prank(buyer);
    escrow.submitPayment(tradeId1, keccak256('UTR1'), evidenceHash);

    // Attacker tries to reuse same evidence hash on a different trade
    uint256 tradeId2 = _createAndFundTrade();
    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(ProtocolErrors.EvidenceHashAlreadyUsed.selector, evidenceHash)
    );
    escrow.submitPayment(tradeId2, keccak256('UTR2'), evidenceHash);
  }

  // 5. Malicious Seller Claiming Refund after Buyer Submitted Payment
  function test_Adversarial_MaliciousSellerRefundAfterPayment_Prevented() public {
    uint256 tradeId = _createAndFundTrade();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    // Fast forward time past payment window
    vm.warp(block.timestamp + PAYMENT_WINDOW + 10 minutes);

    // Seller attempts to call refund after buyer submitted payment
    vm.prank(seller);
    vm.expectRevert(ProtocolErrors.InvalidTradeParty.selector);
    escrow.refund(tradeId);
  }

  // 6. State Transition Bypass Attempt
  function test_Adversarial_StateTransitionBypass_Prevented() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    // Attempting to skip FUNDED and submit payment directly
    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.InvalidTradeState.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.CREATED),
        uint8(EscrowTypes.TradeState.FUNDED)
      )
    );
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    // Attempting to skip to confirmAndRelease directly from CREATED
    vm.prank(seller);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.InvalidTradeState.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.CREATED),
        uint8(EscrowTypes.TradeState.PAYMENT_SUBMITTED)
      )
    );
    escrow.confirmAndRelease(tradeId);
  }

  // 7. Double Spending / Double Release Attempt
  function test_Adversarial_DoubleSpending_Prevented() public {
    uint256 tradeId = _createAndFundTrade();
    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    // First release
    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    // Second release attempt
    vm.prank(seller);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.InvalidTradeState.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.RELEASED),
        uint8(EscrowTypes.TradeState.PAYMENT_SUBMITTED)
      )
    );
    escrow.confirmAndRelease(tradeId);

    // Refund attempt after release
    vm.prank(seller);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.InvalidTradeState.selector,
        tradeId,
        uint8(EscrowTypes.TradeState.RELEASED),
        uint8(EscrowTypes.TradeState.FUNDED)
      )
    );
    escrow.refund(tradeId);
  }

  // 8. Unauthorized Dispute Resolution Attempt
  function test_Adversarial_UnauthorizedArbitrator_Prevented() public {
    uint256 tradeId = _createAndFundTrade();
    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    vm.prank(buyer);
    escrow.raiseDispute(tradeId, keccak256('REASON'));

    // Attacker attempts to resolve dispute
    vm.prank(attacker);
    vm.expectRevert(
      abi.encodeWithSelector(ProtocolErrors.UnauthorizedDisputeResolver.selector, attacker)
    );
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER);
  }

  // 9. Fee Cap Protection
  function test_Adversarial_FeeCap_Enforced() public {
    // Attempting to set fee > 500 bps (5.00%)
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.FeeExceedsMaximum.selector, 501, 500));
    escrow.setFeeConfig(501);
  }

  // 10. H-01: Payment Reference Uniqueness (Replay & Different Hashes)
  function test_Adversarial_DuplicatePaymentReference_Prevented() public {
    uint256 tradeId1 = _createAndFundTrade();
    bytes32 utrRef = keccak256('UTR_123456');

    vm.prank(buyer);
    escrow.submitPayment(tradeId1, utrRef, keccak256('HASH_1'));

    // Attacker or buyer attempts to reuse same UTR with different evidence hash on trade 2
    uint256 tradeId2 = _createAndFundTrade();
    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(ProtocolErrors.PaymentReferenceAlreadyUsed.selector, utrRef)
    );
    escrow.submitPayment(tradeId2, utrRef, keccak256('HASH_2'));
  }

  // 11. M-01: Fee-on-Transfer Token Policy (Rejection of Unsupported Assets)
  function test_Adversarial_FeeOnTransferToken_RejectsTransferDeficit() public {
    // Deploy a mock fee-on-transfer token that deducts 10% fee on transfer
    MockFeeOnTransferToken fotToken = new MockFeeOnTransferToken('Fee Token', 'FOT', 18);
    fotToken.mint(seller, 10000 * 1e18);

    vm.prank(seller);
    fotToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(fotToken),
      amount: 1000 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    // Expect funding to revert with TransferExecutionFailed because received amount < trade.amount
    vm.prank(seller);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.TransferExecutionFailed.selector,
        address(fotToken),
        address(escrow),
        1000 * 1e18
      )
    );
    escrow.fundTrade(tradeId);
  }

  // 12. L-01: Zero Treasury Address Prevention
  function test_Adversarial_ZeroTreasury_Prevented() public {
    // 1. Constructor zero treasury check
    vm.expectRevert(ProtocolErrors.ZeroAddressDetected.selector);
    new P2PEscrow(address(0), 10);

    // 2. setTreasury zero address update check
    vm.expectRevert(ProtocolErrors.ZeroAddressDetected.selector);
    escrow.setTreasury(address(0));
  }

  // Helper
  function _createAndFundTrade() internal returns (uint256 tradeId) {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });
    tradeId = escrow.createTrade(params);
    vm.prank(seller);
    escrow.fundTrade(tradeId);
  }
}
