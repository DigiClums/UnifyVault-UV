export const mockAssetBalances = {
  USDC: 1000000000n, // 1,000 USDC (6 decimals)
  WETH: 2000000000000000000n, // 2 WETH (18 decimals)
  CBBTC: 50000000n, // 0.5 cbBTC (8 decimals)
};

export const mockShareBalances = {
  UVBTCETH: 1500000000000000000000n, // 1,500 shares (18 decimals)
};

export const mockVaultMetricsRead = {
  totalTvlUSD: '$1,250,000.00',
  totalSharesSupply: '1,000,000.00',
  vaultAddress: '0xVaultAddress00000000000000000000000000',
  controllerAddress: '0xControllerAddress000000000000000000',
  tokenAddress: '0xTokenAddress00000000000000000000000',
};

export const mockDepositQuoteRead = {
  assetId: '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`,
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  receiver: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  depositAmount: 1000000000n,
  rawPrice: 100000000n,
  normalizedPrice: 1000000000000000000n,
  sharesPreview: 997500000000000000000n,
  protocolFee: 2500000n,
  netDeposit: 997500000n,
  timestamp: 1700000000n,
};
