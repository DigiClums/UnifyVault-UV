// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '../errors/Errors.sol';
import '../events/Events.sol';
import '../libraries/AccessRoles.sol';
import '../libraries/AddressValidationLib.sol';
import '../types/EscrowTypes.sol';
import '../interfaces/IP2PEscrow.sol';
import '../interfaces/ICostBasisManagerV2.sol';

/**
 * @title P2PEscrowV2
 * @notice Non-custodial P2P escrow protocol V2 for UnifyVault, integrated with CostBasisManagerV2.
 */
contract P2PEscrowV2 is IP2PEscrow, AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  uint256 public constant MIN_PAYMENT_WINDOW = 5 minutes;
  uint256 public constant MAX_FEE_BPS = 500; // 5.00% max fee cap

  uint256 private _tradeCounter;
  mapping(uint256 => EscrowTypes.Trade) private _trades;
  mapping(bytes32 => bool) private _usedEvidenceHashes;
  mapping(bytes32 => bool) private _usedPaymentReferences;

  address public treasury;
  uint256 public feeBps;

  ICostBasisManagerV2 public costBasisManager;

  modifier onlyTradeParty(uint256 tradeId) {
    EscrowTypes.Trade memory trade = _trades[tradeId];
    if (trade.state == EscrowTypes.TradeState.NONE) {
      revert ProtocolErrors.TradeDoesNotExist(tradeId);
    }
    if (msg.sender != trade.buyer && msg.sender != trade.seller) {
      revert ProtocolErrors.InvalidTradeParty();
    }
    _;
  }

  modifier onlySeller(uint256 tradeId) {
    EscrowTypes.Trade memory trade = _trades[tradeId];
    if (trade.state == EscrowTypes.TradeState.NONE) {
      revert ProtocolErrors.TradeDoesNotExist(tradeId);
    }
    if (msg.sender != trade.seller) {
      revert ProtocolErrors.InvalidTradeParty();
    }
    _;
  }

  modifier onlyBuyer(uint256 tradeId) {
    EscrowTypes.Trade memory trade = _trades[tradeId];
    if (trade.state == EscrowTypes.TradeState.NONE) {
      revert ProtocolErrors.TradeDoesNotExist(tradeId);
    }
    if (msg.sender != trade.buyer) {
      revert ProtocolErrors.InvalidTradeParty();
    }
    _;
  }

  modifier inState(uint256 tradeId, EscrowTypes.TradeState expected) {
    EscrowTypes.Trade memory trade = _trades[tradeId];
    if (trade.state == EscrowTypes.TradeState.NONE) {
      revert ProtocolErrors.TradeDoesNotExist(tradeId);
    }
    if (trade.state != expected) {
      revert ProtocolErrors.InvalidTradeState(tradeId, uint8(trade.state), uint8(expected));
    }
    _;
  }

  constructor(address initialTreasury, uint256 initialFeeBps, address cbmAddress) {
    AddressValidationLib.validateNonZeroAddress(initialTreasury);
    if (initialFeeBps > MAX_FEE_BPS) {
      revert ProtocolErrors.FeeExceedsMaximum(initialFeeBps, MAX_FEE_BPS);
    }
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
    _grantRole(AccessRoles.GUARDIAN_ROLE, msg.sender);
    _grantRole(AccessRoles.ARBITRATOR_ROLE, msg.sender);

    treasury = initialTreasury;
    feeBps = initialFeeBps;
    if (cbmAddress != address(0)) {
      costBasisManager = ICostBasisManagerV2(cbmAddress);
    }
  }

  receive() external payable {}

  function setCostBasisManager(address cbmAddress) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    costBasisManager = ICostBasisManagerV2(cbmAddress);
  }

  function createTrade(
    EscrowTypes.CreateTradeParams calldata params
  ) external payable override nonReentrant whenNotPaused returns (uint256 tradeId) {
    if (
      params.buyer == address(0) || params.seller == address(0) || params.buyer == params.seller
    ) {
      revert ProtocolErrors.InvalidTradeParty();
    }
    if (params.amount == 0) {
      revert ProtocolErrors.MathCalculationOverflow();
    }
    if (params.paymentWindow < MIN_PAYMENT_WINDOW) {
      revert ProtocolErrors.MinimumPaymentWindowNotMet(params.paymentWindow, MIN_PAYMENT_WINDOW);
    }

    _tradeCounter++;
    tradeId = _tradeCounter;

    _trades[tradeId] = EscrowTypes.Trade({
      tradeId: tradeId,
      buyer: params.buyer,
      seller: params.seller,
      asset: params.asset,
      amount: params.amount,
      fiatAmount: params.fiatAmount,
      fiatCurrency: params.fiatCurrency,
      state: EscrowTypes.TradeState.CREATED,
      paymentWindow: params.paymentWindow,
      fundingTimestamp: 0,
      paymentTimestamp: 0,
      paymentReference: bytes32(0),
      evidenceHash: bytes32(0),
      disputeInitiator: address(0)
    });

    emit Events.TradeCreated(
      tradeId,
      params.seller,
      params.buyer,
      params.asset,
      params.amount,
      params.fiatAmount,
      params.fiatCurrency,
      params.paymentWindow
    );

    if (msg.sender == params.seller) {
      if (params.asset == address(0)) {
        if (msg.value == params.amount) {
          _fundTradeInternal(tradeId);
        } else if (msg.value > 0) {
          revert ProtocolErrors.IncorrectNativeAmount(params.amount, msg.value);
        }
      } else {
        if (msg.value > 0) {
          revert ProtocolErrors.IncorrectNativeAmount(0, msg.value);
        }
        uint256 currentAllowance = IERC20(params.asset).allowance(msg.sender, address(this));
        if (currentAllowance >= params.amount) {
          _executeFundingTransfer(tradeId, params.seller, params.asset, params.amount);
        }
      }
    } else {
      if (msg.value > 0) {
        revert ProtocolErrors.IncorrectNativeAmount(0, msg.value);
      }
    }
  }

  function fundTrade(
    uint256 tradeId
  )
    external
    payable
    override
    nonReentrant
    whenNotPaused
    onlySeller(tradeId)
    inState(tradeId, EscrowTypes.TradeState.CREATED)
  {
    EscrowTypes.Trade storage trade = _trades[tradeId];

    if (trade.asset == address(0)) {
      if (msg.value != trade.amount) {
        revert ProtocolErrors.IncorrectNativeAmount(trade.amount, msg.value);
      }
      _fundTradeInternal(tradeId);
    } else {
      if (msg.value > 0) {
        revert ProtocolErrors.IncorrectNativeAmount(0, msg.value);
      }
      _executeFundingTransfer(tradeId, trade.seller, trade.asset, trade.amount);
    }
  }

  function _executeFundingTransfer(
    uint256 tradeId,
    address seller,
    address asset,
    uint256 amount
  ) private {
    if (address(costBasisManager) != address(0) && asset == costBasisManager.indexToken()) {
      costBasisManager.setFundContext(tradeId, seller, address(this), amount);
    }

    uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
    IERC20(asset).safeTransferFrom(seller, address(this), amount);
    uint256 balanceAfter = IERC20(asset).balanceOf(address(this));

    if (balanceAfter - balanceBefore < amount) {
      revert ProtocolErrors.TransferExecutionFailed(asset, address(this), amount);
    }

    _fundTradeInternal(tradeId);
  }

  function _fundTradeInternal(uint256 tradeId) private {
    EscrowTypes.Trade storage trade = _trades[tradeId];
    trade.state = EscrowTypes.TradeState.FUNDED;
    trade.fundingTimestamp = block.timestamp;

    emit Events.EscrowFunded(tradeId, trade.seller, trade.amount, block.timestamp);
  }

  function submitPayment(
    uint256 tradeId,
    bytes32 paymentReference,
    bytes32 evidenceHash
  )
    external
    override
    nonReentrant
    whenNotPaused
    onlyBuyer(tradeId)
    inState(tradeId, EscrowTypes.TradeState.FUNDED)
  {
    EscrowTypes.Trade storage trade = _trades[tradeId];

    uint256 deadline = trade.fundingTimestamp + trade.paymentWindow;
    if (block.timestamp > deadline) {
      revert ProtocolErrors.TradePaymentWindowExpired(tradeId, deadline, block.timestamp);
    }

    if (paymentReference == bytes32(0)) {
      revert ProtocolErrors.InvalidPaymentReference();
    }
    if (_usedPaymentReferences[paymentReference]) {
      revert ProtocolErrors.PaymentReferenceAlreadyUsed(paymentReference);
    }
    if (evidenceHash == bytes32(0)) {
      revert ProtocolErrors.InvalidEvidenceHash();
    }
    if (_usedEvidenceHashes[evidenceHash]) {
      revert ProtocolErrors.EvidenceHashAlreadyUsed(evidenceHash);
    }

    _usedEvidenceHashes[evidenceHash] = true;
    _usedPaymentReferences[paymentReference] = true;
    trade.paymentReference = paymentReference;
    trade.evidenceHash = evidenceHash;
    trade.paymentTimestamp = block.timestamp;
    trade.state = EscrowTypes.TradeState.PAYMENT_SUBMITTED;

    emit Events.PaymentSubmitted(
      tradeId,
      msg.sender,
      paymentReference,
      evidenceHash,
      block.timestamp
    );
  }

  function confirmAndRelease(
    uint256 tradeId
  )
    external
    override
    nonReentrant
    whenNotPaused
    onlySeller(tradeId)
    inState(tradeId, EscrowTypes.TradeState.PAYMENT_SUBMITTED)
  {
    _releaseInternal(tradeId);
  }

  function refund(
    uint256 tradeId
  ) external override nonReentrant whenNotPaused onlyTradeParty(tradeId) {
    EscrowTypes.Trade storage trade = _trades[tradeId];

    if (trade.state == EscrowTypes.TradeState.FUNDED) {
      uint256 deadline = trade.fundingTimestamp + trade.paymentWindow;
      if (block.timestamp <= deadline) {
        revert ProtocolErrors.TradePaymentWindowActive(tradeId, deadline, block.timestamp);
      }
    } else if (trade.state == EscrowTypes.TradeState.PAYMENT_SUBMITTED) {
      if (msg.sender != trade.buyer) {
        revert ProtocolErrors.InvalidTradeParty();
      }
    } else {
      revert ProtocolErrors.InvalidTradeState(
        tradeId,
        uint8(trade.state),
        uint8(EscrowTypes.TradeState.FUNDED)
      );
    }

    _refundInternal(tradeId);
  }

  function cancelUnfundedTrade(
    uint256 tradeId
  )
    external
    override
    nonReentrant
    whenNotPaused
    onlyTradeParty(tradeId)
    inState(tradeId, EscrowTypes.TradeState.CREATED)
  {
    EscrowTypes.Trade storage trade = _trades[tradeId];
    trade.state = EscrowTypes.TradeState.CANCELLED;

    emit Events.TradeCancelled(tradeId, msg.sender);
  }

  function raiseDispute(
    uint256 tradeId,
    bytes32 reasonHash
  )
    external
    override
    nonReentrant
    whenNotPaused
    onlyTradeParty(tradeId)
    inState(tradeId, EscrowTypes.TradeState.PAYMENT_SUBMITTED)
  {
    EscrowTypes.Trade storage trade = _trades[tradeId];
    trade.state = EscrowTypes.TradeState.DISPUTED;
    trade.disputeInitiator = msg.sender;

    emit Events.DisputeRaised(tradeId, msg.sender, reasonHash);
  }

  function resolveDispute(
    uint256 tradeId,
    EscrowTypes.DisputeOutcome outcome
  ) external override nonReentrant inState(tradeId, EscrowTypes.TradeState.DISPUTED) {
    if (
      !hasRole(AccessRoles.ARBITRATOR_ROLE, msg.sender) &&
      !hasRole(AccessRoles.GOVERNANCE_ROLE, msg.sender)
    ) {
      revert ProtocolErrors.UnauthorizedDisputeResolver(msg.sender);
    }

    EscrowTypes.Trade memory trade = _trades[tradeId];

    if (outcome == EscrowTypes.DisputeOutcome.RELEASE_TO_BUYER) {
      emit Events.DisputeResolved(tradeId, msg.sender, uint8(outcome), trade.amount);
      _releaseInternal(tradeId);
    } else {
      emit Events.DisputeResolved(tradeId, msg.sender, uint8(outcome), trade.amount);
      _refundInternal(tradeId);
    }
  }

  function _releaseInternal(uint256 tradeId) private {
    EscrowTypes.Trade storage trade = _trades[tradeId];

    uint256 totalAmount = trade.amount;
    address asset = trade.asset;
    address buyer = trade.buyer;

    uint256 feeCollected = (totalAmount * feeBps) / 10000;
    uint256 netPayout = totalAmount - feeCollected;

    trade.state = EscrowTypes.TradeState.RELEASED;

    if (asset == address(0)) {
      if (feeCollected > 0 && treasury != address(0)) {
        (bool s1, ) = payable(treasury).call{ value: feeCollected }('');
        if (!s1) revert Errors.TransferExecutionFailed(asset, treasury, feeCollected);
      }
      (bool s2, ) = payable(buyer).call{ value: netPayout }('');
      if (!s2) revert Errors.TransferExecutionFailed(asset, buyer, netPayout);
    } else {
      if (address(costBasisManager) != address(0) && asset == costBasisManager.indexToken()) {
        costBasisManager.setReleaseContext(
          tradeId,
          trade.seller,
          buyer,
          treasury,
          totalAmount,
          netPayout,
          feeCollected,
          trade.fiatAmount
        );
      }

      IERC20(asset).safeTransfer(buyer, netPayout);
      if (feeCollected > 0 && treasury != address(0)) {
        IERC20(asset).safeTransfer(treasury, feeCollected);
      }
    }

    emit Events.EscrowReleased(tradeId, buyer, netPayout, feeCollected);
  }

  function _refundInternal(uint256 tradeId) private {
    EscrowTypes.Trade storage trade = _trades[tradeId];

    uint256 refundAmount = trade.amount;
    address asset = trade.asset;
    address seller = trade.seller;

    trade.state = EscrowTypes.TradeState.REFUNDED;

    if (asset == address(0)) {
      (bool s3, ) = payable(seller).call{ value: refundAmount }('');
      if (!s3) revert Errors.TransferExecutionFailed(asset, seller, refundAmount);
    } else {
      if (address(costBasisManager) != address(0) && asset == costBasisManager.indexToken()) {
        costBasisManager.setRefundContext(tradeId, seller, address(this), refundAmount);
      }
      IERC20(asset).safeTransfer(seller, refundAmount);
    }

    emit Events.EscrowRefunded(tradeId, seller, refundAmount);
  }

  function setFeeConfig(uint256 newFeeBps) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (newFeeBps > MAX_FEE_BPS) {
      revert ProtocolErrors.FeeExceedsMaximum(newFeeBps, MAX_FEE_BPS);
    }
    uint256 oldFeeBps = feeBps;
    feeBps = newFeeBps;

    emit Events.FeeConfigUpdated(oldFeeBps, newFeeBps);
  }

  function setTreasury(address newTreasury) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    AddressValidationLib.validateNonZeroAddress(newTreasury);
    address oldTreasury = treasury;
    treasury = newTreasury;

    emit Events.TreasuryUpdated(oldTreasury, newTreasury);
  }

  function pause() external onlyRole(AccessRoles.GUARDIAN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }

  function getTrade(uint256 tradeId) external view override returns (EscrowTypes.Trade memory) {
    EscrowTypes.Trade memory trade = _trades[tradeId];
    if (trade.state == EscrowTypes.TradeState.NONE) {
      revert ProtocolErrors.TradeDoesNotExist(tradeId);
    }
    return trade;
  }

  function isEvidenceHashUsed(bytes32 evidenceHash) external view override returns (bool) {
    return _usedEvidenceHashes[evidenceHash];
  }

  function isPaymentReferenceUsed(bytes32 paymentReference) external view override returns (bool) {
    return _usedPaymentReferences[paymentReference];
  }

  function totalTrades() external view returns (uint256) {
    return _tradeCounter;
  }
}
