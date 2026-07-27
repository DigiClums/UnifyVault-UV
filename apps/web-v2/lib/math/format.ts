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
