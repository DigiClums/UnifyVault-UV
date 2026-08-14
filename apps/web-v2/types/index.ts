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
  totalVaultNAVUSD: string;
  backingValueUSD?: string;
  navPerShareUSD: string;
  sharePriceUSD: string;
  currentUVPriceUSD?: string;
  sharePriceNumber: number;
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
  averageEntryPriceUSD: string;
  ownershipPercentage: string;
  rawInvestedAssetsUSD: number;
  rawCurrentValueUSD: number;
  rawPnLUSD: number;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt?: number;
  secondsAgo?: number | null;
  isLiveSynced?: boolean;
}

export type OracleFeedStatus = 'LIVE' | 'STALE' | 'REVERTED' | 'UNAVAILABLE';

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
  targetWeightPercent?: string;
  currentWeightPercent?: string;
  oracleStatus?: OracleFeedStatus;
}

/**
 * Strategy target weight configuration metrics from StrategyManager contract.
 * All values are undefined when data hasn't loaded (NO FALLBACKS).
 */
export interface StrategyMetrics {
  targetBtcBps: number | undefined;
  targetEthBps: number | undefined;
  targetBtcPercent: string | undefined;
  targetEthPercent: string | undefined;
}

/**
 * Global Protocol Level Metrics (TVL, Backing Value, UV Price, Total Supply, Strategy Allocation).
 */
export interface ProtocolMetrics {
  totalPortfolioValueUSD: string;
  totalVaultNAVUSD: string;
  backingValueUSD?: string;
  totalPortfolioValueUSDNumber: number;
  navPerShareUSD: string;
  sharePriceUSD: string;
  currentUVPriceUSD?: string;
  sharePriceNumber: number;
  totalSharesRaw: bigint;
  totalSharesFormatted: string;
  targetBtcBps: number | undefined;
  targetEthBps: number | undefined;
  targetBtcPercent: string | undefined;
  targetEthPercent: string | undefined;
  custodyBtcPercent: string;
  custodyEthPercent: string;
  protocolHoldings: AssetHolding[];
  btcOracleStatus?: OracleFeedStatus;
  ethOracleStatus?: OracleFeedStatus;
  usdcOracleStatus?: OracleFeedStatus;
  isOracleFresh?: boolean;
}

/**
 * User Specific Portfolio Metrics (Shares, Ownership, Holdings, PnL, Entry Price).
 */
export interface UserPortfolio {
  userAddress?: `0x${string}`;
  userSharesRaw: bigint;
  userSharesBalance: string;
  userUsdcBalanceRaw: bigint;
  userUsdcBalanceFormatted: string;
  investedAssetsUSD: string;
  rawInvestedAssetsUSD: number;
  currentValueUSD: string;
  rawCurrentValueUSD: number;
  pnlUSD: string;
  rawPnLUSD: number;
  pnlPercentage: string;
  isProfitable: boolean;
  averageEntryPriceUSD: string;
  ownershipPercentage: string;
  userHoldings: AssetHolding[];
}

export interface HistoricalNavPoint {
  timestamp: string;
  navUSD: number;
  portfolioValueUSD: number;
}

export interface NavSnapshot {
  blockNumber?: number;
  blockHash?: string;
  timestamp: string;
  nav: number;
  totalAssets: number;
  totalSupply?: number;
  btcPrice?: number;
  ethPrice?: number;
  btcWeight?: number;
  ethWeight?: number;
  sharePrice?: number;
}
