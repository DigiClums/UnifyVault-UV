import { parseUnits } from 'viem';

/**
 * Calculates the USD valuation of a raw asset balance using its native decimal precision
 * and an 18-decimal fixed-point Oracle price.
 *
 * Uses BigInt fixed-point arithmetic `(balanceRaw * priceUSD18) / (10^decimals)` to maintain
 * exact precision before float conversion.
 *
 * @param balanceRaw - Raw BigInt token balance (e.g. 100,000,000 for 1.0 WBTC).
 * @param decimals - Token decimal precision (e.g. 8 for WBTC, 18 for WETH, 6 for USDC).
 * @param priceUSD18 - Asset price in 18-decimal fixed point USD (e.g. 60000e18 for $60,000).
 * @returns USD valuation as a number.
 */
export function calculateAssetUSDValue(
  balanceRaw: bigint,
  decimals: number,
  priceUSD18: bigint,
): number {
  if (balanceRaw <= 0n || priceUSD18 <= 0n || decimals < 0) return 0;
  const usdValue18 = (balanceRaw * priceUSD18) / 10n ** BigInt(decimals);
  return Number(usdValue18) / 1e18;
}

/**
 * Calculates Total Value Locked (TVL) in USD by summing individual asset USD valuations.
 *
 * @param assetValuesUSD - Array of asset valuations in USD.
 * @returns Total portfolio value in USD.
 */
export function calculateTVLUSD(assetValuesUSD: number[]): number {
  return assetValuesUSD.reduce((sum, val) => sum + (isNaN(val) || val < 0 ? 0 : val), 0);
}

/**
 * Calculates Net Asset Value (NAV) of the Total Vault in USD.
 * Total Vault NAV is equal to Total Value Locked (TVL) in USD.
 *
 * @param totalPortfolioValueUSD - Total portfolio value in USD.
 * @returns Total Vault NAV in USD. Defaults to 1.0 if zero or negative.
 */
export function calculateTotalVaultNAVUSD(totalPortfolioValueUSD: number): number {
  return totalPortfolioValueUSD > 0 ? totalPortfolioValueUSD : 1.0;
}

/**
 * Calculates price per share / NAV per share in USD based on Total Portfolio USD Value and total share supply.
 * Formula: Total Vault NAV / Total Share Supply.
 * Uses 18-decimal fixed point BigInt arithmetic to avoid loss of precision on large share supplies.
 *
 * @param totalPortfolioValueUSD - Total portfolio value in USD.
 * @param totalSharesRaw - Total share token supply in 18-decimal BigInt.
 * @returns Price per share (NAV per share) in USD. Defaults to 1.0 ($1.00) when share supply is zero.
 */
export function calculateSharePriceUSD(
  totalPortfolioValueUSD: number,
  totalSharesRaw: bigint,
): number {
  if (totalSharesRaw <= 0n || totalPortfolioValueUSD <= 0) {
    return 1.0;
  }
  const totalPortfolioValueUSD18 = parseUnits(totalPortfolioValueUSD.toFixed(18), 18);
  const sharePriceUSD18 = (totalPortfolioValueUSD18 * 10n ** 18n) / totalSharesRaw;
  return Number(sharePriceUSD18) / 1e18;
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
export function calculateCostBasis(
  contractInvestedRaw: bigint,
  userSharesRaw: bigint,
  userAddress?: string,
): number {
  let investedAssetsUSD = 0;

  // 1. On-chain CostBasisManager tracking
  if (contractInvestedRaw > 0n) {
    investedAssetsUSD = Number(contractInvestedRaw) / 1e6;
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

  // 3. Fallback: If user holds shares but cost basis is untracked, assume genesis $1.00/share
  if (investedAssetsUSD === 0 && userSharesRaw > 0n) {
    const userSharesNumber = Number(userSharesRaw) / 1e18;
    investedAssetsUSD = userSharesNumber * 1.0;
  }

  return investedAssetsUSD;
}

/**
 * Calculates current user portfolio value in USD from user share balance and share price.
 *
 * @param userSharesRaw - Raw BigInt user share balance (18 decimals).
 * @param sharePriceUSD - Price per share in USD.
 * @returns Current user portfolio USD value.
 */
export function calculateCurrentValueUSD(userSharesRaw: bigint, sharePriceUSD: number): number {
  if (userSharesRaw <= 0n || sharePriceUSD <= 0) return 0;
  const userSharesNumber = Number(userSharesRaw) / 1e18;
  return userSharesNumber * sharePriceUSD;
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
  const pnlUSD = currentValueUSD - investedAssetsUSD;
  const pnlPercent = investedAssetsUSD > 0 ? (pnlUSD / investedAssetsUSD) * 100 : 0;
  const isProfitable = pnlUSD >= 0;

  return {
    pnlUSD,
    pnlPercent,
    isProfitable,
  };
}

/**
 * Calculates user average entry price per share in USD.
 * Defaults to current share price if user holds zero shares or zero invested assets.
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
  if (userSharesRaw <= 0n || investedAssetsUSD <= 0) {
    return 0;
  }
  const userSharesNumber = Number(userSharesRaw) / 1e18;
  return userSharesNumber > 0 ? investedAssetsUSD / userSharesNumber : 0;
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
