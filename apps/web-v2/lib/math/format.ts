import { formatUnits as viemFormatUnits, parseUnits as viemParseUnits } from 'viem';

export function formatUnits(value: bigint, decimals: number = 18): string {
  if (value === undefined || value === null) return '0';
  return viemFormatUnits(value, decimals);
}

export function parseUnits(value: string, decimals: number = 18): bigint {
  if (!value || isNaN(Number(value))) return 0n;
  try {
    return viemParseUnits(value, decimals);
  } catch {
    return 0n;
  }
}

export function formatUSD(amountUSD: number | string | bigint): string {
  let numericValue = 0;
  if (typeof amountUSD === 'bigint') {
    numericValue = Number(viemFormatUnits(amountUSD, 18));
  } else if (typeof amountUSD === 'string') {
    numericValue = parseFloat(amountUSD) || 0;
  } else {
    numericValue = amountUSD || 0;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function formatShares(shares: bigint | string | number): string {
  let num = 0;
  if (typeof shares === 'bigint') {
    num = Number(viemFormatUnits(shares, 18));
  } else if (typeof shares === 'string') {
    num = parseFloat(shares) || 0;
  } else {
    num = shares || 0;
  }

  if (num === 0) return '0.0000';
  if (num > 0 && num < 0.0001) {
    if (num >= 0.000001) return num.toFixed(6);
    return '< 0.0001';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(num);
}

export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function formatBps(bps: bigint | number): string {
  const num = typeof bps === 'bigint' ? Number(bps) : bps;
  return `${(num / 100).toFixed(2)}%`;
}

/**
 * Formats Net Asset Value (NAV) per share with high decimal precision (6-8 decimals)
 * to ensure micro movements like $1.00002820 or $0.99998214 are clearly visible.
 */
export function formatNAVUSD(amountUSD: number | string | bigint): string {
  let numericValue = 0;
  if (typeof amountUSD === 'bigint') {
    numericValue = Number(viemFormatUnits(amountUSD, 18));
  } else if (typeof amountUSD === 'string') {
    numericValue = parseFloat(amountUSD) || 0;
  } else {
    numericValue = amountUSD || 0;
  }

  if (isNaN(numericValue) || numericValue <= 0) return '$1.00000000';

  if (numericValue >= 100000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(numericValue);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  }).format(numericValue);
}

/**
 * Formats PnL in USD with high precision (4 decimal places) and explicit sign (+/-).
 * e.g. +$0.2421 or -$0.1234 or $0.0000
 */
export function formatPnLUSD(amountUSD: number | string | bigint): string {
  let num = 0;
  if (typeof amountUSD === 'bigint') {
    num = Number(viemFormatUnits(amountUSD, 18));
  } else if (typeof amountUSD === 'string') {
    num = parseFloat(amountUSD) || 0;
  } else {
    num = amountUSD || 0;
  }

  if (isNaN(num)) num = 0;

  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  const absVal = Math.abs(num);

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(absVal);

  return `${sign}${formatted}`;
}

/**
 * Formats PnL Percentage with 4 decimal places and explicit sign (+/-).
 * e.g. +0.4247% or -0.1234% or 0.0000%
 */
export function formatPnLPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
  if (isNaN(num)) return '0.0000%';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(4)}%`;
}

/**
 * Formats USD with custom decimal precision for holding value and TVL.
 */
export function formatHighPrecisionUSD(
  amountUSD: number | string | bigint,
  decimals: number = 4,
): string {
  let numericValue = 0;
  if (typeof amountUSD === 'bigint') {
    numericValue = Number(viemFormatUnits(amountUSD, 18));
  } else if (typeof amountUSD === 'string') {
    numericValue = parseFloat(amountUSD) || 0;
  } else {
    numericValue = amountUSD || 0;
  }

  if (isNaN(numericValue)) numericValue = 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue);
}

/**
 * Formats a crypto token balance for clean, non-colliding presentation in UI cards & tables.
 * Preserves access to full exact numeric precision for tooltips/title attributes.
 *
 * Examples:
 * - "0.001883949349109012 ETH" -> "0.001884 ETH"
 * - "1250.500000 USDC" -> "1,250.50 USDC"
 * - "0.00000000 BTC" -> "0.0000 BTC"
 * - "0.000000123 ETH" -> "< 0.000001 ETH"
 */
export function formatDisplayCryptoBalance(
  balanceStr: string | number | bigint,
  fallbackSymbol: string = '',
  maxDecimals: number = 6,
): string {
  if (balanceStr === undefined || balanceStr === null) {
    return `0.0000 ${fallbackSymbol}`.trim();
  }

  let raw =
    typeof balanceStr === 'bigint' ? viemFormatUnits(balanceStr, 18) : String(balanceStr).trim();
  let symbol = fallbackSymbol;

  // Check if string contains both value and symbol like "0.001883949349109012 ETH"
  const parts = raw.split(/\s+/);
  if (parts.length >= 2) {
    raw = parts[0];
    symbol = parts[1];
  }

  const num = parseFloat(raw);
  if (isNaN(num) || num === 0) {
    const defaultDecimals = symbol === 'USDC' ? 2 : 4;
    return `0.${'0'.repeat(defaultDecimals)}${symbol ? ` ${symbol}` : ''}`;
  }

  // Dust balances below 0.000001
  if (num > 0 && num < 0.000001) {
    return `< 0.000001${symbol ? ` ${symbol}` : ''}`;
  }

  // Stablecoins: 2 decimals with commas
  if (symbol === 'USDC' || symbol === 'USDT' || symbol === 'DAI') {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return `${formatted}${symbol ? ` ${symbol}` : ''}`;
  }

  // Crypto assets (BTC / ETH / WETH / cbBTC):
  // Format with dynamic decimal places (up to maxDecimals)
  const decimals = num >= 1000 ? 2 : num >= 1 ? 4 : maxDecimals;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: num >= 1 ? (num >= 1000 ? 2 : 4) : 4,
    maximumFractionDigits: decimals,
  }).format(num);

  return `${formatted}${symbol ? ` ${symbol}` : ''}`;
}
