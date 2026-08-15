// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/escrow/P2PEscrow.sol';
import { Errors as ProtocolErrors } from '../../src/errors/Errors.sol';
import '../../src/events/Events.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/types/EscrowTypes.sol';
import { UVBTCETHToken } from '../../src/token/UVBTCETHToken.sol';

contract MockERC20 is ERC20 {
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

contract P2PEscrowTest is Test {
  P2PEscrow public escrow;
  MockERC20 public token;

  address public admin = address(this);
  address public treasury = address(0x888);
  address public arbitrator = address(0x999);
  address public seller = address(0x111);
  address public buyer = address(0x222);
  address public attacker = address(0x666);

  uint256 public constant TRADE_AMOUNT = 1000 * 1e18;
  uint256 public constant FIAT_AMOUNT = 1000 * 1e2; // 1000.00 USD
  bytes32 public constant CURRENCY_USD = keccak256('USD');
  uint256 public constant PAYMENT_WINDOW = 15 minutes;

  function setUp() public {
    escrow = new P2PEscrow(treasury, 10); // 0.10% fee (10 bps)

    token = new MockERC20('USD Coin', 'USDC', 18);

    // Grant Arbitrator role
    escrow.grantRole(AccessRoles.ARBITRATOR_ROLE, arbitrator);

    // Distribute funds
    token.mint(seller, 100000 * 1e18);
    token.mint(buyer, 100000 * 1e18);

    vm.deal(seller, 100 ether);
    vm.deal(buyer, 100 ether);

    vm.prank(seller);
    token.approve(address(escrow), type(uint256).max);

    vm.prank(buyer);
    token.approve(address(escrow), type(uint256).max);
  }

  // --- Trade Creation Tests ---

  function test_CreateTrade_Success_ERC20() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.expectEmit(true, true, true, true);
    emit Events.TradeCreated(
      1,
      seller,
      buyer,
      address(token),
      TRADE_AMOUNT,
      FIAT_AMOUNT,
      CURRENCY_USD,
      PAYMENT_WINDOW
    );

    uint256 tradeId = escrow.createTrade(params);
    assertEq(tradeId, 1);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.CREATED));
    assertEq(trade.buyer, buyer);
    assertEq(trade.seller, seller);
    assertEq(trade.amount, TRADE_AMOUNT);
  }

  function test_CreateTrade_AutoFund_Native() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(0),
      amount: 1 ether,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.prank(seller);
    uint256 tradeId = escrow.createTrade{ value: 1 ether }(params);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.FUNDED));
    assertEq(address(escrow).balance, 1 ether);
  }

  function test_CreateTrade_Revert_InvalidBuyerSeller() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: seller, // buyer == seller
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.expectRevert(ProtocolErrors.InvalidTradeParty.selector);
    escrow.createTrade(params);
  }

  function test_CreateTrade_Revert_ZeroAmount() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: 0,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.expectRevert(ProtocolErrors.MathCalculationOverflow.selector);
    escrow.createTrade(params);
  }

  function test_CreateTrade_Revert_PaymentWindowTooShort() public {
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: 2 minutes // < 5 minutes
    });

    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.MinimumPaymentWindowNotMet.selector,
        2 minutes,
        5 minutes
      )
    );
    escrow.createTrade(params);
  }

  // --- Funding Tests ---

  function test_FundTrade_Success_ERC20() public {
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

    vm.prank(seller);
    vm.expectEmit(true, true, false, true);
    emit Events.EscrowFunded(tradeId, seller, TRADE_AMOUNT, block.timestamp);

    escrow.fundTrade(tradeId);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.FUNDED));
    assertEq(token.balanceOf(address(escrow)), TRADE_AMOUNT);
  }

  function test_FundTrade_Revert_Unauthorized() public {
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

    vm.prank(buyer);
    vm.expectRevert(ProtocolErrors.InvalidTradeParty.selector);
    escrow.fundTrade(tradeId);
  }

  // --- Payment Submission Tests ---

  function test_SubmitPayment_Success() public {
    uint256 tradeId = _createAndFundTradeERC20();

    bytes32 utrRef = keccak256('UTR123456789');
    bytes32 evidenceHash = keccak256('RECEIPT_IPFS_CID_HASH');

    vm.prank(buyer);
    vm.expectEmit(true, true, false, true);
    emit Events.PaymentSubmitted(tradeId, buyer, utrRef, evidenceHash, block.timestamp);

    escrow.submitPayment(tradeId, utrRef, evidenceHash);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.PAYMENT_SUBMITTED));
    assertEq(trade.paymentReference, utrRef);
    assertEq(trade.evidenceHash, evidenceHash);
    assertTrue(escrow.isEvidenceHashUsed(evidenceHash));
  }

  function test_SubmitPayment_Revert_EvidenceHashReplay() public {
    uint256 tradeId1 = _createAndFundTradeERC20();
    bytes32 utrRef = keccak256('UTR123456789');
    bytes32 evidenceHash = keccak256('RECEIPT_IPFS_CID_HASH');

    vm.prank(buyer);
    escrow.submitPayment(tradeId1, utrRef, evidenceHash);

    // Second trade trying to use same evidence hash
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });
    uint256 tradeId2 = escrow.createTrade(params);
    vm.prank(seller);
    escrow.fundTrade(tradeId2);

    vm.prank(buyer);
    vm.expectRevert(
      abi.encodeWithSelector(ProtocolErrors.EvidenceHashAlreadyUsed.selector, evidenceHash)
    );
    escrow.submitPayment(tradeId2, keccak256('UTR999'), evidenceHash);
  }

  function test_SubmitPayment_Revert_ExpiredWindow() public {
    uint256 tradeId = _createAndFundTradeERC20();

    // Fast forward past payment window
    vm.warp(block.timestamp + PAYMENT_WINDOW + 1 seconds);

    vm.prank(buyer);
    vm.expectRevert();
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));
  }

  // --- Confirm and Release Tests ---

  function test_ConfirmAndRelease_Success() public {
    uint256 tradeId = _createAndFundTradeERC20();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    uint256 fee = (TRADE_AMOUNT * 10) / 10000;
    uint256 netPayout = TRADE_AMOUNT - fee;

    uint256 buyerBalBefore = token.balanceOf(buyer);
    uint256 treasuryBalBefore = token.balanceOf(treasury);

    vm.prank(seller);
    vm.expectEmit(true, true, false, true);
    emit Events.EscrowReleased(tradeId, buyer, netPayout, fee);

    escrow.confirmAndRelease(tradeId);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.RELEASED));

    assertEq(token.balanceOf(buyer), buyerBalBefore + netPayout);
    assertEq(token.balanceOf(treasury), treasuryBalBefore + fee);
  }

  function test_ConfirmAndRelease_DoubleRelease_Prevented() public {
    uint256 tradeId = _createAndFundTradeERC20();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    // Second release attempt must revert
    vm.prank(seller);
    vm.expectRevert();
    escrow.confirmAndRelease(tradeId);
  }

  // --- Refund Tests ---

  function test_Refund_Success_ExpiredPaymentWindow() public {
    uint256 tradeId = _createAndFundTradeERC20();

    // Warp past payment window without payment submission
    vm.warp(block.timestamp + PAYMENT_WINDOW + 1 seconds);

    uint256 sellerBalBefore = token.balanceOf(seller);

    vm.prank(seller);
    vm.expectEmit(true, true, false, true);
    emit Events.EscrowRefunded(tradeId, seller, TRADE_AMOUNT);

    escrow.refund(tradeId);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.REFUNDED));
    assertEq(token.balanceOf(seller), sellerBalBefore + TRADE_AMOUNT);
  }

  function test_Refund_Success_VoluntaryBuyerForfeit() public {
    uint256 tradeId = _createAndFundTradeERC20();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    // Buyer voluntarily cancels / refunds seller
    vm.prank(buyer);
    escrow.refund(tradeId);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.REFUNDED));
  }

  function test_Refund_Revert_ActiveWindow() public {
    uint256 tradeId = _createAndFundTradeERC20();

    // Still within payment window, seller tries to refund
    vm.prank(seller);
    vm.expectRevert();
    escrow.refund(tradeId);
  }

  function test_DoubleRefund_Prevented() public {
    uint256 tradeId = _createAndFundTradeERC20();
    vm.warp(block.timestamp + PAYMENT_WINDOW + 1 seconds);

    vm.prank(seller);
    escrow.refund(tradeId);

    vm.prank(seller);
    vm.expectRevert();
    escrow.refund(tradeId);
  }

  function test_ReleaseAfterRefund_Prevented() public {
    uint256 tradeId = _createAndFundTradeERC20();
    vm.warp(block.timestamp + PAYMENT_WINDOW + 1 seconds);

    vm.prank(seller);
    escrow.refund(tradeId);

    vm.prank(seller);
    vm.expectRevert();
    escrow.confirmAndRelease(tradeId);
  }

  function test_RefundAfterRelease_Prevented() public {
    uint256 tradeId = _createAndFundTradeERC20();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    vm.prank(seller);
    vm.expectRevert();
    escrow.refund(tradeId);
  }

  // --- Dispute Resolution Tests ---

  function test_Dispute_RaiseAndResolve_ReleaseToBuyer() public {
    uint256 tradeId = _createAndFundTradeERC20();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    // Raise dispute
    bytes32 reason = keccak256('SELLER_NOT_RESPONDING');
    vm.prank(buyer);
    vm.expectEmit(true, true, false, true);
    emit Events.DisputeRaised(tradeId, buyer, reason);

    escrow.raiseDispute(tradeId, reason);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.DISPUTED));

    // Resolve dispute as Arbitrator
    vm.prank(arbitrator);
    vm.expectEmit(true, true, false, true);
    emit Events.DisputeResolved(
      tradeId,
      arbitrator,
      uint8(EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER),
      TRADE_AMOUNT
    );

    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER);

    trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.RELEASED));
  }

  function test_Dispute_Resolve_RefundToSeller() public {
    uint256 tradeId = _createAndFundTradeERC20();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    vm.prank(seller);
    escrow.raiseDispute(tradeId, keccak256('FAKE_RECEIPT'));

    vm.prank(arbitrator);
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.REFUND_TO_SELLER);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.REFUNDED));
  }

  function test_Dispute_Revert_UnauthorizedResolver() public {
    uint256 tradeId = _createAndFundTradeERC20();

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR'), keccak256('HASH'));

    vm.prank(seller);
    escrow.raiseDispute(tradeId, keccak256('FAKE_RECEIPT'));

    vm.prank(attacker);
    vm.expectRevert(
      abi.encodeWithSelector(ProtocolErrors.UnauthorizedDisputeResolver.selector, attacker)
    );
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER);
  }

  // --- Unfunded Cancellation Test ---

  function test_CancelUnfundedTrade_Success() public {
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

    vm.prank(seller);
    escrow.cancelUnfundedTrade(tradeId);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.CANCELLED));
  }

  // --- Admin Configuration Tests ---

  function test_SetFeeConfig_Success() public {
    vm.expectEmit(false, false, false, true);
    emit Events.FeeConfigUpdated(10, 50);

    escrow.setFeeConfig(50); // 0.50%
    assertEq(escrow.feeBps(), 50);
  }

  function test_SetFeeConfig_Revert_ExceedsMax() public {
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.FeeExceedsMaximum.selector, 600, 500));
    escrow.setFeeConfig(600); // 6.00% > 5.00% max
  }

  // --- Pausable Guard Test ---

  function test_PauseUnpause_GuardsActions() public {
    escrow.pause();

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: TRADE_AMOUNT,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    vm.expectRevert();
    escrow.createTrade(params);

    escrow.unpause();
    uint256 tradeId = escrow.createTrade(params);
    assertEq(tradeId, 1);
  }

  // --- Helper Functions ---

  function _createAndFundTradeERC20() internal returns (uint256 tradeId) {
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

  // --- UVBTCETH (UVBE) Specific P2P Escrow Tests ---

  function test_UVBTCETH_CreateTrade() public {
    UVBTCETHToken uvToken = new UVBTCETHToken();
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), address(this));
    uvToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    uvToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(uvToken),
      amount: 100 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);
    assertEq(tradeId, 1);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.CREATED));
    assertEq(trade.asset, address(uvToken));
    assertEq(trade.amount, 100 * 1e18);
  }

  function test_UVBTCETH_SellerFundsEscrow() public {
    UVBTCETHToken uvToken = new UVBTCETHToken();
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), address(this));
    uvToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    uvToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(uvToken),
      amount: 100 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.FUNDED));
    assertEq(uvToken.balanceOf(address(escrow)), 100 * 1e18);
  }

  function test_UVBTCETH_BuyerSubmitsPayment() public {
    UVBTCETHToken uvToken = new UVBTCETHToken();
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), address(this));
    uvToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    uvToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(uvToken),
      amount: 100 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    bytes32 ref = keccak256('UTR123456');
    bytes32 hash = keccak256('receipt.pdf');

    vm.prank(buyer);
    escrow.submitPayment(tradeId, ref, hash);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.PAYMENT_SUBMITTED));
    assertEq(trade.paymentReference, ref);
    assertEq(trade.evidenceHash, hash);
  }

  function test_UVBTCETH_SellerConfirmsRelease_BuyerReceivesExactAmount() public {
    UVBTCETHToken uvToken = new UVBTCETHToken();
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), address(this));
    uvToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    uvToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(uvToken),
      amount: 100 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    bytes32 ref = keccak256('UTR123456');
    bytes32 hash = keccak256('receipt.pdf');

    vm.prank(buyer);
    escrow.submitPayment(tradeId, ref, hash);

    uint256 buyerBalanceBefore = uvToken.balanceOf(buyer);
    uint256 treasuryBalanceBefore = uvToken.balanceOf(treasury);

    vm.prank(seller);
    escrow.confirmAndRelease(tradeId);

    uint256 fee = (100 * 1e18 * 10) / 10000; // 0.10% = 0.1 * 1e18
    uint256 expectedNetPayout = 100 * 1e18 - fee; // 99.9 * 1e18

    assertEq(uvToken.balanceOf(buyer) - buyerBalanceBefore, expectedNetPayout);
    assertEq(uvToken.balanceOf(treasury) - treasuryBalanceBefore, fee);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.RELEASED));
  }

  function test_UVBTCETH_SellerRefundPath() public {
    UVBTCETHToken uvToken = new UVBTCETHToken();
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), address(this));
    uvToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    uvToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(uvToken),
      amount: 100 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    // Warp past payment window
    vm.warp(block.timestamp + PAYMENT_WINDOW + 1);

    uint256 sellerBalanceBefore = uvToken.balanceOf(seller);

    vm.prank(seller);
    escrow.refund(tradeId);

    assertEq(uvToken.balanceOf(seller) - sellerBalanceBefore, 100 * 1e18);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.REFUNDED));
  }

  function test_UVBTCETH_Dispute_ArbitratorReleaseToBuyer() public {
    UVBTCETHToken uvToken = new UVBTCETHToken();
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), address(this));
    uvToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    uvToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(uvToken),
      amount: 100 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR_DISPUTE_BUYER'), keccak256('HASH_BUYER'));

    vm.prank(buyer);
    escrow.raiseDispute(tradeId, keccak256('REASON'));

    uint256 buyerBalanceBefore = uvToken.balanceOf(buyer);

    vm.prank(arbitrator);
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER);

    uint256 fee = (100 * 1e18 * 10) / 10000;
    uint256 expectedNetPayout = 100 * 1e18 - fee;

    assertEq(uvToken.balanceOf(buyer) - buyerBalanceBefore, expectedNetPayout);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.RELEASED));
  }

  function test_UVBTCETH_Dispute_ArbitratorRefundToSeller() public {
    UVBTCETHToken uvToken = new UVBTCETHToken();
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), address(this));
    uvToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    uvToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(uvToken),
      amount: 100 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR_DISPUTE_SELLER'), keccak256('HASH_SELLER'));

    vm.prank(seller);
    escrow.raiseDispute(tradeId, keccak256('REASON_SELLER'));

    uint256 sellerBalanceBefore = uvToken.balanceOf(seller);

    vm.prank(arbitrator);
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.REFUND_TO_SELLER);

    assertEq(uvToken.balanceOf(seller) - sellerBalanceBefore, 100 * 1e18);

    EscrowTypes.Trade memory trade = escrow.getTrade(tradeId);
    assertEq(uint8(trade.state), uint8(EscrowTypes.TradeState.REFUNDED));
  }

  function test_UVBTCETH_UnauthorizedPartyCannotMoveTokens() public {
    UVBTCETHToken uvToken = new UVBTCETHToken();
    uvToken.grantRole(uvToken.CONTROLLER_ROLE(), address(this));
    uvToken.mint(seller, 1000 * 1e18);

    vm.prank(seller);
    uvToken.approve(address(escrow), type(uint256).max);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(uvToken),
      amount: 100 * 1e18,
      fiatAmount: FIAT_AMOUNT,
      fiatCurrency: CURRENCY_USD,
      paymentWindow: PAYMENT_WINDOW
    });

    uint256 tradeId = escrow.createTrade(params);

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    // Attacker tries to confirm & release
    vm.prank(attacker);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.InvalidTradeParty.selector));
    escrow.confirmAndRelease(tradeId);

    // Attacker tries to refund
    vm.prank(attacker);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.InvalidTradeParty.selector));
    escrow.refund(tradeId);

    // Buyer submits payment and raises dispute to transition trade to DISPUTED state
    vm.prank(buyer);
    escrow.submitPayment(tradeId, keccak256('UTR_UNAUTH'), keccak256('HASH_UNAUTH'));

    vm.prank(buyer);
    escrow.raiseDispute(tradeId, keccak256('REASON_UNAUTH'));

    // Attacker tries to resolve dispute
    vm.prank(attacker);
    vm.expectRevert(
      abi.encodeWithSelector(ProtocolErrors.UnauthorizedDisputeResolver.selector, attacker)
    );
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER);

    // Escrow balance remains untouched
    assertEq(uvToken.balanceOf(address(escrow)), 100 * 1e18);
  }
}
