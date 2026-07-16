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
  AddressValidationLibWrapper wrapper;

  function setUp() public {
    wrapper = new AddressValidationLibWrapper();
  }

  function testValidateNonZeroAddress() public view {
    wrapper.validateNonZeroAddress(address(0x1));
  }

  function testValidateNonZeroAddressRevert() public {
    vm.expectRevert(Errors.ZeroAddressDetected.selector);
    wrapper.validateNonZeroAddress(address(0));
  }

  function testFuzzValidateNonZeroAddress(address input) public view {
    if (input == address(0)) {
      return; // zero address verified in custom revert test
    }
    wrapper.validateNonZeroAddress(input);
  }
}

contract AddressValidationLibWrapper {
  function validateNonZeroAddress(address addr) external pure {
    AddressValidationLib.validateNonZeroAddress(addr);
  }
}
