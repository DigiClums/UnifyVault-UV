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
  if (balanceRaw === 0n || normalizedPrice18 === 0n) return 0;
  const balanceNorm = Number(formatUnits(balanceRaw, assetDecimals));
  const priceNorm = Number(formatUnits(normalizedPrice18, 18));
  return balanceNorm * priceNorm;
}
