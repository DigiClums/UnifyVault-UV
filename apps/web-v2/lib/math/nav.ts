import { formatUnits } from './format';

export function calculateNAVUSD(totalPortfolioValueUSD18: bigint): number {
  if (!totalPortfolioValueUSD18) return 0;
  return Number(formatUnits(totalPortfolioValueUSD18, 18));
}

export function calculateSharePriceUSD(
  totalPortfolioValueUSD18: bigint,
  totalShares18: bigint,
): number {
  if (!totalPortfolioValueUSD18 || !totalShares18 || totalShares18 === 0n) {
    return 1.0; // $1.00 USD initial share price
  }
  const value = Number(formatUnits(totalPortfolioValueUSD18, 18));
  const shares = Number(formatUnits(totalShares18, 18));
  return shares > 0 ? value / shares : 1.0;
}
