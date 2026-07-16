// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import '../errors/Errors.sol';

/**
 * @title MathValidationLib
 * @notice Provides validation checks for mathematical configurations and percentages
 */
library MathValidationLib {
  /**
   * @notice Reverts if the basis points value exceeds a configured maximum limit
   * @param bps The basis points value to validate
   * @param maxLimit The maximum allowed limit
   */
  function validateBps(uint256 bps, uint256 maxLimit) internal pure {
    if (bps > maxLimit) {
      revert Errors.SlippageLimitExceeded(maxLimit, bps);
    }
  }
}
