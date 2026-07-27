// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title FeeLib
 * @notice Pure library containing protocol-wide fee calculation parameters and logic
 */
library FeeLib {
  uint256 public constant DEPOSIT_FEE_BPS = 25;
  uint256 public constant REDEEM_FEE_BPS = 200;
  uint256 public constant BPS_DENOMINATOR = 10000;

  /**
   * @notice Calculates the protocol deposit fee for an incoming amount with custom depositFeeBps
   */
  function calculateDepositFee(
    uint256 amount,
    uint256 depositFeeBps
  ) internal pure returns (uint256) {
    return (amount * depositFeeBps) / BPS_DENOMINATOR;
  }

  /**
   * @notice Calculates the protocol deposit fee for an incoming amount using default deposit fee
   */
  function calculateDepositFee(uint256 amount) internal pure returns (uint256) {
    return calculateDepositFee(amount, DEPOSIT_FEE_BPS);
  }

  /**
   * @notice Calculates the protocol redemption fee for an outgoing amount with custom redeemFeeBps
   */
  function calculateRedeemFee(
    uint256 amount,
    uint256 redeemFeeBps
  ) internal pure returns (uint256) {
    return (amount * redeemFeeBps) / BPS_DENOMINATOR;
  }

  /**
   * @notice Calculates the protocol redemption fee for an outgoing amount using default redeem fee
   */
  function calculateRedeemFee(uint256 amount) internal pure returns (uint256) {
    return calculateRedeemFee(amount, REDEEM_FEE_BPS);
  }

  /**
   * @notice Returns the net deposit amount after subtracting the deposit fee
   */
  function calculateNetDeposit(
    uint256 amount,
    uint256 depositFeeBps
  ) internal pure returns (uint256) {
    uint256 fee = calculateDepositFee(amount, depositFeeBps);
    return amount - fee;
  }

  /**
   * @notice Returns the net deposit amount after subtracting the default deposit fee
   */
  function calculateNetDeposit(uint256 amount) internal pure returns (uint256) {
    return calculateNetDeposit(amount, DEPOSIT_FEE_BPS);
  }

  /**
   * @notice Calculates the full redemption fee breakdown from gross asset output with custom redeemFeeBps
   * @param grossAssets The gross collateral amount before fee deduction
   * @param redeemFeeBps The redemption fee in basis points
   * @return grossOut The gross collateral amount (same as input)
   * @return protocolFee The protocol fee deducted
   * @return netAssets The net collateral amount returned to the redeemer
   */
  function calculateRedemptionFee(
    uint256 grossAssets,
    uint256 redeemFeeBps
  ) internal pure returns (uint256 grossOut, uint256 protocolFee, uint256 netAssets) {
    protocolFee = calculateRedeemFee(grossAssets, redeemFeeBps);
    netAssets = grossAssets - protocolFee;
    return (grossAssets, protocolFee, netAssets);
  }

  /**
   * @notice Calculates the full redemption fee breakdown from gross asset output using default redeem fee
   */
  function calculateRedemptionFee(
    uint256 grossAssets
  ) internal pure returns (uint256 grossOut, uint256 protocolFee, uint256 netAssets) {
    return calculateRedemptionFee(grossAssets, REDEEM_FEE_BPS);
  }

  uint256 public constant PERFORMANCE_FEE_BPS = 500; // 5.00%

  /**
   * @notice Calculates performance fee for chargeable profit with custom performanceFeeBps
   */
  function calculatePerformanceFee(
    uint256 chargeableProfit,
    uint256 performanceFeeBps
  ) internal pure returns (uint256) {
    return (chargeableProfit * performanceFeeBps) / BPS_DENOMINATOR;
  }

  /**
   * @notice Calculates performance fee for chargeable profit using default performance fee (500 = 5.00%)
   */
  function calculatePerformanceFee(uint256 chargeableProfit) internal pure returns (uint256) {
    return calculatePerformanceFee(chargeableProfit, PERFORMANCE_FEE_BPS);
  }
}
