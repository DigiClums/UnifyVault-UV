import { formatUnits } from './format';

export function calculateCurrentValueUSD(userShares18: bigint, sharePriceUSD: number): number {
  if (userShares18 === 0n) return 0;
  const shares = Number(formatUnits(userShares18, 18));
  return shares * sharePriceUSD;
}

export function calculatePnL(
  currentValueUSD: number,
  investedAssetsUSD: number,
): { pnlUSD: number; pnlPercent: number; isProfitable: boolean } {
  if (investedAssetsUSD <= 0) {
    return { pnlUSD: 0, pnlPercent: 0, isProfitable: true };
  }

  const pnlUSD = currentValueUSD - investedAssetsUSD;
  const pnlPercent = (pnlUSD / investedAssetsUSD) * 100;

  return {
    pnlUSD,
    pnlPercent,
    isProfitable: pnlUSD >= 0,
  };
}
