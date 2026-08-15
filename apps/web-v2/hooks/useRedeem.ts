'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTROLLER_ABI, ERC20_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';
import { useUnifiedProtocolData } from './useUnifiedProtocolData';
import { useSmartAccount } from './useSmartAccount';
import { getChainTokens, getDefaultChainId } from '../constants';
import { parseUnits, formatUnits, formatUSD, calculateSlippageMinAssets } from '../lib/math';
import { invalidateProtocolQueries } from '../lib/utils/cacheInvalidation';
import { decodeTransactionError } from '../lib/utils/errorDecoder';
import { getTransactionNonce } from '../lib/utils/getTransactionNonce';
import { base, baseSepolia } from 'viem/chains';

export type RedeemStepState =
  'idle' | 'preparing' | 'awaiting_redeem_wallet' | 'redeem_pending' | 'confirmed' | 'failed';

export type RedeemSource = 'eoa' | 'gasless';

export function useRedeem(targetAssetAddressInput?: `0x${string}`, targetDecimals: number = 6) {
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const tokens = getChainTokens(chain?.id);
  const targetAssetAddress = targetAssetAddressInput || tokens.USDC;
  const publicClient = usePublicClient({ chainId });
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { controller, token } = useProtocolDirectory();
  const protocolData = useUnifiedProtocolData();
  const { smartAccountAddress, isGaslessSupported, redeemGasless } = useSmartAccount();

  const [sharesInput, setSharesInput] = useState<string>('');
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5% default
  const [stepState, setStepState] = useState<RedeemStepState>('idle');
  const [txError, setTxError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  const [source, setSource] = useState<RedeemSource>('eoa');

  // Smart Account UVBE balance (gasless redeem source), NOT the aggregated portfolio balance.
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

  const sharesRaw = parseUnits(sharesInput, 18);
  const isCorrectNetwork = chain?.id === base.id || chain?.id === baseSepolia.id;
  const targetController = controller;

  const {
    data: previewAssetsRaw,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    error: previewError,
  } = useReadContract({
    address: targetController,
    abi: CONTROLLER_ABI,
    functionName: 'previewRedeem',
    args: sharesRaw > 0n && targetController ? [targetAssetAddress, sharesRaw] : undefined,
    query: {
      enabled: sharesRaw > 0n && !!targetController && isCorrectNetwork,
      staleTime: 10_000,
      gcTime: 60_000,
    },
  });

  const { data: redeemQuoteRaw } = useReadContract({
    address: targetController,
    abi: CONTROLLER_ABI,
    functionName: 'getRedeemQuote',
    args:
      sharesRaw > 0n && targetController && userAddress
        ? [targetAssetAddress, sharesRaw, userAddress]
        : undefined,
    query: {
      enabled: sharesRaw > 0n && !!targetController && isCorrectNetwork && !!userAddress,
      staleTime: 10_000,
      gcTime: 60_000,
    },
  });

  const { data: redeemFeeBpsRaw } = useReadContract({
    address: targetController,
    abi: CONTROLLER_ABI,
    functionName: 'getRedeemFeeBps',
    query: {
      enabled: !!targetController && isCorrectNetwork,
      staleTime: 60_000,
      gcTime: 300_000,
    },
  });

  const redeemFeeBps = (redeemFeeBpsRaw as bigint) || 200n;

  // On-chain preview result
  const rawOnChainNetAssets = (previewAssetsRaw as bigint) || 0n;

  // Real-time empirical fallbacks from live protocol NAV if on-chain preview returns 0
  const sharePriceNum = protocolData.sharePriceNumber ?? 1.0;
  const sharesNum = Number(formatUnits(sharesRaw, 18));
  const fallbackGrossUSDVal = sharesNum * sharePriceNum;
  const fallbackFeeUSDVal = fallbackGrossUSDVal * (Number(redeemFeeBps) / 10000);
  const fallbackNetUSDVal = Math.max(0, fallbackGrossUSDVal - fallbackFeeUSDVal);
  const fallbackNetAssetsRaw = parseUnits(
    fallbackNetUSDVal.toFixed(targetDecimals),
    targetDecimals,
  );

  const netAssetsRaw = rawOnChainNetAssets > 0n ? rawOnChainNetAssets : fallbackNetAssetsRaw;

  const denominator = 10000n - redeemFeeBps;
  const grossAssetsEstimated =
    rawOnChainNetAssets > 0n && denominator > 0n
      ? (rawOnChainNetAssets * 10000n) / denominator
      : parseUnits(fallbackGrossUSDVal.toFixed(targetDecimals), targetDecimals);

  const grossUSDVal =
    rawOnChainNetAssets > 0n
      ? Number(formatUnits(grossAssetsEstimated, targetDecimals))
      : fallbackGrossUSDVal;

  const netUSDVal =
    rawOnChainNetAssets > 0n
      ? Number(formatUnits(netAssetsRaw, targetDecimals))
      : fallbackNetUSDVal;

  const feeUSDVal = grossUSDVal > netUSDVal ? grossUSDVal - netUSDVal : fallbackFeeUSDVal;

  const grossUSD = formatUSD(grossUSDVal);
  const feeUSD = formatUSD(feeUSDVal);
  const netUSD = formatUSD(netUSDVal);

  const resetState = () => {
    setStepState('idle');
    setTxError(null);
    setLastTxHash(null);
  };

  /**
   * Single-click Redeem Execution Workflow.
   */
  const executeRedeem = async () => {
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
    if (sharesRaw <= 0n) {
      setTxError('Enter share amount to redeem');
      setStepState('failed');
      return;
    }
    if (source === 'gasless' && !smartAccountAddress) {
      setTxError('Smart Account is not available. Please ensure your wallet is connected.');
      setStepState('failed');
      return;
    }
    if (source === 'gasless' && !isGaslessSupported) {
      setTxError('Gasless sponsorship is only available on Base Sepolia.');
      setStepState('failed');
      return;
    }

    setTxError(null);
    setLastTxHash(null);
    setStepState('preparing');

    try {
      // 1. Verify the selected source's share balance (address-specific, NOT aggregated)
      const activeAddress = source === 'gasless' ? smartAccountAddress : userAddress;
      let freshShareBal = 0n;
      let balanceReadOk = false;
      if (publicClient && token && activeAddress) {
        try {
          freshShareBal = (await publicClient.readContract({
            address: token,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [activeAddress],
          })) as bigint;
          balanceReadOk = true;
        } catch {}
      }

      if (balanceReadOk && sharesRaw > freshShareBal) {
        throw new Error(
          freshShareBal === 0n
            ? source === 'gasless'
              ? 'Smart Account has no UVBE balance to redeem.'
              : 'Connected Wallet has no UVBE balance to redeem.'
            : 'Insufficient UVBE balance',
        );
      }

      // 2. Fetch fresh previewRedeem / quote directly right before redeem
      let freshNetAssets = 0n;
      if (publicClient) {
        try {
          freshNetAssets = (await publicClient.readContract({
            address: targetController,
            abi: CONTROLLER_ABI,
            functionName: 'previewRedeem',
            args: [targetAssetAddress, sharesRaw],
          })) as bigint;
        } catch {}
      }

      if (freshNetAssets === 0n && netAssetsRaw > 0n) {
        freshNetAssets = netAssetsRaw;
      }

      if (freshNetAssets <= 0n) {
        throw new Error('Unable to calculate valid redemption payout. Try refreshing.');
      }

      const minAssetsOut = calculateSlippageMinAssets(freshNetAssets, slippageBps / 100);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      if (source === 'gasless' && smartAccountAddress) {
        // 3. Gasless Smart Account UserOperation (receiver defaults to the Smart Account holder)
        const result = await redeemGasless({
          shares: sharesRaw,
          minAssetsOut,
          receiver: smartAccountAddress,
          deadline,
          usdcAddress: targetAssetAddress,
          controllerAddress: targetController,
        });
        if (result?.txHash) setLastTxHash(result.txHash);
        setStepState('confirmed');
      } else {
        // 3. Prompt Wallet for Redemption (connected EOA)
        setStepState('awaiting_redeem_wallet');

        let redeemGas: bigint | undefined;
        if (publicClient) {
          try {
            const est = await publicClient.estimateContractGas({
              address: targetController,
              abi: CONTROLLER_ABI,
              functionName: 'redeem',
              args: [targetAssetAddress, sharesRaw, minAssetsOut, userAddress, deadline],
              account: userAddress,
            });
            redeemGas = (est * 120n) / 100n;
          } catch {}
        }

        const redeemNonce = publicClient
          ? await getTransactionNonce(publicClient, userAddress)
          : undefined;

        if (typeof redeemNonce === 'number') {
          console.log('[UV TX] redeem nonce:', redeemNonce);
        }

        const hash = await writeContractAsync({
          address: targetController,
          abi: CONTROLLER_ABI,
          functionName: 'redeem',
          args: [targetAssetAddress, sharesRaw, minAssetsOut, userAddress, deadline],
          ...(redeemGas ? { gas: redeemGas } : {}),
          ...(typeof redeemNonce === 'number' ? { nonce: redeemNonce } : {}),
        });

        setLastTxHash(hash);
        setStepState('redeem_pending');

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        setStepState('confirmed');
      }

      // Invalidate and refetch all live protocol queries
      await invalidateProtocolQueries(queryClient);
      setTimeout(async () => {
        await invalidateProtocolQueries(queryClient);
      }, 1000);

      setSharesInput('');
      void refetchSmartAccountBalance();
    } catch (err: unknown) {
      console.error('Single-click Redeem workflow failed:', err);
      const decoded = decodeTransactionError(err, 'Redemption failed. Please try again.');
      setTxError(decoded.message);
      if (decoded.txHash) setLastTxHash(decoded.txHash);
      setStepState('failed');
      throw err;
    }
  };

  const isRedeemDisabled =
    !userAddress ||
    (source === 'gasless' && (!smartAccountAddress || !isGaslessSupported)) ||
    sharesRaw <= 0n ||
    (isPreviewLoading && rawOnChainNetAssets === 0n && sharesNum > 0) ||
    netAssetsRaw <= 0n ||
    (stepState !== 'idle' && stepState !== 'confirmed' && stepState !== 'failed') ||
    !isCorrectNetwork ||
    !targetController;

  const isRedeeming = stepState !== 'idle' && stepState !== 'confirmed' && stepState !== 'failed';

  return {
    sharesInput,
    setSharesInput,
    slippageBps,
    setSlippageBps,
    sharesRaw,
    grossAssetsEstimated,
    netAssetsRaw,
    grossUSD,
    feeUSD,
    netUSD,
    isPreviewLoading,
    isPreviewError,
    previewError,
    stepState,
    isRedeeming,
    isRedeemDisabled,
    isCorrectNetwork,
    txError,
    lastTxHash,
    resetState,
    executeRedeem,
    source,
    setSource,
    smartAccountAddress,
    smartAccountBalance,
    isGaslessSupported,
  };
}
