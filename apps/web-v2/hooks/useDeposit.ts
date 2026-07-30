'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTROLLER_ABI, ERC20_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';
import {
  parseUnits,
  formatUnits,
  formatUSD,
  calculateDepositFee,
  calculateNetDeposit,
  calculateSlippageMinShares,
  formatShares,
} from '../lib/math';
import { DepositQuoteData, FormattedDepositQuote } from '../types';

export function useDeposit() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5% default
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isDepositing, setIsDepositing] = useState<boolean>(false);

  const amountRaw = parseUnits(depositAmountInput, 6); // USDC = 6 decimals

  // Fetch allowance
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: FALLBACK_ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, FALLBACK_ADDRESSES.CONTROLLER] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 5_000,
    },
  });

  const allowance = (allowanceRaw as bigint) || 0n;
  const isApproved = amountRaw > 0n && allowance >= amountRaw;

  // Fetch on-chain Quote
  const { data: quoteResult, isLoading: isQuoteLoading } = useReadContract({
    address: FALLBACK_ADDRESSES.CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'getDepositQuote',
    args:
      userAddress && amountRaw > 0n
        ? [FALLBACK_ADDRESSES.USDC, amountRaw, 0n, userAddress]
        : undefined,
    query: {
      enabled: !!userAddress && amountRaw > 0n,
      refetchInterval: 5_000,
    },
  });

  const rawQuote = quoteResult as DepositQuoteData | undefined;

  let formattedQuote: FormattedDepositQuote | null = null;

  if (rawQuote) {
    formattedQuote = {
      grossDepositUSD: formatUSD(Number(formatUnits(rawQuote.depositAmount, 6))),
      protocolFeeUSD: formatUSD(Number(formatUnits(rawQuote.protocolFee, 6))),
      netDepositUSD: formatUSD(Number(formatUnits(rawQuote.netDeposit, 6))),
      sharesToMintFormatted: formatShares(rawQuote.sharesPreview),
      protocolFeeFormatted: formatUnits(rawQuote.protocolFee, 6),
      netDepositFormatted: formatUnits(rawQuote.netDeposit, 6),
      rawQuote,
    };
  } else if (amountRaw > 0n) {
    // Fallback math estimation engine
    const fee = calculateDepositFee(amountRaw, 25n);
    const net = calculateNetDeposit(amountRaw, 25n);
    formattedQuote = {
      grossDepositUSD: formatUSD(Number(formatUnits(amountRaw, 6))),
      protocolFeeUSD: formatUSD(Number(formatUnits(fee, 6))),
      netDepositUSD: formatUSD(Number(formatUnits(net, 6))),
      sharesToMintFormatted: formatShares(net * 10n ** 12n), // 1:1 initial estimate
      protocolFeeFormatted: formatUnits(fee, 6),
      netDepositFormatted: formatUnits(net, 6),
      rawQuote: {
        assetId: '0x' as `0x${string}`,
        asset: FALLBACK_ADDRESSES.USDC,
        receiver: userAddress || '0x',
        depositAmount: amountRaw,
        rawPrice: 100000000n,
        normalizedPrice: 1000000000000000000n,
        sharesPreview: net * 10n ** 12n,
        protocolFee: fee,
        netDeposit: net,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      },
    };
  }

  // Approve action
  const approve = async () => {
    if (!userAddress || amountRaw <= 0n) return;
    setIsApproving(true);
    try {
      const hash = await writeContractAsync({
        address: FALLBACK_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [FALLBACK_ADDRESSES.CONTROLLER, amountRaw],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await refetchAllowance();
    } catch (error) {
      console.error('Approve failed:', error);
      throw error;
    } finally {
      setIsApproving(false);
    }
  };

  // Deposit action
  const executeDeposit = async () => {
    if (!userAddress || amountRaw <= 0n) return;
    setIsDepositing(true);

    try {
      const estimatedShares = formattedQuote?.rawQuote.sharesPreview || amountRaw * 10n ** 12n;
      const minSharesOut = calculateSlippageMinShares(estimatedShares, slippageBps / 100);

      const hash = await writeContractAsync({
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'deposit',
        args: [FALLBACK_ADDRESSES.USDC, amountRaw, minSharesOut, userAddress],
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      if (userAddress) {
        try {
          const key = `unifyvault_invested_assets_${userAddress.toLowerCase()}`;
          const currentInvested = Number(localStorage.getItem(key) || '0');
          const netAdded = Number(formatUnits(formattedQuote?.rawQuote.netDeposit || amountRaw, 6));
          localStorage.setItem(key, String(currentInvested + netAdded));
        } catch {
          // ignore localStorage errors
        }
      }

      setDepositAmountInput('');
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error;
    } finally {
      setIsDepositing(false);
    }
  };

  return {
    depositAmountInput,
    setDepositAmountInput,
    slippageBps,
    setSlippageBps,
    amountRaw,
    isApproved,
    isApproving,
    isDepositing,
    isQuoteLoading,
    formattedQuote,
    approve,
    executeDeposit,
  };
}
