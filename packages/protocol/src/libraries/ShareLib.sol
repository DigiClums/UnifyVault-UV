// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ShareLib
 * @notice Pure library containing vault share calculation formulas for bootstrapping and proportional minting
 */
library ShareLib {
  /**
   * @notice Computes share amount for a net deposit given the total supply and vault assets
   * @param netDeposit The net amount of collateral deposited
   * @param totalSupply The total supply of UVBTCETHToken shares
   * @param totalAssets The total amount of collateral assets in CustodyVault
   */
  function calculateShares(
    uint256 netDeposit,
    uint256 totalSupply,
    uint256 totalAssets
  ) internal pure returns (uint256) {
    if (totalSupply == 0) {
      return netDeposit;
    }
    if (totalAssets == 0) {
      return netDeposit;
    }
    return (netDeposit * totalSupply) / totalAssets;
  }
}
