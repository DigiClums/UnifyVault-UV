import { formatUnits } from './format';

export function normalizePriceTo18(rawPrice: bigint, decimals: number = 8): bigint {
  if (decimals === 18) return rawPrice;
  if (decimals < 18) {
    return rawPrice * 10n ** BigInt(18 - decimals);
  }
  return rawPrice / 10n ** BigInt(decimals - 18);
}

export function calculateAssetUSDValue(
  balanceRaw: bigint,
  assetDecimals: number,
  normalizedPrice18: bigint,
): number {
  if (balanceRaw <= 0n || normalizedPrice18 <= 0n || assetDecimals < 0) return 0;
  const usdValue18 = (balanceRaw * normalizedPrice18) / 10n ** BigInt(assetDecimals);
  return Number(usdValue18) / 1e18;
}
