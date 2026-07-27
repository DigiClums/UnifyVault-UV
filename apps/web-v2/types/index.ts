export interface ProtocolAddresses {
  directory: `0x${string}`;
  controller: `0x${string}`;
  vault: `0x${string}`;
  treasury: `0x${string}`;
  oracle: `0x${string}`;
  token: `0x${string}`;
  costBasis: `0x${string}`;
  usdc: `0x${string}`;
  portfolioManager?: `0x${string}`;
  strategyManager?: `0x${string}`;
  swapAdapter?: `0x${string}`;
  feeManager?: `0x${string}`;
}

export interface DepositQuoteData {
  assetId: `0x${string}`;
  asset: `0x${string}`;
  receiver: `0x${string}`;
  depositAmount: bigint;
  rawPrice: bigint;
  normalizedPrice: bigint;
  sharesPreview: bigint;
  protocolFee: bigint;
  netDeposit: bigint;
  timestamp: bigint;
}

export interface FormattedDepositQuote {
  grossDepositUSD: string;
  protocolFeeUSD: string;
  netDepositUSD: string;
  sharesToMintFormatted: string;
  protocolFeeFormatted: string;
  netDepositFormatted: string;
  rawQuote: DepositQuoteData;
}

export interface DashboardMetrics {
  totalPortfolioValueUSD: string;
  navPerShareUSD: string;
  sharePriceUSD: string;
  investedAssetsUSD: string;
  currentValueUSD: string;
  pnlUSD: string;
  pnlPercentage: string;
  isProfitable: boolean;
  userSharesBalance: string;
  userUsdcBalance: string;
  btcAllocationPercent: string;
  ethAllocationPercent: string;
  usdcBalanceFormatted: string;
  isLoading: boolean;
  isError: boolean;
}

export interface AssetHolding {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  balanceRaw: bigint;
  balanceFormatted: string;
  priceUSD: string;
  valueUSD: string;
  weightBps: number;
  weightPercent: string;
}

export interface HistoricalNavPoint {
  timestamp: string;
  navUSD: number;
  portfolioValueUSD: number;
}
