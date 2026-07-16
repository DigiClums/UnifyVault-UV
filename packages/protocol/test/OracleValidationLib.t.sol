// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import 'forge-std/Test.sol';
import '../src/libraries/OracleValidationLib.sol';
import '../src/errors/Errors.sol';

/**
 * @title OracleValidationLibTest
 * @notice Tests oracle pricing verification boundaries and time heartbeats
 */
contract OracleValidationLibTest is Test {
  address public constant TEST_ASSET = address(0x1234);

  function testValidateOraclePriceBoundary() public pure {
    // Minimum positive price should succeed
    OracleValidationLib.validateOraclePrice(1, TEST_ASSET);
  }

  function testValidateOraclePriceZeroRevert() public {
    vm.expectRevert(
      abi.encodeWithSelector(Errors.OraclePriceNegative.selector, TEST_ASSET, int256(0))
    );
    OracleValidationLib.validateOraclePrice(0, TEST_ASSET);
  }

  function testValidateOraclePriceNegativeRevert() public {
    vm.expectRevert(
      abi.encodeWithSelector(Errors.OraclePriceNegative.selector, TEST_ASSET, int256(-1))
    );
    OracleValidationLib.validateOraclePrice(-1, TEST_ASSET);
  }

  function testValidatePriceFreshnessBoundary() public {
    uint256 currentTimestamp = block.timestamp;
    // Equal boundary age = heartbeat should pass
    OracleValidationLib.validatePriceFreshness(currentTimestamp - 60, 60, TEST_ASSET);
    // Under boundary age < heartbeat should pass
    OracleValidationLib.validatePriceFreshness(currentTimestamp - 59, 60, TEST_ASSET);
  }

  function testValidatePriceFreshnessRevertBoundary() public {
    uint256 currentTimestamp = block.timestamp;
    // Over boundary age > heartbeat should revert (asset, age, limit)
    vm.expectRevert(abi.encodeWithSelector(Errors.OraclePriceStale.selector, TEST_ASSET, 61, 60));
    OracleValidationLib.validatePriceFreshness(currentTimestamp - 61, 60, TEST_ASSET);
  }

  function testFuzzValidateOraclePrice(int256 price) public {
    if (price <= 0) {
      vm.expectRevert(
        abi.encodeWithSelector(Errors.OraclePriceNegative.selector, TEST_ASSET, price)
      );
      OracleValidationLib.validateOraclePrice(price, TEST_ASSET);
    } else {
      OracleValidationLib.validateOraclePrice(price, TEST_ASSET);
    }
  }

  function testFuzzValidatePriceFreshness(uint32 age, uint32 heartbeat) public {
    // Restrict bounds to avoid overflows
    vm.assume(heartbeat > 0);
    uint256 currentTimestamp = block.timestamp;
    uint256 updateTimestamp = currentTimestamp > age ? currentTimestamp - age : 0;
    uint256 calculatedAge = currentTimestamp - updateTimestamp;

    if (calculatedAge > heartbeat) {
      vm.expectRevert(
        abi.encodeWithSelector(
          Errors.OraclePriceStale.selector,
          TEST_ASSET,
          calculatedAge,
          uint256(heartbeat)
        )
      );
      OracleValidationLib.validatePriceFreshness(updateTimestamp, uint256(heartbeat), TEST_ASSET);
    } else {
      OracleValidationLib.validatePriceFreshness(updateTimestamp, uint256(heartbeat), TEST_ASSET);
    }
  }
}
