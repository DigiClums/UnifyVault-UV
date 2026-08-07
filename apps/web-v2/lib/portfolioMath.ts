import { parseUnits } from 'viem';

/**
 * Calculates the USD valuation of a raw asset balance in 18-decimal BigInt.
 *
 * Formula: (balanceRaw * priceUSD18) / (10^decimals)
 */
export function calculateAssetUSDValue18(
  balanceRaw: bigint,
  decimals: number,
  priceUSD18: bigint,
): bigint {
  if (balanceRaw <= 0n || priceUSD18 <= 0n || decimals < 0) return 0n;
  return (balanceRaw * priceUSD18) / 10n ** BigInt(decimals);
}

/**
 * Calculates the USD valuation of a raw asset balance using its native decimal precision
 * and an 18-decimal fixed-point Oracle price, returning a JS number.
 */
export function calculateAssetUSDValue(
  balanceRaw: bigint,
  decimals: number,
  priceUSD18: bigint,
): number {
  const usdValue18 = calculateAssetUSDValue18(balanceRaw, decimals, priceUSD18);
  return Number(usdValue18) / 1e18;
}

/**
 * Calculates Total Value Locked (TVL) in USD by summing individual asset USD valuations.
 */
export function calculateTVLUSD(assetValuesUSD: number[]): number {
  return assetValuesUSD.reduce((sum, val) => sum + (isNaN(val) || !isFinite(val) || val < 0 ? 0 : val), 0);
}

/**
 * Calculates Total Value Locked (TVL) in 18-decimal BigInt.
 */
export function calculateTVLUSD18(assetValuesUSD18: bigint[]): bigint {
  return assetValuesUSD18.reduce((sum, val) => sum + (val < 0n ? 0n : val), 0n);
}

/**
 * Calculates Net Asset Value (NAV) of the Total Vault in USD.
 * Total Vault NAV is equal to Total Value Locked (TVL) in USD.
 */
export function calculateTotalVaultNAVUSD(totalPortfolioValueUSD: number): number {
  return totalPortfolioValueUSD > 0 && isFinite(totalPortfolioValueUSD) ? totalPortfolioValueUSD : 0;
}

/**
 * Calculates price per share / NAV per share in USD based on Total Portfolio USD Value and total share supply.
 * Formula: Total Vault NAV / Total Share Supply.
 * Uses 18-decimal fixed point BigInt arithmetic to avoid loss of precision on large share supplies.
 */
export function calculateSharePriceUSD(
  totalPortfolioValueUSD: number,
  totalSharesRaw: bigint,
): number {
  if (totalSharesRaw <= 0n || totalPortfolioValueUSD <= 0 || !isFinite(totalPortfolioValueUSD) || isNaN(totalPortfolioValueUSD)) {
    return 1.0;
  }
  try {
    const totalPortfolioValueUSD18 = parseUnits(totalPortfolioValueUSD.toFixed(18), 18);
    const sharePriceUSD18 = (totalPortfolioValueUSD18 * 10n ** 18n) / totalSharesRaw;
    const result = Number(sharePriceUSD18) / 1e18;
    return result > 0 && isFinite(result) ? result : 1.0;
  } catch {
    return 1.0;
  }
}

/**
 * Calculates share price in 18-decimal BigInt fixed point arithmetic directly from TVL BigInt.
 */
export function calculateSharePriceUSD18(
  totalPortfolioValueUSD18: bigint,
  totalSharesRaw: bigint,
): bigint {
  if (totalSharesRaw <= 0n || totalPortfolioValueUSD18 <= 0n) {
    return 10n ** 18n; // Genesis $1.00 USD (1e18)
  }
  return (totalPortfolioValueUSD18 * 10n ** 18n) / totalSharesRaw;
}


/**
 * Calculates Net Asset Value (NAV) per Share in USD.
 * Mathematically identical to Share Price USD (Total Vault NAV / Total Shares Supply).
 *
 * @param totalPortfolioValueUSD - Total portfolio value in USD.
 * @param totalSharesRaw - Total share token supply in 18-decimal BigInt.
 * @returns NAV per share in USD.
 */
export function calculateNAVPerShareUSD(
  totalPortfolioValueUSD: number,
  totalSharesRaw: bigint,
): number {
  return calculateSharePriceUSD(totalPortfolioValueUSD, totalSharesRaw);
}

