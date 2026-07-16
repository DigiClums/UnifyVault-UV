// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @notice Allocation target configurations for underlying assets
 */
struct VaultAllocation {
  address asset;
  uint256 targetWeightBps; // Weight in basis points (e.g., 5000 = 50%)
  uint256 currentBalance;
}
