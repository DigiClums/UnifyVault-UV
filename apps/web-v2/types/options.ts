/**
 * Unified Type Definitions for UVBE Options Protocol (UV-NIFTY)
 * Enforces strict typing without 'any'.
 */

export type OptionType = 'CE' | 'PE';
export type TradeSide = 'BUY' | 'WRITE';
export type ExpiryCycle = '0-DTE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type OptionMoneyness = 'ITM' | 'ATM' | 'OTM';

export interface IndexComponent {
  symbol: string;
  name: string;
  weightPct: number; // e.g., 60 for 60%
  priceUsd: number;
  priceChange24h: number;
  oracleStatus: 'LIVE' | 'STALE' | 'FALLBACK';
}

export interface UVNiftyIndexData {
  spotPriceUsd: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24hUsd: number;
  lastUpdated: number; // timestamp in seconds
  components: {
    btc: IndexComponent;
    eth: IndexComponent;
  };
  isOracleFresh: boolean;
}

export interface OptionContractQuote {
  strike: number;
  expiryTimestamp: number;
  expiryLabel: string;
  cycle: ExpiryCycle;
  type: OptionType;

  // USD valuations
  premiumUsd: number;
  intrinsicValueUsd: number;
  timeValueUsd: number;

  // UVBE valuations (Normalized by live UVBE/USD Oracle feed)
  premiumUvbe: number;
  uvbePriceUsd: number;

  // Greeks
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
  iv: number; // Implied Volatility % (e.g., 55.4%)

  // Market metrics
  openInterest: number;
  volume24h: number;
  moneyness: OptionMoneyness;
  lotSize: number; // e.g. 0.01 index units per lot
}

export interface StrikeRow {
  strike: number;
  isAtm: boolean;
  ce: OptionContractQuote;
  pe: OptionContractQuote;
}

export interface UserOptionPosition {
  id: string;
  optionType: OptionType;
  side: TradeSide;
  strike: number;
  expiryTimestamp: number;
  expiryLabel: string;
  quantityLots: number;
  lotSize: number;

  // UVBE metrics
  entryPremiumUvbe: number;
  entryPremiumUsd?: number;
  currentPremiumUvbe: number;
  currentMarkPremiumUvbe?: number;
  currentMarkPremiumUsd?: number;
  collateralLockedUvbe: number; // For writers

  // Valuation & PnL
  unrealizedPnlUvbe: number;
  unrealizedPnlUsd?: number;
  unrealizedPnlPercent: number;
  realizedPnlUvbe: number;

  // Greeks & Analytics
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  ivPercent?: number;
  breakEvenPriceUsd?: number;
  timeToExpiryStr?: string;
  seriesId?: string;

  // Status & Margin
  status: 'OPEN' | 'EXPIRED' | 'SETTLED' | 'LIQUIDATED';
  maintenanceMarginUvbe: number;
  marginHealthPercent: number; // e.g. 140%
  isLiquidationRisk: boolean;
}

export interface OptionMarginAccount {
  totalUvbeBalance: number;
  availableMarginUvbe: number;
  lockedMarginUvbe: number;
  maintenanceMarginRequiredUvbe: number;
  marginHealthRatio: number; // e.g. 1.85 (185%)
  healthStatus: 'HEALTHY' | 'WARNING' | 'DANGER' | 'LIQUIDATION';
  haircutAppliedPercent: number; // e.g. 20%
  unrealizedTotalPnlUvbe: number;
}

export interface SettlementRecord {
  positionId: string;
  strike: number;
  optionType: OptionType;
  expiryTimestamp: number;
  finalIndexPriceUsd: number;
  finalUvbePriceUsd: number;
  intrinsicValueUsd: number;
  payoutAmountUvbe: number;
  refundCollateralUvbe: number;
  feesUvbe: number;
  isClaimed: boolean;
  txHash?: `0x${string}`;
}