/**
 * Calculates user ownership ratio of the vault pool as a decimal between 0.0 and 1.0.
 * Uses high-precision BigInt scaled division (1e16) to avoid premature float truncation.
 *
 * @param userSharesRaw - Raw BigInt balance of user shares.
 * @param totalSharesRaw - Raw BigInt total supply of shares.
 * @returns Ownership ratio as a decimal between 0.0 and 1.0.
 */
export function calculateOwnershipRatio(userSharesRaw: bigint, totalSharesRaw: bigint): number {
  if (totalSharesRaw <= 0n || userSharesRaw <= 0n) return 0;
  if (userSharesRaw >= totalSharesRaw) return 1.0;
  const ratioScaled16 = (userSharesRaw * 10n ** 16n) / totalSharesRaw;
  return Number(ratioScaled16) / 1e16;
}

/**
 * Formats user ownership ratio into a human-readable percentage string.
 *
 * @param ownershipRatio - Ownership decimal ratio (0.0 to 1.0).
 * @returns Formatted percentage string (e.g. "0.00%", "< 0.01%", or "12.34%").
 */
export function calculateOwnershipPercentage(ownershipRatio: number): string {
  if (ownershipRatio <= 0) return '0.00%';
  const percentNum = ownershipRatio * 100;
  if (percentNum < 0.01) return '< 0.01%';
  return `${percentNum.toFixed(2)}%`;
}

/**
 * Calculates user's exact pro-rata asset share in raw BigInt units using BigInt integer arithmetic.
 *
 * @param totalAssetRaw - Total raw balance of collateral asset in CustodyVault.
 * @param userSharesRaw - User raw share balance.
 * @param totalSharesRaw - Total raw share supply.
 * @returns User's raw asset balance claim as BigInt.
 */
export function calculateUserProRataBalance(
  totalAssetRaw: bigint,
  userSharesRaw: bigint,
  totalSharesRaw: bigint,
): bigint {
  if (totalSharesRaw <= 0n || userSharesRaw <= 0n || totalAssetRaw <= 0n) return 0n;
  return (totalAssetRaw * userSharesRaw) / totalSharesRaw;
}

/**
 * Calculates user's pro-rata asset USD claim value.
 *
 * @param totalAssetUSD - Total asset USD value in CustodyVault.
 * @param ownershipRatio - User ownership ratio (0.0 to 1.0).
 * @returns User's USD claim value for the asset.
 */
export function calculateUserProRataUSD(totalAssetUSD: number, ownershipRatio: number): number {
  if (ownershipRatio <= 0 || totalAssetUSD <= 0) return 0;
  return totalAssetUSD * ownershipRatio;
}

/**
 * Derives user invested capital in USD based on on-chain cost basis, browser localStorage cache,
 * and genesis share price fallback rules.
 *
 * @param contractInvestedRaw - On-chain invested assets raw BigInt (6 decimals USDC).
 * @param userSharesRaw - User raw share balance (18 decimals).
 * @param userAddress - User's EVM wallet address for localStorage lookup.
 * @returns Invested capital in USD.
 */
/**
 * Derives user invested capital in USD based on on-chain cost basis, browser localStorage cache,
 * and genesis share price fallback rules.
 *
 * @param contractInvestedRaw - On-chain invested assets raw BigInt (18 decimals USD fixed point).
 * @param userSharesRaw - User raw share balance (18 decimals).
 * @param userAddress - User's EVM wallet address for localStorage lookup.
 * @returns Invested capital in USD.
 */
export function calculateCostBasis(
  contractInvestedRaw: bigint,
  userSharesRaw: bigint,
  userAddress?: string,
): number {
  let investedAssetsUSD = 0;

  // 1. On-chain CostBasisManager tracking (18 decimals fixed point)
  if (contractInvestedRaw > 0n) {
    investedAssetsUSD = Number(contractInvestedRaw) / 1e18;
  }
  // 2. Browser localStorage fallback
  else if (typeof window !== 'undefined' && userAddress) {
    try {
      const localStored = localStorage.getItem(
        `unifyvault_invested_assets_${userAddress.toLowerCase()}`,
      );
      if (localStored && !isNaN(Number(localStored)) && Number(localStored) > 0) {
        investedAssetsUSD = Number(localStored);
      }
    } catch {
      // Ignore localStorage access errors
    }
  }

  return isFinite(investedAssetsUSD) && !isNaN(investedAssetsUSD) && investedAssetsUSD >= 0
    ? investedAssetsUSD
    : 0;
}

