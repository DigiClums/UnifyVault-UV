export function calculateDepositFee(amountRaw: bigint, depositFeeBps: bigint = 25n): bigint {
  return (amountRaw * depositFeeBps) / 10000n;
}

export function calculateNetDeposit(amountRaw: bigint, depositFeeBps: bigint = 25n): bigint {
  const fee = calculateDepositFee(amountRaw, depositFeeBps);
  return amountRaw - fee;
}

export function calculateEstimatedShares(
  netDepositRaw: bigint,
  assetDecimals: number,
  totalShares18: bigint,
  totalPortfolioValueUSD18: bigint,
  assetPriceUSD18: bigint,
): bigint {
  if (netDepositRaw === 0n || assetPriceUSD18 === 0n) return 0n;

  // Convert net deposit to 18 decimals
  const netDeposit18 =
    assetDecimals === 18 ? netDepositRaw : netDepositRaw * 10n ** BigInt(18 - assetDecimals);

  // Compute deposit value in USD (18 decimals)
  const depositValueUSD18 = (netDeposit18 * assetPriceUSD18) / 10n ** 18n;

  if (totalShares18 === 0n || totalPortfolioValueUSD18 === 0n) {
    return depositValueUSD18;
  }

  return (depositValueUSD18 * totalShares18) / totalPortfolioValueUSD18;
}

export function calculateSlippageMinShares(
  estimatedShares18: bigint,
  slippageTolerancePercent: number = 0.5,
): bigint {
  if (estimatedShares18 === 0n) return 0n;
  const factorBps = BigInt(Math.floor((100 - slippageTolerancePercent) * 100));
  return (estimatedShares18 * factorBps) / 10000n;
}
