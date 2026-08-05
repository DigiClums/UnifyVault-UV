'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTROLLER_ABI, ERC20_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';
import { getChainTokens } from '../constants';
import {
  parseUnits,
  formatUnits,
  formatUSD,
  calculateSlippageMinShares,
  formatShares,
} from '../lib/math';
import { DepositQuoteData, FormattedDepositQuote } from '../types';
import { base, baseSepolia } from 'viem/chains';

export function useDeposit(selectedTokenAddressInput?: `0x${string}`, decimals: number = 6) {
  const { address: userAddress, chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const selectedTokenAddress = selectedTokenAddressInput || tokens.USDC;
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { controller } = useProtocolDirectory();

  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5% default
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);

  const amountRaw = parseUnits(depositAmountInput, decimals);
  const isCorrectNetwork = chain?.id === base.id || chain?.id === baseSepolia.id;

  const targetController = controller;

  // Fetch allowance
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: selectedTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && targetController ? [userAddress, targetController] : undefined,
    query: {
      enabled: !!userAddress && !!targetController && isCorrectNetwork,
      refetchInterval: 5_000,
    },
  });

  const allowance = (allowanceRaw as bigint) || 0n;
  const isApproved = amountRaw > 0n && allowance >= amountRaw;

  // Fetch on-chain Quote directly from Controller contract
  const {
    data: quoteResult,
    isLoading: isQuoteLoading,
    isError: isQuoteError,
    error: quoteFetchError,
  } = useReadContract({
    address: targetController,
    abi: CONTROLLER_ABI,
    functionName: 'getDepositQuote',
    args:
      userAddress && targetController && amountRaw > 0n
        ? [selectedTokenAddress, amountRaw, 0n, userAddress]
        : undefined,
    query: {
      enabled: !!userAddress && !!targetController && amountRaw > 0n && isCorrectNetwork,
      refetchInterval: 5_000,
    },
  });

  const rawQuote = quoteResult as DepositQuoteData | undefined;

  let formattedQuote: FormattedDepositQuote | null = null;

  // Production requirement: NEVER estimate financial values locally using mock math fallbacks.
  if (rawQuote && rawQuote.sharesPreview > 0n) {
    formattedQuote = {
      grossDepositUSD: formatUSD(Number(formatUnits(rawQuote.depositAmount, decimals))),
      protocolFeeUSD: formatUSD(Number(formatUnits(rawQuote.protocolFee, decimals))),
      netDepositUSD: formatUSD(Number(formatUnits(rawQuote.netDeposit, decimals))),
      sharesToMintFormatted: formatShares(rawQuote.sharesPreview),
      protocolFeeFormatted: formatUnits(rawQuote.protocolFee, decimals),
      netDepositFormatted: formatUnits(rawQuote.netDeposit, decimals),
      rawQuote,
    };
  }

  // Approve action
  const approve = async () => {
    if (!userAddress || amountRaw <= 0n || !targetController) {
      throw new Error('Missing target contract or invalid deposit amount');
    }
    if (!isCorrectNetwork) {
      throw new Error(
        'Wrong network: Please switch to a supported network (Base Mainnet or Base Sepolia)',
      );
    }
    setIsApproving(true);
    setTxError(null);
    try {
      let gasEstimate: bigint | undefined = undefined;
      if (publicClient) {
        try {
          const est = await publicClient.estimateContractGas({
            address: selectedTokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [targetController, amountRaw],
            account: userAddress,
          });
          gasEstimate = (est * 120n) / 100n; // 20% gas buffer
        } catch {
          // Fallback to wallet estimation if simulation fails
        }
      }

      const hash = await writeContractAsync({
        address: selectedTokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [targetController, amountRaw],
        ...(gasEstimate ? { gas: gasEstimate } : {}),
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await refetchAllowance();
      await queryClient.invalidateQueries();
    } catch (error: any) {
      console.error('Approve transaction failed:', error);
      const msg = error?.shortMessage || error?.message || 'Approval failed';
      setTxError(msg);
      throw error;
    } finally {
      setIsApproving(false);
    }
  };

  // Deposit action
  const executeDeposit = async () => {
    if (!userAddress || amountRaw <= 0n || !targetController || !formattedQuote) {
      throw new Error('Cannot execute deposit: On-chain quote is missing or invalid.');
    }
    if (!isCorrectNetwork) {
      throw new Error(
        'Wrong network: Please switch to a supported network (Base Mainnet or Base Sepolia)',
      );
    }
    setIsDepositing(true);
    setTxError(null);

    try {
      const estimatedShares = formattedQuote.rawQuote.sharesPreview;
      const minSharesOut = calculateSlippageMinShares(estimatedShares, slippageBps / 100);

      let gasEstimate: bigint | undefined = undefined;
      if (publicClient) {
        try {
          const est = await publicClient.estimateContractGas({
            address: targetController,
            abi: CONTROLLER_ABI,
            functionName: 'deposit',
            args: [selectedTokenAddress, amountRaw, minSharesOut, userAddress],
            account: userAddress,
          });
          gasEstimate = (est * 120n) / 100n; // 20% gas limit buffer for production safety
        } catch {
          // fallback
        }
      }

      const hash = await writeContractAsync({
        address: targetController,
        abi: CONTROLLER_ABI,
        functionName: 'deposit',
        args: [selectedTokenAddress, amountRaw, minSharesOut, userAddress],
        ...(gasEstimate ? { gas: gasEstimate } : {}),
      });

      setLastTxHash(hash);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      await queryClient.invalidateQueries();
      setDepositAmountInput('');
    } catch (error: any) {
      console.error('Deposit transaction failed:', error);
      const msg = error?.shortMessage || error?.message || 'Deposit failed';
      setTxError(msg);
      throw error;
    } finally {
      setIsDepositing(false);
    }
  };

  const isDepositDisabled =
    !userAddress ||
    amountRaw <= 0n ||
    !isApproved ||
    isQuoteLoading ||
    !formattedQuote ||
    isDepositing ||
    !isCorrectNetwork ||
    !targetController;

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
    isQuoteError,
    quoteFetchError,
    formattedQuote,
    isDepositDisabled,
    isCorrectNetwork,
    txError,
    lastTxHash,
    approve,
    executeDeposit,
  };
}
