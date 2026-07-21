// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ShareLib
 * @notice Pure library containing vault share calculation formulas for bootstrapping and proportional minting/redemption.
 * @dev Normalizes collateral assets with arbitrary decimal precision (e.g. USDC=6, WBTC=8, WETH=18) to 18-decimal share precision.
 */
library ShareLib {
  uint8 public constant SHARE_DECIMALS = 18;

  /**
   * @notice Normalizes a raw collateral amount to 18 decimal places based on asset decimals
   * @param amount Amount in raw collateral asset decimals
   * @param assetDecimals Decimals of the collateral token
   * @return Amount normalized to 18 decimals
   */
  function normalizeTo18(uint256 amount, uint8 assetDecimals) internal pure returns (uint256) {
    if (assetDecimals == SHARE_DECIMALS) {
      return amount;
    } else if (assetDecimals < SHARE_DECIMALS) {
      return amount * (10 ** (SHARE_DECIMALS - assetDecimals));
    } else {
      return amount / (10 ** (assetDecimals - SHARE_DECIMALS));
    }
  }

  /**
   * @notice Denormalizes an 18-decimal amount back to raw asset decimals
   * @param amount18 Amount in 18-decimal precision
   * @param assetDecimals Decimals of the target collateral token
   * @return Amount in raw collateral asset decimals
   */
  function denormalizeFrom18(
    uint256 amount18,
    uint8 assetDecimals
  ) internal pure returns (uint256) {
    if (assetDecimals == SHARE_DECIMALS) {
      return amount18;
    } else if (assetDecimals < SHARE_DECIMALS) {
      return amount18 / (10 ** (SHARE_DECIMALS - assetDecimals));
    } else {
      return amount18 * (10 ** (assetDecimals - SHARE_DECIMALS));
    }
  }

  /**
   * @notice Computes share amount for a net deposit given total supply, total vault assets, and asset decimals
   * @param netDeposit The net amount of collateral deposited (in raw asset decimals)
   * @param totalSupply The total supply of UVBTCETHToken shares (in 18 decimals)
   * @param totalAssets The total amount of collateral assets in CustodyVault (in raw asset decimals)
   * @param assetDecimals Decimals of the collateral asset being deposited
   * @return Shares to mint (in 18-decimal precision)
   */
  function calculateShares(
    uint256 netDeposit,
    uint256 totalSupply,
    uint256 totalAssets,
    uint8 assetDecimals
  ) internal pure returns (uint256) {
    uint256 netDeposit18 = normalizeTo18(netDeposit, assetDecimals);

    if (totalSupply == 0 || totalAssets == 0) {
      return netDeposit18;
    }

    uint256 totalAssets18 = normalizeTo18(totalAssets, assetDecimals);
    return (netDeposit18 * totalSupply) / totalAssets18;
  }

  /**
   * @notice Computes collateral asset amount to return for a given number of shares burned
   * @dev Uses pre-burn totalSupply and totalAssets. Returns amount in raw asset decimals.
   * @param shares The number of shares to redeem/burn (in 18 decimals)
   * @param totalSupply The total supply of UVBTCETHToken shares (in 18 decimals)
   * @param accountedAssets The accounted collateral assets in CustodyVault (in raw asset decimals)
   * @param assetDecimals Decimals of the collateral asset
   * @return Gross collateral assets to release (in raw asset decimals)
   */
  function sharesToAssets(
    uint256 shares,
    uint256 totalSupply,
    uint256 accountedAssets,
    uint8 assetDecimals
  ) internal pure returns (uint256) {
    if (totalSupply == 0 || accountedAssets == 0) {
      return 0;
    }

    uint256 accountedAssets18 = normalizeTo18(accountedAssets, assetDecimals);
    uint256 grossAssets18 = (shares * accountedAssets18) / totalSupply;
    return denormalizeFrom18(grossAssets18, assetDecimals);
  }
}
