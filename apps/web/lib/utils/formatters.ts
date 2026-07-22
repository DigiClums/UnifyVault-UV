import { formatUnits, parseUnits } from 'viem';
import { SUPPORTED_CHAINS } from '../config/chains';

export const MAX_UINT256 =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

/**
 * Shortens a standard hex address to 0x1234...5678 format
 */
export const shortenAddress = (address?: string, chars = 4): string => {
  if (!address) return '';
  if (!address.startsWith('0x') || address.length < chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};

/**
 * Formats a bigint value to a human-readable decimal string with thousands separators (commas)
 */
export const formatBigInt = (value: bigint, decimals = 18, precision = 4): string => {
  const formatted = formatUnits(value, decimals);
  const parts = formatted.split('.');
  const integerPart = parts[0];

  // Safely add commas to the integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (parts.length === 1) return formattedInteger;

  const decimalPart = parts[1].substring(0, precision);
  if (!decimalPart || /^0+$/.test(decimalPart)) return formattedInteger;

  return `${formattedInteger}.${decimalPart}`;
};

/**
 * Safely parses a decimal string to a bigint representation
 */
export const parseAmount = (amount?: string, decimals = 18): bigint => {
  if (!amount || isNaN(Number(amount))) return 0n;
  try {
    return parseUnits(amount, decimals);
  } catch {
    return 0n;
  }
};

/**
 * Formats a value (bigint, number, or string) to USD currency representation
 */
export const formatUSD = (value: number | string | bigint, decimals = 18): string => {
  let numVal: number;
  if (typeof value === 'bigint') {
    numVal = Number(formatUnits(value, decimals));
  } else {
    numVal = Number(value);
  }
  if (isNaN(numVal)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numVal);
};

/**
 * Formats a value to percent representation (e.g. 12.45 for 12.45%)
 */
export const formatPercent = (value: number | bigint | string, decimals = 2): string => {
  const numVal = typeof value === 'bigint' ? Number(value) : Number(value);
  if (isNaN(numVal)) return '0.00%';
  return `${numVal.toFixed(decimals)}%`;
};

/**
 * Formats a basis points (BPS) value to "X BPS"
 */
export const formatBps = (value: number | bigint | string): string => {
  const numVal = typeof value === 'bigint' ? Number(value) : Number(value);
  if (isNaN(numVal)) return '0 BPS';
  return `${numVal} BPS`;
};

/**
 * Formats max deposit limit with handling for Unlimited (MAX_UINT256)
 */
export const formatLimit = (limit?: bigint, decimals = 18, precision = 2): string => {
  if (limit === undefined) return '0';
  if (limit >= MAX_UINT256 - 100n) {
    return 'Unlimited';
  }
  return `${formatBigInt(limit, decimals, precision)} Shares`;
};

/**
 * Generates BaseScan block explorer links
 */
export const getExplorerLink = (
  hashOrAddress: string,
  type: 'tx' | 'address',
  chainId = 84532,
): string => {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  const baseUrl = chain?.blockExplorers?.default?.url || 'https://sepolia.basescan.org';
  return `${baseUrl}/${type}/${hashOrAddress}`;
};

export const parseWalletError = (error: unknown): string => {
  if (!error) return '';
  const err = error as { code?: number; message?: string; shortMessage?: string };

  const message = err.message || '';
  const code = err.code;

  // 1. User rejects connection / transaction / chain switch
  if (
    code === 4001 ||
    message.includes('User rejected') ||
    message.includes('User denied') ||
    message.includes('rejected')
  ) {
    if (message.toLowerCase().includes('switch') || message.toLowerCase().includes('chain')) {
      return 'Chain switch request was rejected by the user.';
    }
    return 'Connection request was rejected by the user.';
  }

  // 2. Chain switch / not added
  if (code === 4902 || message.includes('Unrecognized chain ID')) {
    return 'The requested network is not supported or not added to your wallet.';
  }

  // 3. Wallet locked / unauthorized
  if (
    code === -32603 ||
    code === -32000 ||
    message.toLowerCase().includes('locked') ||
    message.toLowerCase().includes('unlock')
  ) {
    return 'Your wallet appears to be locked. Please unlock it and try again.';
  }

  // 4. Wallet unavailable
  if (
    message.includes('Connector not found') ||
    message.includes('Provider not found') ||
    message.includes('No provider')
  ) {
    return 'No compatible wallet extension was detected. Please install a supported Web3 wallet.';
  }

  // 5. RPC unavailable
  if (
    message.includes('fetch') ||
    message.includes('RPC error') ||
    message.includes('network error') ||
    message.includes('failed to fetch')
  ) {
    return 'RPC server is currently unreachable. Please check your network connection and try again.';
  }

  return 'An unexpected wallet error occurred. Please try again.';
};