/**
 * Calculates current user portfolio value in USD from user share balance and share price.
 *
 * @param userSharesRaw - Raw BigInt user share balance (18 decimals).
 * @param sharePriceUSD - Price per share in USD.
 * @returns Current user portfolio USD value.
 */
export function calculateCurrentValueUSD(userSharesRaw: bigint, sharePriceUSD: number): number {
  if (userSharesRaw <= 0n || sharePriceUSD <= 0 || !isFinite(sharePriceUSD) || isNaN(sharePriceUSD)) {
    return 0;
  }
  const userSharesNumber = Number(userSharesRaw) / 1e18;
  const val = userSharesNumber * sharePriceUSD;
  return isFinite(val) && !isNaN(val) && val >= 0 ? val : 0;
}

/**
 * Calculates user Profit and Loss (PnL) metrics.
 *
 * @param currentValueUSD - Current portfolio USD valuation.
 * @param investedAssetsUSD - Total invested capital in USD.
 * @returns Object containing pnlUSD, pnlPercent, and isProfitable.
 */
export function calculatePnL(
  currentValueUSD: number,
  investedAssetsUSD: number,
): { pnlUSD: number; pnlPercent: number; isProfitable: boolean } {
  const safeCurrent = isFinite(currentValueUSD) && !isNaN(currentValueUSD) ? currentValueUSD : 0;
  const safeInvested = isFinite(investedAssetsUSD) && !isNaN(investedAssetsUSD) ? investedAssetsUSD : 0;

  const pnlUSD = safeCurrent - safeInvested;
  const pnlPercent = safeInvested > 0 ? (pnlUSD / safeInvested) * 100 : 0;
  const isProfitable = pnlUSD >= 0;

  return {
    pnlUSD: isFinite(pnlUSD) && !isNaN(pnlUSD) ? pnlUSD : 0,
    pnlPercent: isFinite(pnlPercent) && !isNaN(pnlPercent) ? pnlPercent : 0,
    isProfitable,
  };
}

/**
 * Calculates user average entry price per share in USD.
 * Defaults to 0 if user holds zero shares or zero invested assets.
 *
 * @param userSharesRaw - User raw share balance (18 decimals).
 * @param investedAssetsUSD - User invested capital in USD.
 * @param currentSharePriceUSD - Current price per share in USD.
 * @returns Average entry price per share in USD.
 */
export function calculateAverageEntryPrice(
  userSharesRaw: bigint,
  investedAssetsUSD: number,
  currentSharePriceUSD: number,
): number {
  if (
    userSharesRaw <= 0n ||
    investedAssetsUSD <= 0 ||
    !isFinite(investedAssetsUSD) ||
    isNaN(investedAssetsUSD)
  ) {
    return 0;
  }
  const userSharesNumber = Number(userSharesRaw) / 1e18;
  if (userSharesNumber <= 0 || !isFinite(userSharesNumber) || isNaN(userSharesNumber)) {
    return 0;
  }
  const avgEntryPrice = investedAssetsUSD / userSharesNumber;
  return isFinite(avgEntryPrice) && !isNaN(avgEntryPrice) && avgEntryPrice >= 0
    ? avgEntryPrice
    : 0;
}

/**
 * Calculates asset allocation percentage of total USD portfolio.
 *
 * @param assetUSD - Asset value in USD.
 * @param totalUSD - Total portfolio value in USD.
 * @returns Allocation percentage (0.0 to 100.0).
 */
export function calculateAllocationPercent(assetUSD: number, totalUSD: number): number {
  if (totalUSD <= 0 || assetUSD <= 0) return 0;
  return (assetUSD / totalUSD) * 100;
}

/**
 * Calculates asset allocation weight in basis points (BPS).
 *
 * @param assetUSD - Asset value in USD.
 * @param totalUSD - Total portfolio value in USD.
 * @returns Weight in basis points (0 to 10000).
 */
export function calculateAllocationBps(assetUSD: number, totalUSD: number): number {
  if (totalUSD <= 0 || assetUSD <= 0) return 0;
  return Math.round((assetUSD / totalUSD) * 10000);
}
