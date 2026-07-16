// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @notice Segregated treasury types for fee allocation
 */
enum TreasuryType {
  RESERVE,
  FEE,
  OPERATIONAL,
  PROTOCOL
}

/**
 * @notice Fee allocation weights for treasury distributions
 */
struct FeeAllocation {
  uint256 reserveShareBps; // reserve pool share (e.g., 5000 = 50%)
  uint256 operationalShareBps; // operational pool share (e.g., 5000 = 50%)
}
