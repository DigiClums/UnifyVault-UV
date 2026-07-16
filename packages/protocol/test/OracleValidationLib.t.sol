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
  OracleValidationLibWrapper wrapper;

  function setUp() public {
    wrapper = new OracleValidationLibWrapper();
    // Warp block.timestamp away from 0/1 to avoid subtraction underflow in tests
    vm.warp(1000);
  }

  function testValidateOraclePriceBoundary() public view {
    // Minimum positive price should succeed
    wrapper.validateOraclePrice(1, TEST_ASSET);
  }

  function testValidateOraclePriceZeroRevert() public {
    vm.expectRevert(
      abi.encodeWithSelector(Errors.OraclePriceNegative.selector, TEST_ASSET, int256(0))
    );
    wrapper.validateOraclePrice(0, TEST_ASSET);
  }

  function testValidateOraclePriceNegativeRevert() public {
    vm.expectRevert(
      abi.encodeWithSelector(Errors.OraclePriceNegative.selector, TEST_ASSET, int256(-1))
    );
    wrapper.validateOraclePrice(-1, TEST_ASSET);
  }

  function testValidatePriceFreshnessBoundary() public view {
    uint256 currentTimestamp = block.timestamp;
    // Equal boundary age = heartbeat should pass
    wrapper.validatePriceFreshness(currentTimestamp - 60, 60, TEST_ASSET);
    // Under boundary age < heartbeat should pass
    wrapper.validatePriceFreshness(currentTimestamp - 59, 60, TEST_ASSET);
  }

  function testValidatePriceFreshnessRevertBoundary() public {
    uint256 currentTimestamp = block.timestamp;
    // Over boundary age > heartbeat should revert (asset, age, limit)
    vm.expectRevert(abi.encodeWithSelector(Errors.OraclePriceStale.selector, TEST_ASSET, 61, 60));
    wrapper.validatePriceFreshness(currentTimestamp - 61, 60, TEST_ASSET);
  }

  function testFuzzValidateOraclePrice(int256 price) public {
    if (price <= 0) {
      vm.expectRevert(
        abi.encodeWithSelector(Errors.OraclePriceNegative.selector, TEST_ASSET, price)
      );
      wrapper.validateOraclePrice(price, TEST_ASSET);
    } else {
      wrapper.validateOraclePrice(price, TEST_ASSET);
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
      wrapper.validatePriceFreshness(updateTimestamp, uint256(heartbeat), TEST_ASSET);
    } else {
      wrapper.validatePriceFreshness(updateTimestamp, uint256(heartbeat), TEST_ASSET);
    }
  }
}

contract OracleValidationLibWrapper {
  function validateOraclePrice(int256 price, address asset) external pure {
    OracleValidationLib.validateOraclePrice(price, asset);
  }

  function validatePriceFreshness(
    uint256 updateTimestamp,
    uint256 heartbeat,
    address asset
  ) external view {
    OracleValidationLib.validatePriceFreshness(updateTimestamp, heartbeat, asset);
  }
}
