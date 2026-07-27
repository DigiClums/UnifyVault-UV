export function calculateRedeemFee(grossAssetsRaw: bigint, redeemFeeBps: bigint = 200n): bigint {
  return (grossAssetsRaw * redeemFeeBps) / 10000n;
}

export function calculateNetRedeem(grossAssetsRaw: bigint, redeemFeeBps: bigint = 200n): bigint {
  const fee = calculateRedeemFee(grossAssetsRaw, redeemFeeBps);
  return grossAssetsRaw - fee;
}

export function calculateSlippageMinAssets(
  expectedNetAssetsRaw: bigint,
  slippageTolerancePercent: number = 0.5,
): bigint {
  if (expectedNetAssetsRaw === 0n) return 0n;
  const factorBps = BigInt(Math.floor((100 - slippageTolerancePercent) * 100));
  return (expectedNetAssetsRaw * factorBps) / 10000n;
}
