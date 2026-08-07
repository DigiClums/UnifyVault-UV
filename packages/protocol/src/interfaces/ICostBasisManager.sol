// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ICostBasisManager
 * @notice Interface for UnifyVault CostBasisManager tracking user cost basis, average entry price, and PnL metrics
 */
interface ICostBasisManager {
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

  // Custom Errors
  error ZeroAddressDetected();
  error ZeroAmountDetected();
  error InsufficientShares();

  // State Changing Functions
  function recordDeposit(address user, uint256 depositValueUSD, uint256 sharesMinted) external;

  function recordRedeem(
    address user,
    uint256 userSharesBefore,
    uint256 sharesBurned,
    uint256 payoutValueUSD
  ) external;

  // View Functions
  function costBasis(address account) external view returns (uint256 costBasisUSD);

  function averageEntryPrice(address account) external view returns (uint256 entryPriceUSD);

  function realizedPnL(address account) external view returns (int256 pnlUSD);

  function unrealizedPnL(address account) external view returns (int256 pnlUSD);

  function portfolioPerformance(
    address account
  )
    external
    view
    returns (
      uint256 costBasisUSD,
      uint256 currentValueUSD,
      int256 pnlUSD,
      int256 pnlBps
    );
}
