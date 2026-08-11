// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
import '../interfaces/ICostBasisManagerV2.sol';
import '../interfaces/IPortfolioManager.sol';
import '../interfaces/IProtocolDirectory.sol';
import '../libraries/AccessRoles.sol';
import '../constants/ModuleIds.sol';

/**
 * @title CostBasisManagerV2
 * @notice Production-grade Cost Basis V2, Realized/Unrealized PnL, and P2P Escrow Context Manager for UnifyVault V2
 * @dev Enforces strict pre-transfer hook accounting, basis conservation, and single-finalization P2P escrow accounting.
 */
contract CostBasisManagerV2 is AccessControl, ICostBasisManagerV2 {
  bytes32 public constant CONTROLLER_ROLE = keccak256('CONTROLLER_ROLE');

  address public immutable directory;

  address public portfolioManager;
  address public indexToken;

  mapping(address => uint256) private _costBasisUSD;
  mapping(address => int256) private _realizedPnLUSD;
  mapping(address => uint256) private _firstDepositTimestamp;
  mapping(address => bool) private _accountingMigrated;

  mapping(address => bool) private _isEscrow;
  mapping(uint256 => uint256) private _escrowTradeBasis;

  P2PContext private _currentContext;

  uint256 private _reentrancyStatus;
  uint256 private constant _NOT_ENTERED = 1;
  uint256 private constant _ENTERED = 2;

  modifier nonReentrantGuard() {
    if (_reentrancyStatus == _ENTERED) revert ReentrancyDetected();
    _reentrancyStatus = _ENTERED;
    _;
    _reentrancyStatus = _NOT_ENTERED;
  }

  modifier onlyEscrow() {
    if (!_isEscrow[msg.sender]) revert UnauthorizedCaller();
    _;
  }

  modifier onlyToken() {
    if (msg.sender != indexToken) revert UnauthorizedCaller();
    _;
  }

  constructor(address admin, address directoryAddress) {
    if (admin == address(0) || directoryAddress == address(0)) revert ZeroAddressDetected();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    _grantRole(CONTROLLER_ROLE, admin);

    directory = directoryAddress;
    _reentrancyStatus = _NOT_ENTERED;
  }

  // --- External Governance / Admin Configuration ---

  function syncModules() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    address newPM = IProtocolDirectory(directory).getAddress(ModuleIds.PORTFOLIO_MANAGER);
    address newToken = IProtocolDirectory(directory).getAddress(ModuleIds.TOKEN);

    if (newPM != address(0)) portfolioManager = newPM;
    if (newToken != address(0)) indexToken = newToken;
  }

  function setModules(address pm, address token) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (pm != address(0)) portfolioManager = pm;
    if (token != address(0)) indexToken = token;
  }

  function setEscrowStatus(
    address escrowAddress,
    bool status
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (escrowAddress == address(0)) revert ZeroAddressDetected();
    _isEscrow[escrowAddress] = status;
    emit EscrowStatusUpdated(escrowAddress, status);
  }

  // --- P2P Escrow Context Setters ---

  function setFundContext(
    uint256 tradeId,
    address seller,
    address escrow,
    uint256 amount
  ) external override onlyEscrow nonReentrantGuard {
    if (seller == address(0) || escrow == address(0)) revert ZeroAddressDetected();
    if (amount == 0) revert ZeroAmountDetected();
    if (_currentContext.active) revert ContextAlreadyActive();

    _currentContext = P2PContext({
      contextType: ContextType.FUND,
      tradeId: tradeId,
      seller: seller,
      buyer: address(0),
      treasury: address(0),
      escrow: escrow,
      grossAmount: amount,
      netAmount: 0,
      feeAmount: 0,
      fiatProceedsUSD18: 0,
      finalized: false,
      active: true
    });

    emit P2PFundContextSet(tradeId, seller, escrow, amount);
  }

  function setReleaseContext(
    uint256 tradeId,
    address seller,
    address buyer,
    address treasury,
    uint256 grossAmount,
    uint256 netAmount,
    uint256 feeAmount,
    uint256 fiatProceedsUSD18
  ) external override onlyEscrow nonReentrantGuard {
    if (seller == address(0) || buyer == address(0)) revert ZeroAddressDetected();
    if (grossAmount == 0 || netAmount == 0) revert ZeroAmountDetected();
    if (grossAmount != netAmount + feeAmount) revert InvalidContext();
    if (_currentContext.active) revert ContextAlreadyActive();

    _currentContext = P2PContext({
      contextType: ContextType.RELEASE,
      tradeId: tradeId,
      seller: seller,
      buyer: buyer,
      treasury: treasury,
      escrow: msg.sender,
      grossAmount: grossAmount,
      netAmount: netAmount,
      feeAmount: feeAmount,
      fiatProceedsUSD18: fiatProceedsUSD18,
      finalized: false,
      active: true
    });

    emit P2PReleaseContextSet(
      tradeId,
      seller,
      buyer,
      treasury,
      grossAmount,
      netAmount,
      feeAmount,
      fiatProceedsUSD18
    );
  }

  function setRefundContext(
    uint256 tradeId,
    address seller,
    address escrow,
    uint256 amount
  ) external override onlyEscrow nonReentrantGuard {
    if (seller == address(0) || escrow == address(0)) revert ZeroAddressDetected();
    if (amount == 0) revert ZeroAmountDetected();
    if (_currentContext.active) revert ContextAlreadyActive();

    _currentContext = P2PContext({
      contextType: ContextType.REFUND,
      tradeId: tradeId,
      seller: seller,
      buyer: address(0),
      treasury: address(0),
      escrow: escrow,
      grossAmount: amount,
      netAmount: 0,
      feeAmount: 0,
      fiatProceedsUSD18: 0,
      finalized: false,
      active: true
    });

    emit P2PRefundContextSet(tradeId, seller, escrow, amount);
  }

  function clearP2PContext() external onlyEscrow nonReentrantGuard {
    delete _currentContext;
  }

  // --- Core Pre-Transfer Hook ---

  /**
   * @notice Called strictly BEFORE super._update() by UVBEV2
   * @param from Sender address (or address(0) for mint)
   * @param to Recipient address (or address(0) for burn)
   * @param amount Tokens transferred
   * @param senderBalanceBefore Sender balance before mutation
   */
  function onTokenTransfer(
    address from,
    address to,
    uint256 amount,
    uint256 senderBalanceBefore
  ) external override onlyToken nonReentrantGuard {
    // 1. Minting or burning: No-op for transfer cost basis movement
    if (from == address(0) || to == address(0)) {
      return;
    }

    // 2. Self-transfer or zero amount: No-op
    if (from == to || amount == 0) {
      return;
    }

    bool involvedEscrow = _isEscrow[from] || _isEscrow[to];

    if (involvedEscrow) {
      if (!_currentContext.active) revert EscrowTransferWithoutContext();

      if (_currentContext.contextType == ContextType.FUND) {
        if (
          from != _currentContext.seller ||
          to != _currentContext.escrow ||
          amount != _currentContext.grossAmount
        ) {
          revert InvalidContext();
        }

        uint256 basisMoved =
          (amount == senderBalanceBefore)
            ? _costBasisUSD[from]
            : Math.mulDiv(_costBasisUSD[from], amount, senderBalanceBefore);

        _costBasisUSD[from] -= basisMoved;
        _escrowTradeBasis[_currentContext.tradeId] += basisMoved;

        delete _currentContext;
      } else if (_currentContext.contextType == ContextType.REFUND) {
        if (
          from != _currentContext.escrow ||
          to != _currentContext.seller ||
          amount != _currentContext.grossAmount
        ) {
          revert InvalidContext();
        }

        uint256 restoredBasis = _escrowTradeBasis[_currentContext.tradeId];
        _costBasisUSD[to] += restoredBasis;
        _escrowTradeBasis[_currentContext.tradeId] = 0;

        delete _currentContext;
      } else if (_currentContext.contextType == ContextType.RELEASE) {
        if (from != _currentContext.escrow) {
          revert InvalidContext();
        }

        if (to == _currentContext.buyer) {
          if (amount != _currentContext.netAmount || _currentContext.finalized) {
            revert InvalidContext();
          }

          uint256 sellerBasisRemoved = _escrowTradeBasis[_currentContext.tradeId];
          _escrowTradeBasis[_currentContext.tradeId] = 0;

          int256 sellerRealizedPnL =
            int256(_currentContext.fiatProceedsUSD18) - int256(sellerBasisRemoved);
          _realizedPnLUSD[_currentContext.seller] += sellerRealizedPnL;

          _costBasisUSD[to] += _currentContext.fiatProceedsUSD18;
          _currentContext.finalized = true;

          emit CostBasisUpdated(
            to,
            _costBasisUSD[to],
            IERC20(indexToken).balanceOf(to),
            block.timestamp
          );
          emit RealizedPnLRecorded(
            _currentContext.seller,
            sellerRealizedPnL,
            amount,
            block.timestamp
          );

          if (_currentContext.feeAmount == 0) {
            delete _currentContext;
          }
        } else if (to == _currentContext.treasury) {
          if (amount != _currentContext.feeAmount || !_currentContext.finalized) {
            revert InvalidContext();
          }

          // Treasury receives fee amount of shares with 0 user investment basis
          delete _currentContext;
        } else {
          revert InvalidContext();
        }
      } else {
        revert InvalidContext();
      }
    } else {
      // Ordinary Transfer
      if (amount > senderBalanceBefore) revert InsufficientShares();

      uint256 basisMoved =
        (amount == senderBalanceBefore)
          ? _costBasisUSD[from]
          : Math.mulDiv(_costBasisUSD[from], amount, senderBalanceBefore);

      _costBasisUSD[from] -= basisMoved;
      _costBasisUSD[to] += basisMoved;

      uint256 toBalanceAfter =
        (indexToken != address(0)) ? IERC20(indexToken).balanceOf(to) + amount : amount;
      emit CostBasisUpdated(
        from,
        _costBasisUSD[from],
        senderBalanceBefore - amount,
        block.timestamp
      );
      emit CostBasisUpdated(to, _costBasisUSD[to], toBalanceAfter, block.timestamp);
    }
  }

  // --- Controller Accounting Functions ---

  function recordDeposit(
    address user,
    uint256 depositValueUSD,
    uint256 sharesMinted
  ) external override onlyRole(CONTROLLER_ROLE) nonReentrantGuard {
    if (user == address(0)) revert ZeroAddressDetected();
    if (depositValueUSD == 0 || sharesMinted == 0) return;

    if (_firstDepositTimestamp[user] == 0) {
      _firstDepositTimestamp[user] = block.timestamp;
    }

    _costBasisUSD[user] += depositValueUSD;

    uint256 totalShares =
      (indexToken != address(0)) ? IERC20(indexToken).balanceOf(user) : sharesMinted;

    emit CostBasisUpdated(user, _costBasisUSD[user], totalShares, block.timestamp);
  }

  function recordRedeem(
    address user,
    uint256 userSharesBefore,
    uint256 sharesBurned,
    uint256 payoutValueUSD
  ) external override onlyRole(CONTROLLER_ROLE) nonReentrantGuard {
    if (user == address(0)) revert ZeroAddressDetected();
    if (sharesBurned == 0 || userSharesBefore == 0) return;
    if (sharesBurned > userSharesBefore) revert InsufficientShares();

    uint256 currentBasis = _costBasisUSD[user];
    uint256 costBasisReduction = Math.mulDiv(currentBasis, sharesBurned, userSharesBefore);

    int256 realizedGainLoss = int256(payoutValueUSD) - int256(costBasisReduction);
    _realizedPnLUSD[user] += realizedGainLoss;

    if (costBasisReduction >= currentBasis) {
      _costBasisUSD[user] = 0;
    } else {
      _costBasisUSD[user] -= costBasisReduction;
    }

    uint256 totalSharesAfter =
      (indexToken != address(0))
        ? IERC20(indexToken).balanceOf(user)
        : (userSharesBefore - sharesBurned);

    if (_costBasisUSD[user] == 0 || totalSharesAfter == 0) {
      _firstDepositTimestamp[user] = 0;
    }

    emit CostBasisUpdated(user, _costBasisUSD[user], totalSharesAfter, block.timestamp);
    emit RealizedPnLRecorded(user, realizedGainLoss, sharesBurned, block.timestamp);
  }

  // --- Migration Interface Hook ---

  function migrateAccounting(
    address user,
    uint256 costBasisUSD,
    int256 realizedPnLUSD,
    uint256 initialFirstDepositTimestamp
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) nonReentrantGuard {
    if (user == address(0)) revert ZeroAddressDetected();
    require(!_accountingMigrated[user], 'Accounting already migrated');

    _costBasisUSD[user] = costBasisUSD;
    _realizedPnLUSD[user] = realizedPnLUSD;
    _firstDepositTimestamp[user] = initialFirstDepositTimestamp;
    _accountingMigrated[user] = true;

    emit AccountingMigrated(user, costBasisUSD, realizedPnLUSD, initialFirstDepositTimestamp);
  }

  // --- View Calculation Functions ---

  function costBasis(address account) external view override returns (uint256 costBasisUSD) {
    return _costBasisUSD[account];
  }

  function averageEntryPrice(
    address account
  ) external view override returns (uint256 entryPriceUSD) {
    uint256 basis = _costBasisUSD[account];
    if (basis == 0 || indexToken == address(0)) return 0;

    uint256 userShares = IERC20(indexToken).balanceOf(account);
    if (userShares == 0) return 0;

    return (basis * 1e18) / userShares;
  }

  function realizedPnL(address account) external view override returns (int256 pnlUSD) {
    return _realizedPnLUSD[account];
  }

  function unrealizedPnL(address account) external view override returns (int256 pnlUSD) {
    uint256 basis = _costBasisUSD[account];
    if (basis == 0 || indexToken == address(0) || portfolioManager == address(0)) return 0;

    uint256 userShares = IERC20(indexToken).balanceOf(account);
    if (userShares == 0) return 0;

    (, uint256 navPerShare) = IPortfolioManager(portfolioManager).calculateNAV();
    uint256 currentValueUSD = (userShares * navPerShare) / 1e18;

    return int256(currentValueUSD) - int256(basis);
  }

  function firstDepositTimestamp(
    address account
  ) external view override returns (uint256 timestamp) {
    return _firstDepositTimestamp[account];
  }

  function escrowTradeBasis(uint256 tradeId) external view override returns (uint256 basisUSD) {
    return _escrowTradeBasis[tradeId];
  }

  function isEscrow(address account) external view override returns (bool) {
    return _isEscrow[account];
  }
}
