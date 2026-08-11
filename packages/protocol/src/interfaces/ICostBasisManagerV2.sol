// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ICostBasisManagerV2
 * @notice Interface for UnifyVault CostBasisManager V2 tracking user cost basis,
 * P2P escrow context, average entry price, and PnL metrics
 */
interface ICostBasisManagerV2 {
  enum ContextType {
    NONE,
    FUND,
    RELEASE,
    REFUND
  }

  struct P2PContext {
    ContextType contextType;
    uint256 tradeId;
    address seller;
    address buyer;
    address treasury;
    address escrow;
    uint256 grossAmount;
    uint256 netAmount;
    uint256 feeAmount;
    uint256 fiatProceedsUSD18;
    bool finalized;
    bool active;
  }

  // Events
  event CostBasisUpdated(
    address indexed user,
    uint256 costBasisUSD,
    uint256 sharesBalance,
    uint256 timestamp
  );
  event RealizedPnLRecorded(
    address indexed user,
    int256 realizedPnLUSD,
    uint256 sharesBurned,
    uint256 timestamp
  );
  event AccountingMigrated(
    address indexed user,
    uint256 costBasisUSD,
    int256 realizedPnLUSD,
    uint256 firstDepositTimestamp
  );
  event EscrowStatusUpdated(address indexed escrow, bool status);
  event P2PFundContextSet(
    uint256 indexed tradeId,
    address indexed seller,
    address indexed escrow,
    uint256 amount
  );
  event P2PReleaseContextSet(
    uint256 indexed tradeId,
    address indexed seller,
    address indexed buyer,
    address treasury,
    uint256 grossAmount,
    uint256 netAmount,
    uint256 feeAmount,
    uint256 fiatProceedsUSD18
  );
  event P2PRefundContextSet(
    uint256 indexed tradeId,
    address indexed seller,
    address indexed escrow,
    uint256 amount
  );

  // Custom Errors
  error ZeroAddressDetected();
  error ZeroAmountDetected();
  error InsufficientShares();
  error EscrowTransferWithoutContext();
  error InvalidContext();
  error ContextAlreadyActive();
  error ReentrancyDetected();
  error UnauthorizedCaller();

  // Core Hook
  function onTokenTransfer(
    address from,
    address to,
    uint256 amount,
    uint256 senderBalanceBefore
  ) external;

  // Escrow Context Setters
  function setFundContext(uint256 tradeId, address seller, address escrow, uint256 amount) external;

  function setReleaseContext(
    uint256 tradeId,
    address seller,
    address buyer,
    address treasury,
    uint256 grossAmount,
    uint256 netAmount,
    uint256 feeAmount,
    uint256 fiatProceedsUSD18
  ) external;

  function setRefundContext(
    uint256 tradeId,
    address seller,
    address escrow,
    uint256 amount
  ) external;

  // Controller Accounting Functions
  function recordDeposit(address user, uint256 depositValueUSD, uint256 sharesMinted) external;

  function recordRedeem(
    address user,
    uint256 userSharesBefore,
    uint256 sharesBurned,
    uint256 payoutValueUSD
  ) external;

  // Migration Hook Interface
  function migrateAccounting(
    address user,
    uint256 costBasisUSD,
    int256 realizedPnLUSD,
    uint256 initialFirstDepositTimestamp
  ) external;

  // View Functions
  function costBasis(address account) external view returns (uint256 costBasisUSD);
  function averageEntryPrice(address account) external view returns (uint256 entryPriceUSD);
  function realizedPnL(address account) external view returns (int256 pnlUSD);
  function unrealizedPnL(address account) external view returns (int256 pnlUSD);
  function firstDepositTimestamp(address account) external view returns (uint256 timestamp);
  function escrowTradeBasis(uint256 tradeId) external view returns (uint256 basisUSD);
  function isEscrow(address account) external view returns (bool);
  function indexToken() external view returns (address);
}
