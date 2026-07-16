// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title Constants
 * @notice Centralized library for protocol-wide immutable constants
 */
library Constants {
  uint256 public constant BASIS_POINTS_DIVISOR = 10000;
  uint256 public constant MAX_FEE_BPS = 100; // 1.00% max fee
}
