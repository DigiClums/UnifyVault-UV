// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/libraries/MathValidationLib.sol';
import '../src/errors/Errors.sol';

/**
 * @title MathValidationLibTest
 * @notice Tests mathematical verification boundaries and fuzz parameter bounds
 */
contract MathValidationLibTest is Test {
  MathValidationLibWrapper wrapper;

  function setUp() public {
    wrapper = new MathValidationLibWrapper();
  }

  function testValidateBpsBoundary() public view {
    // Equal boundary should pass
    wrapper.validateBps(100, 100);
    // Under boundary should pass
    wrapper.validateBps(99, 100);
  }

  function testValidateBpsRevertBoundary() public {
    // Over boundary should fail (expected, actual)
    vm.expectRevert(abi.encodeWithSelector(Errors.SlippageLimitExceeded.selector, 100, 101));
    wrapper.validateBps(101, 100);
  }

  function testFuzzValidateBps(uint256 bps, uint256 maxLimit) public {
    if (bps > maxLimit) {
      vm.expectRevert(abi.encodeWithSelector(Errors.SlippageLimitExceeded.selector, maxLimit, bps));
      wrapper.validateBps(bps, maxLimit);
    } else {
      wrapper.validateBps(bps, maxLimit);
    }
  }
}

contract MathValidationLibWrapper {
  function validateBps(uint256 bps, uint256 maxLimit) external pure {
    MathValidationLib.validateBps(bps, maxLimit);
  }
}
