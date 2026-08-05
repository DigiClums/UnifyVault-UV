'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTROLLER_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';
import { getChainTokens } from '../constants';
import { parseUnits, formatUnits, formatUSD, calculateSlippageMinAssets } from '../lib/math';
import { base, baseSepolia } from 'viem/chains';

export function useRedeem(targetAssetAddressInput?: `0x${string}`, targetDecimals: number = 6) {
  const { address: userAddress, chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const targetAssetAddress = targetAssetAddressInput || tokens.USDC;
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { controller } = useProtocolDirectory();

  const [sharesInput, setSharesInput] = useState<string>('');
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5% default
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [txError, setTxError] = useState<string | null>(null);

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
      refetchInterval: 5_000,
    },
  });

  const { data: redeemFeeBpsRaw } = useReadContract({
    address: targetController,
    abi: CONTROLLER_ABI,
    functionName: 'getRedeemFeeBps',
    query: {
      enabled: !!targetController && isCorrectNetwork,
    },
  });

  const redeemFeeBps = (redeemFeeBpsRaw as bigint) || 200n;

  const netAssetsRaw = (previewAssetsRaw as bigint) || 0n;
  const denominator = 10000n - redeemFeeBps;
  const grossAssetsEstimated =
    netAssetsRaw > 0n && denominator > 0n ? (netAssetsRaw * 10000n) / denominator : 0n;
  const feeAssetsRaw =
    grossAssetsEstimated > netAssetsRaw ? grossAssetsEstimated - netAssetsRaw : 0n;

  const grossUSDVal = Number(formatUnits(grossAssetsEstimated, targetDecimals));
  const netUSDVal = Number(formatUnits(netAssetsRaw, targetDecimals));
  const feeUSDVal = grossUSDVal > netUSDVal ? grossUSDVal - netUSDVal : 0;

  const grossUSD = formatUSD(grossUSDVal);
  const feeUSD = formatUSD(feeUSDVal);
  const netUSD = formatUSD(netUSDVal);

  const executeRedeem = async () => {
    if (!userAddress || sharesRaw <= 0n || !targetController || netAssetsRaw <= 0n) {
      throw new Error('Cannot execute redeem: Valid on-chain preview or quote is missing.');
    }
    if (!isCorrectNetwork) {
      throw new Error(
        'Wrong network: Please switch to a supported network (Base Mainnet or Base Sepolia)',
      );
    }
    setIsRedeeming(true);
    setTxError(null);

    try {
      const minAssetsOut = calculateSlippageMinAssets(netAssetsRaw, slippageBps / 100);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      let gasEstimate: bigint | undefined = undefined;
      if (publicClient) {
        try {
          const est = await publicClient.estimateContractGas({
            address: targetController,
            abi: CONTROLLER_ABI,
            functionName: 'redeem',
            args: [targetAssetAddress, sharesRaw, minAssetsOut, userAddress, deadline],
            account: userAddress,
          });
          gasEstimate = (est * 120n) / 100n;
        } catch {
          // simulation estimate fallback
        }
      }

      const hash = await writeContractAsync({
        address: targetController,
        abi: CONTROLLER_ABI,
        functionName: 'redeem',
        args: [targetAssetAddress, sharesRaw, minAssetsOut, userAddress, deadline],
        ...(gasEstimate ? { gas: gasEstimate } : {}),
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setSharesInput('');
    } catch (error: any) {
      console.error('Redeem transaction failed:', error);
      const msg = error?.shortMessage || error?.message || 'Redemption failed';
      setTxError(msg);
      throw error;
    } finally {
      setIsRedeeming(false);
    }
  };

  const isRedeemDisabled =
    !userAddress ||
    sharesRaw <= 0n ||
    isPreviewLoading ||
    isPreviewError ||
    netAssetsRaw <= 0n ||
    isRedeeming ||
    !isCorrectNetwork ||
    !targetController;

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
    isRedeeming,
    isRedeemDisabled,
    isCorrectNetwork,
    txError,
    executeRedeem,
  };
}
