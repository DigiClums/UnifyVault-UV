import { parseUnits, formatUnits } from 'viem';
import { getTokenDecimals, getTokenSymbol } from '../explorer/eventRegistry';
import { getDefaultChainId } from '../../constants';
import {
  NATIVE_ETH_ADDRESS,
  isNativeETHAsset,
  validateP2PAsset,
  ValidateAssetResult,
} from './assetValidation';

export { NATIVE_ETH_ADDRESS, isNativeETHAsset };
export const ETH_GAS_RESERVE = parseUnits('0.001', 18); // 0.001 ETH gas reserve for transaction safety

export interface PreflightBalanceParams {
  side: 'BUY' | 'SELL';
  asset: `0x${string}`;
  amountStr: string;
  rawBalance: bigint | null;
  rawAllowance: bigint | null;
  validatedDecimals?: number | null;
  validatedSymbol?: string | null;
  isContractDeployed?: boolean | null;
  contractReadError?: string | null;
  userAddress?: `0x${string}`;
  connectedChainId?: number;
  targetChainId?: number;
  balanceError?: string | null;
  isBalanceLoading?: boolean;
}

export interface PreflightBalanceResult {
  decimals: number;
  symbol: string;
  isNative: boolean;
  requestedAmountBigInt: bigint;
  availableBalanceBigInt: bigint;
  remainingBalanceBigInt: bigint;
  isInsufficientBalance: boolean;
  isInsufficientAllowance: boolean;
  isWrongNetwork: boolean;
  isAssetSupported: boolean;
  isContractDeployed: boolean;
  canSubmitSellOrder: boolean;
  errorMessage: string | null;
  warningMessage: string | null;
}

/**
 * Computes sell-order pre-flight asset, network, contract, balance, and allowance checks.
 * Uses exact BigInt raw units comparison to prevent floating-point inaccuracy.
 */
export function computeSellOrderPreflight(params: PreflightBalanceParams): PreflightBalanceResult {
  const {
    side,
    asset,
    amountStr,
    rawBalance,
    rawAllowance,
    validatedDecimals,
    validatedSymbol,
    isContractDeployed = true,
    contractReadError,
    userAddress,
    connectedChainId,
    targetChainId = getDefaultChainId(),
    balanceError,
    isBalanceLoading,
  } = params;

  // Active chain validation: chainId = connected wallet chain ID || getDefaultChainId()
  const activeChainId = connectedChainId || targetChainId;
  const isWrongNetwork = !!(userAddress && connectedChainId && connectedChainId !== targetChainId);

  // Validate supported asset on active chain
  const assetVal: ValidateAssetResult = validateP2PAsset(asset, activeChainId);
  const isNative = assetVal.isNative;
  const isAssetSupported = assetVal.isValid;

  // Determine decimals & symbol
  const decimals = isNative
    ? 18
    : validatedDecimals !== null && validatedDecimals !== undefined
    ? validatedDecimals
    : getTokenDecimals(asset);

  const symbol =
    validatedSymbol || assetVal.assetInfo?.symbol || getTokenSymbol(asset);

  // Parse requested amount safely into raw BigInt units
  let requestedAmountBigInt = 0n;
  if (amountStr && amountStr.trim() !== '') {
    try {
      requestedAmountBigInt = parseUnits(amountStr.trim(), decimals);
    } catch {
      requestedAmountBigInt = 0n;
    }
  }

  // Calculate available balance considering gas reserve for native ETH
  let availableBalanceBigInt = 0n;
  if (rawBalance !== null && rawBalance >= 0n) {
    if (isNative) {
      availableBalanceBigInt = rawBalance > ETH_GAS_RESERVE ? rawBalance - ETH_GAS_RESERVE : 0n;
    } else {
      availableBalanceBigInt = rawBalance;
    }
  }

  // Calculate remaining balance
  let remainingBalanceBigInt = 0n;
  if (availableBalanceBigInt >= requestedAmountBigInt) {
    remainingBalanceBigInt = availableBalanceBigInt - requestedAmountBigInt;
  } else {
    remainingBalanceBigInt = 0n;
  }

  // Conditions for SELL orders
  let isInsufficientBalance = false;
  let isInsufficientAllowance = false;
  let errorMessage: string | null = null;
  let warningMessage: string | null = null;

  if (side === 'SELL') {
    if (!userAddress) {
      errorMessage = 'Please connect your wallet first.';
    } else if (isWrongNetwork) {
      errorMessage = 'Wrong network. Please switch to the supported network.';
    } else if (!isAssetSupported) {
      errorMessage = assetVal.errorMessage || 'Selected asset is not supported on the active network.';
    } else if (!isNative && isContractDeployed === false) {
      errorMessage = 'Selected asset contract is not deployed on the active network.';
    } else if (!isNative && contractReadError) {
      errorMessage = contractReadError;
    } else if (balanceError) {
      errorMessage = balanceError.includes('Failed to read')
        ? balanceError
        : `Balance read failure: ${balanceError}`;
    } else if (isBalanceLoading) {
      // Loading state — pending calculation
    } else if (rawBalance !== null) {
      if (requestedAmountBigInt > availableBalanceBigInt) {
        isInsufficientBalance = true;
        const availableFormatted = formatUnits(availableBalanceBigInt, decimals);
        const reqFormatted = amountStr || '0';
        errorMessage = `Insufficient balance: Available balance is ${availableFormatted} ${symbol}, but requested ${reqFormatted} ${symbol}.`;
      }

      // Check allowance warning for non-native ERC20 tokens
      if (!isNative && rawAllowance !== null && requestedAmountBigInt > 0n) {
        if (rawAllowance < requestedAmountBigInt) {
          isInsufficientAllowance = true;
          warningMessage = 'Token approval will be required before this order can be funded.';
        }
      }
    }
  }

  const contractValid = isNative || (isContractDeployed !== false && !contractReadError && validatedDecimals !== null);

  const canSubmitSellOrder =
    side === 'BUY'
      ? !!userAddress && !isWrongNetwork
      : !!userAddress &&
        !isWrongNetwork &&
        isAssetSupported &&
        contractValid &&
        !isBalanceLoading &&
        !balanceError &&
        rawBalance !== null &&
        !isInsufficientBalance &&
        requestedAmountBigInt > 0n;

  return {
    decimals,
    symbol,
    isNative,
    requestedAmountBigInt,
    availableBalanceBigInt,
    remainingBalanceBigInt,
    isInsufficientBalance,
    isInsufficientAllowance,
    isWrongNetwork,
    isAssetSupported,
    isContractDeployed: isNative ? true : isContractDeployed !== false,
    canSubmitSellOrder,
    errorMessage,
    warningMessage,
  };
}
