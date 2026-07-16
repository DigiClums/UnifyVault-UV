// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title MathUtils
 * @notice Helper library for calculations involving token conversions and NAV fractions
 */
library MathUtils {
  /**
   * @notice Performs precision-scaled multiplication followed by division
   */
  function mulDiv(
    uint256 x,
    uint256 y,
    uint256 denominator
  ) internal pure returns (uint256 result) {
    // Placeholder implementation
    return (x * y) / denominator;
  }
}
