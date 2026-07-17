// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title FeeLib
 * @notice Pure library containing protocol-wide fee calculation parameters and logic
 */
library FeeLib {
  uint256 public constant DEPOSIT_FEE_BPS = 25;
  uint256 public constant REDEEM_FEE_BPS = 25;
  uint256 public constant BPS_DENOMINATOR = 10000;

  /**
   * @notice Calculates the protocol deposit fee for an incoming amount
   */
  function calculateDepositFee(uint256 amount) internal pure returns (uint256) {
    return (amount * DEPOSIT_FEE_BPS) / BPS_DENOMINATOR;
  }

  /**
   * @notice Calculates the protocol redemption fee for an outgoing amount
   */
  function calculateRedeemFee(uint256 amount) internal pure returns (uint256) {
    return (amount * REDEEM_FEE_BPS) / BPS_DENOMINATOR;
  }

  /**
   * @notice Returns the net deposit amount after subtracting the deposit fee
   */
  function calculateNetDeposit(uint256 amount) internal pure returns (uint256) {
    uint256 fee = calculateDepositFee(amount);
    return amount - fee;
  }

  /**
   * @notice Calculates the full redemption fee breakdown from gross asset output
   * @param grossAssets The gross collateral amount before fee deduction
   * @return grossOut The gross collateral amount (same as input)
   * @return protocolFee The protocol fee deducted
   * @return netAssets The net collateral amount returned to the redeemer
   */
  function calculateRedemptionFee(
    uint256 grossAssets
  ) internal pure returns (uint256 grossOut, uint256 protocolFee, uint256 netAssets) {
    protocolFee = calculateRedeemFee(grossAssets);
    netAssets = grossAssets - protocolFee;
    return (grossAssets, protocolFee, netAssets);
  }
}
