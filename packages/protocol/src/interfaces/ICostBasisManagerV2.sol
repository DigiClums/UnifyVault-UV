// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ICostBasisManagerV2
 * @notice Interface for UnifyVault CostBasisManager V2 tracking user cost basis,
 * average entry price, and PnL metrics
 */
interface ICostBasisManagerV2 {
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

  // Custom Errors
  error ZeroAddressDetected();
  error ZeroAmountDetected();
  error InsufficientShares();
  error ReentrancyDetected();
  error UnauthorizedCaller();

  // Core Hook
  function onTokenTransfer(
    address from,
    address to,
    uint256 amount,
    uint256 senderBalanceBefore
  ) external;

  // Admin Configuration
  function setEscrowStatus(address escrow, bool status) external;

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
  function isEscrow(address account) external view returns (bool);
  function indexToken() external view returns (address);
}
