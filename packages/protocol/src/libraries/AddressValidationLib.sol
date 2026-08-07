// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '../errors/Errors.sol';

/**
 * @title AddressValidationLib
 * @notice Provides validation checks for Ethereum addresses
 */
library AddressValidationLib {
  /**
   * @notice Reverts if the address parameter is the zero address
   * @param addr The address to validate
   */
  function validateNonZeroAddress(address addr) internal pure {
    if (addr == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
  }
}
