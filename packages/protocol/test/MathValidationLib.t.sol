// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import 'forge-std/Test.sol';
import '../src/libraries/MathValidationLib.sol';
import '../src/errors/Errors.sol';

/**
 * @title MathValidationLibTest
 * @notice Tests mathematical verification boundaries and fuzz parameter bounds
 */
contract MathValidationLibTest is Test {
  function testValidateBpsBoundary() public pure {
    // Equal boundary should pass
    MathValidationLib.validateBps(100, 100);
    // Under boundary should pass
    MathValidationLib.validateBps(99, 100);
  }

  function testValidateBpsRevertBoundary() public {
    // Over boundary should fail (expected, actual)
    vm.expectRevert(abi.encodeWithSelector(Errors.SlippageLimitExceeded.selector, 100, 101));
    MathValidationLib.validateBps(101, 100);
  }

  function testFuzzValidateBps(uint256 bps, uint256 maxLimit) public {
    if (bps > maxLimit) {
      vm.expectRevert(abi.encodeWithSelector(Errors.SlippageLimitExceeded.selector, maxLimit, bps));
      MathValidationLib.validateBps(bps, maxLimit);
    } else {
      MathValidationLib.validateBps(bps, maxLimit);
    }
  }
}
