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
