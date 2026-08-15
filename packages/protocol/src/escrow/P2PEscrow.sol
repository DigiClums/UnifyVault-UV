// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../events/Events.sol';
import '../libraries/AccessRoles.sol';
import '../libraries/AddressValidationLib.sol';
import '../types/EscrowTypes.sol';
import '../interfaces/IP2PEscrow.sol';

/**
 * @title P2PEscrow
 * @notice Non-custodial, blockchain-first P2P escrow protocol for UnifyVault.
 * @dev Controls trade escrow funds in smart contract state.
 * Blockchain is the single source of truth; zero reliance on centralized databases or off-chain fund movers.
 */
contract P2PEscrow is IP2PEscrow, AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  uint256 public constant MIN_PAYMENT_WINDOW = 5 minutes;
  uint256 public constant MAX_FEE_BPS = 500; // 5.00% max fee cap

  uint256 private _tradeCounter;
  mapping(uint256 => EscrowTypes.Trade) private _trades;
  mapping(bytes32 => bool) private _usedEvidenceHashes;
  mapping(bytes32 => bool) private _usedPaymentReferences;

  address public treasury;
  uint256 public feeBps; // e.g. 10 = 0.10%

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

  constructor(address initialTreasury, uint256 initialFeeBps) {
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
  }

  /**
   * @notice Receives native ETH
   */
  receive() external payable {}

  /**
   * @notice Creates a new P2P Trade order
   * @param params CreateTradeParams struct containing buyer, seller, asset, amount, fiat details
   * @return tradeId The unique identifier of the created trade
   */
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

    // If caller is seller and funding is provided at creation
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
        // Attempt transfer if seller has approved
        uint256 currentAllowance = IERC20(params.asset).allowance(msg.sender, address(this));
        if (currentAllowance >= params.amount) {
          uint256 balanceBefore = IERC20(params.asset).balanceOf(address(this));
          IERC20(params.asset).safeTransferFrom(msg.sender, address(this), params.amount);
          uint256 balanceAfter = IERC20(params.asset).balanceOf(address(this));
          if (balanceAfter - balanceBefore < params.amount) {
            revert ProtocolErrors.TransferExecutionFailed(
              params.asset,
              address(this),
              params.amount
            );
          }
          _fundTradeInternal(tradeId);
        }
      }
    } else {
      if (msg.value > 0) {
        revert ProtocolErrors.IncorrectNativeAmount(0, msg.value);
      }
    }
  }

  /**
   * @notice Funds an existing CREATED trade with crypto collateral
   * @param tradeId The target trade ID
   */
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
    } else {
      if (msg.value > 0) {
        revert ProtocolErrors.IncorrectNativeAmount(0, msg.value);
      }
      uint256 balanceBefore = IERC20(trade.asset).balanceOf(address(this));
      IERC20(trade.asset).safeTransferFrom(msg.sender, address(this), trade.amount);
      uint256 balanceAfter = IERC20(trade.asset).balanceOf(address(this));
      if (balanceAfter - balanceBefore < trade.amount) {
        revert ProtocolErrors.TransferExecutionFailed(trade.asset, address(this), trade.amount);
      }
    }

    _fundTradeInternal(tradeId);
  }

  function _fundTradeInternal(uint256 tradeId) private {
    EscrowTypes.Trade storage trade = _trades[tradeId];
    trade.state = EscrowTypes.TradeState.FUNDED;
    trade.fundingTimestamp = block.timestamp;

    emit Events.EscrowFunded(tradeId, trade.seller, trade.amount, block.timestamp);
  }

  /**
   * @notice Submits payment claim and off-chain receipt hash for a FUNDED trade
   * @param tradeId Target trade ID
   * @param paymentReference UTR or transaction ID reference
   * @param evidenceHash Cryptographic hash or IPFS CID hash of payment receipt
   */
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

  /**
   * @notice Confirms fiat receipt and releases escrowed funds to buyer
   * @param tradeId Target trade ID
   */
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

  /**
   * @notice Refunds escrowed crypto back to seller
   * @dev Allowed if payment window expired without submission, or if buyer forfeits claim
   * @param tradeId Target trade ID
   */
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
      // Voluntary refund by buyer forfeiting payment claim
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

  /**
   * @notice Cancels an unfunded CREATED trade
   * @param tradeId Target trade ID
   */
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

  /**
   * @notice Raises a dispute on a trade in PAYMENT_SUBMITTED state
   * @param tradeId Target trade ID
   * @param reasonHash Cryptographic hash detailing reason for dispute
   */
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

  /**
   * @notice Resolves an open dispute
   * @dev Callable only by accounts holding ARBITRATOR_ROLE or GOVERNANCE_ROLE
   * @param tradeId Target trade ID
   * @param outcome Result of arbitration (RELEASE_TO_BUYER or REFUND_TO_SELLER)
   */
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

    // Checks-Effects-Interactions pattern
    trade.state = EscrowTypes.TradeState.RELEASED;

    if (asset == address(0)) {
      if (feeCollected > 0 && treasury != address(0)) {
        Address.sendValue(payable(treasury), feeCollected);
      }
      Address.sendValue(payable(buyer), netPayout);
    } else {
      if (feeCollected > 0 && treasury != address(0)) {
        IERC20(asset).safeTransfer(treasury, feeCollected);
      }
      IERC20(asset).safeTransfer(buyer, netPayout);
    }

    emit Events.EscrowReleased(tradeId, buyer, netPayout, feeCollected);
  }

  function _refundInternal(uint256 tradeId) private {
    EscrowTypes.Trade storage trade = _trades[tradeId];

    uint256 refundAmount = trade.amount;
    address asset = trade.asset;
    address seller = trade.seller;

    // Checks-Effects-Interactions pattern
    trade.state = EscrowTypes.TradeState.REFUNDED;

    if (asset == address(0)) {
      Address.sendValue(payable(seller), refundAmount);
    } else {
      IERC20(asset).safeTransfer(seller, refundAmount);
    }

    emit Events.EscrowRefunded(tradeId, seller, refundAmount);
  }

  // --- Admin & Governance Config ---

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

  // --- View Functions ---

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
