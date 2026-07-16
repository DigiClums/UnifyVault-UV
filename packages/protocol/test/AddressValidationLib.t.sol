// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import 'forge-std/Test.sol';
import '../src/libraries/AddressValidationLib.sol';
import '../src/errors/Errors.sol';

/**
 * @title AddressValidationLibTest
 * @notice Tests address verification boundaries and error custom revert selector matches
 */
contract AddressValidationLibTest is Test {
  function testValidateNonZeroAddress() public pure {
    AddressValidationLib.validateNonZeroAddress(address(0x1));
  }

  function testValidateNonZeroAddressRevert() public {
    vm.expectRevert(Errors.ZeroAddressDetected.selector);
    AddressValidationLib.validateNonZeroAddress(address(0));
  }

  function testFuzzValidateNonZeroAddress(address input) public pure {
    if (input == address(0)) {
      return; // zero address verified in custom revert test
    }
    AddressValidationLib.validateNonZeroAddress(input);
  }
}
