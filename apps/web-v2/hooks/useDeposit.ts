'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { createPublicClient, http, maxUint256 } from 'viem';
import { CONTROLLER_ABI, ERC20_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';
import { useSmartAccount } from './useSmartAccount';
import { getChainTokens, getDefaultChainId, getRpcUrl } from '../constants';
import {
  parseUnits,
  formatUnits,
  formatUSD,
  calculateSlippageMinShares,
  formatShares,
} from '../lib/math';
import { invalidateProtocolQueries } from '../lib/utils/cacheInvalidation';
import { decodeTransactionError } from '../lib/utils/errorDecoder';
import { DepositQuoteData, FormattedDepositQuote } from '../types';
import { base, baseSepolia } from 'viem/chains';

export type DepositStepState =
  | 'idle'
  | 'preparing'
  | 'awaiting_approval_wallet'
  | 'approval_pending'
  | 'approval_confirmed'
  | 'awaiting_deposit_wallet'
  | 'deposit_pending'
  | 'confirmed'
  | 'failed';

export type DepositDestination = 'eoa' | 'smart_account';

export function useDeposit(selectedTokenAddressInput?: `0x${string}`, decimals: number = 6) {
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const tokens = getChainTokens(chain?.id);
  const selectedTokenAddress = selectedTokenAddressInput || tokens.USDC;
  const wagmiPublicClient = usePublicClient({ chainId });

  const fallbackClient = useMemo(() => {
    const rpc = getRpcUrl(chainId);
    return createPublicClient({
      chain: chainId === base.id ? base : baseSepolia,
      transport: http(rpc),
    });
  }, [chainId]);

  const publicClient = wagmiPublicClient || fallbackClient;
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { token, controller } = useProtocolDirectory();
  const { smartAccountAddress, isGaslessSupported } = useSmartAccount();

  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5% default
  const [destination, setDestination] = useState<DepositDestination>('eoa');
  const [stepState, setStepState] = useState<DepositStepState>('idle');
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(null);
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | null>(null);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Read deterministic Smart Account UVBE balance for destination status display
  const { data: smartAccountBalanceData, refetch: refetchSmartAccountBalance } = useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: smartAccountAddress ? [smartAccountAddress] : undefined,
    query: {
      enabled: !!smartAccountAddress && !!token,
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });
  const smartAccountBalance = (smartAccountBalanceData as bigint) || 0n;

  const recipientAddress = destination === 'smart_account' ? smartAccountAddress : userAddress;
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
      staleTime: 10_000,
      gcTime: 60_000,
    },
  });

  const allowance = (allowanceRaw as bigint) || 0n;
  const isApproved = amountRaw > 0n && allowance >= amountRaw;

  // Fetch on-chain Quote directly from Controller contract for the resolved recipient
  const {
    data: quoteResult,
    isLoading: isQuoteLoading,
    isError: isQuoteError,
    error: quoteFetchError,
    refetch: refetchQuote,
  } = useReadContract({
    address: targetController,
    abi: CONTROLLER_ABI,
    functionName: 'getDepositQuote',
    args:
      userAddress && recipientAddress && targetController && amountRaw > 0n
        ? [selectedTokenAddress, amountRaw, 0n, recipientAddress]
        : undefined,
    query: {
      enabled:
        !!userAddress &&
        !!recipientAddress &&
        !!targetController &&
        amountRaw > 0n &&
        isCorrectNetwork,
      staleTime: 10_000,
      gcTime: 60_000,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawQuote = quoteResult as any;
  let formattedQuote: FormattedDepositQuote | null = null;

  if (rawQuote) {
    const isArray = Array.isArray(rawQuote);
    const depositAmountRaw = isArray
      ? (rawQuote[3] as bigint)
      : (rawQuote as DepositQuoteData).depositAmount;
    const protocolFeeRaw = isArray
      ? (rawQuote[7] as bigint)
      : (rawQuote as DepositQuoteData).protocolFee;
    const netDepositRaw = isArray
      ? (rawQuote[8] as bigint)
      : (rawQuote as DepositQuoteData).netDeposit;
    const sharesPreviewRaw = isArray
      ? (rawQuote[6] as bigint)
      : (rawQuote as DepositQuoteData).sharesPreview;

    if (sharesPreviewRaw !== undefined && sharesPreviewRaw > 0n) {
      const sharesToMintFormatted = formatShares(sharesPreviewRaw);

      formattedQuote = {
        grossDepositUSD: formatUSD(Number(formatUnits(depositAmountRaw, decimals))),
        protocolFeeUSD: formatUSD(Number(formatUnits(protocolFeeRaw, decimals))),
        netDepositUSD: formatUSD(Number(formatUnits(netDepositRaw, decimals))),
        sharesToMintFormatted,
        protocolFeeFormatted: formatUnits(protocolFeeRaw, decimals),
        netDepositFormatted: formatUnits(netDepositRaw, decimals),
        rawQuote: isArray
          ? {
              assetId: rawQuote[0] as `0x${string}`,
              asset: rawQuote[1] as `0x${string}`,
              receiver: rawQuote[2] as `0x${string}`,
              depositAmount: depositAmountRaw,
              rawPrice: rawQuote[4] as bigint,
              normalizedPrice: rawQuote[5] as bigint,
              sharesPreview: sharesPreviewRaw,
              protocolFee: protocolFeeRaw,
              netDeposit: netDepositRaw,
              timestamp: rawQuote[9] as bigint,
            }
          : (rawQuote as DepositQuoteData),
      };
    }
  }

  const resetState = () => {
    setStepState('idle');
    setTxError(null);
    setApprovalTxHash(null);
    setDepositTxHash(null);
    setLastTxHash(null);
  };

  /**
   * Single-click Deposit Execution Workflow.
   * If allowance < amount, automatically executes Approval (infinite) -> Deposit in one seamless flow.
   * Once approved, all subsequent deposits are 100% single-click.
   */
  const executeDeposit = async () => {
    if (!userAddress) {
      setTxError('Please connect your wallet');
      setStepState('failed');
      return;
    }
    if (!isCorrectNetwork) {
      setTxError('Please switch to Base Sepolia or Base Mainnet');
      setStepState('failed');
      return;
    }
    if (!targetController) {
      setTxError('Protocol Controller unavailable');
      setStepState('failed');
      return;
    }
    if (amountRaw <= 0n) {
      setTxError('Enter a valid deposit amount');
      setStepState('failed');
      return;
    }
    if (destination === 'smart_account' && !smartAccountAddress) {
      setTxError('Smart Account is not available. Please ensure your wallet is connected.');
      setStepState('failed');
      return;
    }

    const targetRecipient =
      destination === 'smart_account' ? (smartAccountAddress as `0x${string}`) : userAddress;

    setTxError(null);
    setApprovalTxHash(null);
    setDepositTxHash(null);
    setLastTxHash(null);
    setStepState('preparing');

    try {
      // 1. Verify user USDC balance
      let freshUsdcBal = 0n;
      if (publicClient) {
        try {
          freshUsdcBal = (await publicClient.readContract({
            address: selectedTokenAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
          })) as bigint;
        } catch {
          // fallback
        }
      }

      if (freshUsdcBal > 0n && amountRaw > freshUsdcBal) {
        throw new Error('Insufficient USDC balance');
      }

      // 2. Fetch fresh allowance
      let currentAllowance = allowance;
      if (publicClient) {
        try {
          currentAllowance = (await publicClient.readContract({
            address: selectedTokenAddress,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [userAddress, targetController],
          })) as bigint;
        } catch {
          // fallback
        }
      }

      // 3. Step 1 (if needed): Approve Allowance with standard maxUint256 (once per lifetime)
      if (currentAllowance < amountRaw) {
        setStepState('awaiting_approval_wallet');

        let approveGas: bigint | undefined;
        if (publicClient) {
          try {
            const est = await publicClient.estimateContractGas({
              address: selectedTokenAddress,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [targetController, maxUint256],
              account: userAddress,
            });
            approveGas = (est * 120n) / 100n;
          } catch {}
        }

        const approveHash = await writeContractAsync({
          address: selectedTokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [targetController, maxUint256],
          ...(approveGas ? { gas: approveGas } : {}),
        });

        setApprovalTxHash(approveHash);
        setLastTxHash(approveHash);
        setStepState('approval_pending');

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        setStepState('approval_confirmed');
        await refetchAllowance();
      }

      // 4. Re-fetch fresh quote right before deposit submission using targetRecipient
      setStepState('preparing');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let freshQuoteResult: any = null;
      if (publicClient) {
        try {
          freshQuoteResult = await publicClient.readContract({
            address: targetController,
            abi: CONTROLLER_ABI,
            functionName: 'getDepositQuote',
            args: [selectedTokenAddress, amountRaw, 0n, targetRecipient],
          });
        } catch {}
      }

      const isArrayQuote = Array.isArray(freshQuoteResult);
      const freshSharesPreview = isArrayQuote
        ? (freshQuoteResult[6] as bigint)
        : freshQuoteResult?.sharesPreview;
      const sharesPreviewToUse = freshSharesPreview || formattedQuote?.rawQuote.sharesPreview;

      if (!sharesPreviewToUse || sharesPreviewToUse <= 0n) {
        throw new Error('Unable to fetch fresh deposit quote. Please try again.');
      }

      const minSharesOut = calculateSlippageMinShares(sharesPreviewToUse, slippageBps / 100);

      // 5. Step 2: Execute Deposit & Mint Shares directly to targetRecipient
      setStepState('awaiting_deposit_wallet');

      let depositGas: bigint | undefined;
      if (publicClient) {
        try {
          const est = await publicClient.estimateContractGas({
            address: targetController,
            abi: CONTROLLER_ABI,
            functionName: 'deposit',
            args: [selectedTokenAddress, amountRaw, minSharesOut, targetRecipient],
            account: userAddress,
          });
          depositGas = (est * 120n) / 100n;
        } catch {}
      }

      const depHash = await writeContractAsync({
        address: targetController,
        abi: CONTROLLER_ABI,
        functionName: 'deposit',
        args: [selectedTokenAddress, amountRaw, minSharesOut, targetRecipient],
        ...(depositGas ? { gas: depositGas } : {}),
      });

      setDepositTxHash(depHash);
      setLastTxHash(depHash);
      setStepState('deposit_pending');

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: depHash });
      }

      setStepState('confirmed');

      // Invalidate and refetch all live protocol queries
      await invalidateProtocolQueries(queryClient);
      setTimeout(async () => {
        await invalidateProtocolQueries(queryClient);
      }, 1000);

      setDepositAmountInput('');
      void refetchSmartAccountBalance();
    } catch (err: unknown) {
      console.error('Single-click Deposit workflow failed:', err);
      const decoded = decodeTransactionError(err, 'Deposit failed. Please try again.');
      setTxError(decoded.message);
      if (decoded.txHash) setLastTxHash(decoded.txHash);
      setStepState('failed');
      throw err;
    }
  };

  const getDepositDisabledReason = (): string | null => {
    if (!userAddress) return 'Please connect your wallet';
    if (!isCorrectNetwork) return 'Switch to Base Mainnet or Base Sepolia';
    if (!targetController) return 'Protocol Controller unavailable';
    if (destination === 'smart_account' && !smartAccountAddress) {
      return 'Smart Account is not available';
    }
    if (amountRaw <= 0n) return 'Enter a deposit amount';
    if (slippageBps > 500) return 'Slippage exceeds 5.0% safety limit';
    if (isQuoteLoading) return 'Calculating DEX quote...';
    if (!formattedQuote) return 'Unable to fetch DEX quote from Controller';
    if (stepState !== 'idle' && stepState !== 'failed' && stepState !== 'confirmed') {
      return 'Transaction processing...';
    }
    return null;
  };

  const depositDisabledReason = getDepositDisabledReason();
  const isDepositDisabled = depositDisabledReason !== null;
  const isProcessing = stepState !== 'idle' && stepState !== 'confirmed' && stepState !== 'failed';

  const isApproving = stepState === 'awaiting_approval_wallet' || stepState === 'approval_pending';
  const isDepositing = stepState === 'awaiting_deposit_wallet' || stepState === 'deposit_pending';
  const approve = executeDeposit;

  return {
    depositAmountInput,
    setDepositAmountInput,
    slippageBps,
    setSlippageBps,
    amountRaw,
    allowance,
    isApproved,
    isApproving,
    isDepositing,
    isQuoteLoading,
    isQuoteError,
    quoteFetchError,
    formattedQuote,
    isDepositDisabled,
    depositDisabledReason,
    isCorrectNetwork,
    stepState,
    isProcessing,
    approvalTxHash,
    depositTxHash,
    txError,
    lastTxHash,
    approve,
    resetState,
    executeDeposit,
    refetchAllowance,
    refetchQuote,
    destination,
    setDestination,
    destinationAddress: recipientAddress,
    smartAccountAddress,
    smartAccountBalance,
    isGaslessSupported,
  };
}
