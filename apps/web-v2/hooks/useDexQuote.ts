'use client';

import { useAccount, useReadContract } from 'wagmi';
import { CONTROLLER_ABI } from '../lib/contracts';
import { getChainTokens } from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import {
  parseUnits,
  formatUnits,
  formatUSD,
  formatShares,
  calculateSlippageMinShares,
  calculateSlippageMinAssets,
} from '../lib/math';
import { DepositQuoteData, FormattedDepositQuote } from '../types';

export interface UseDexQuoteParams {
  mode: 'deposit' | 'redeem';
  amountInput: string;
  decimals?: number;
  slippageBps?: number;
}

export interface UseDexQuoteResult {
  amountRaw: bigint;
  sharesPreviewRaw: bigint;
  netAmountRaw: bigint;
  feeAmountRaw: bigint;
  minimumReceivedRaw: bigint;
  formattedGrossUSD: string;
  formattedFeeUSD: string;
  formattedNetUSD: string;
  formattedShares: string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  rawDepositQuote?: DepositQuoteData;
}

export function useDexQuote({
  mode,
  amountInput,
  decimals = 6,
  slippageBps = 50,
}: UseDexQuoteParams): UseDexQuoteResult {
  const { address: userAddress, chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const { controller } = useProtocolDirectory();

  const amountRaw =
    mode === 'deposit' ? parseUnits(amountInput, decimals) : parseUnits(amountInput, 18);

  // Deposit quote query
  const {
    data: depositQuoteData,
    isLoading: isDepositLoading,
    isError: isDepositError,
    error: depositError,
  } = useReadContract({
    address: controller,
    abi: CONTROLLER_ABI,
    functionName: 'getDepositQuote',
    args:
      mode === 'deposit' && userAddress && controller && amountRaw > 0n
        ? [tokens.USDC, amountRaw, 0n, userAddress]
        : undefined,
    query: {
      enabled: mode === 'deposit' && !!userAddress && !!controller && amountRaw > 0n,
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  // Redeem quote query
  const {
    data: redeemAssetsRaw,
    isLoading: isRedeemLoading,
    isError: isRedeemError,
    error: redeemError,
  } = useReadContract({
    address: controller,
    abi: CONTROLLER_ABI,
    functionName: 'previewRedeem',
    args: mode === 'redeem' && controller && amountRaw > 0n ? [tokens.USDC, amountRaw] : undefined,
    query: {
      enabled: mode === 'redeem' && !!controller && amountRaw > 0n,
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const rawDepositQuote = depositQuoteData as any;
  const rawRedeemAssets = (redeemAssetsRaw as bigint) || 0n;

  if (mode === 'deposit') {
    const isArray = Array.isArray(rawDepositQuote);
    const depositAmountRaw = isArray
      ? (rawDepositQuote[3] as bigint)
      : rawDepositQuote?.depositAmount || amountRaw;
    const feeAmountRaw = isArray
      ? (rawDepositQuote[7] as bigint)
      : rawDepositQuote?.protocolFee || 0n;
    const netAmountRaw = isArray
      ? (rawDepositQuote[8] as bigint)
      : rawDepositQuote?.netDeposit || 0n;
    const sharesPreviewRaw = isArray
      ? (rawDepositQuote[6] as bigint)
      : rawDepositQuote?.sharesPreview || 0n;
    const minimumReceivedRaw = calculateSlippageMinShares(sharesPreviewRaw, slippageBps / 100);

    return {
      amountRaw: depositAmountRaw,
      sharesPreviewRaw,
      netAmountRaw,
      feeAmountRaw,
      minimumReceivedRaw,
      formattedGrossUSD: formatUSD(Number(formatUnits(depositAmountRaw, decimals))),
      formattedFeeUSD: formatUSD(Number(formatUnits(feeAmountRaw, decimals))),
      formattedNetUSD: formatUSD(Number(formatUnits(netAmountRaw, decimals))),
      formattedShares: formatShares(sharesPreviewRaw),
      isLoading: isDepositLoading,
      isError: isDepositError,
      error: depositError as Error | null,
      rawDepositQuote: isArray
        ? {
            assetId: rawDepositQuote[0],
            asset: rawDepositQuote[1],
            receiver: rawDepositQuote[2],
            depositAmount: depositAmountRaw,
            rawPrice: rawDepositQuote[4],
            normalizedPrice: rawDepositQuote[5],
            sharesPreview: sharesPreviewRaw,
            protocolFee: feeAmountRaw,
            netDeposit: netAmountRaw,
            timestamp: rawDepositQuote[9],
          }
        : rawDepositQuote,
    };
  } else {
    const netAmountRaw = rawRedeemAssets;
    const minimumReceivedRaw = calculateSlippageMinAssets(netAmountRaw, slippageBps / 100);

    return {
      amountRaw,
      sharesPreviewRaw: amountRaw,
      netAmountRaw,
      feeAmountRaw: 0n,
      minimumReceivedRaw,
      formattedGrossUSD: formatUSD(Number(formatUnits(amountRaw, 18))),
      formattedFeeUSD: '$0.00',
      formattedNetUSD: formatUSD(Number(formatUnits(netAmountRaw, decimals))),
      formattedShares: formatShares(amountRaw),
      isLoading: isRedeemLoading,
      isError: isRedeemError,
      error: redeemError as Error | null,
    };
  }
}
