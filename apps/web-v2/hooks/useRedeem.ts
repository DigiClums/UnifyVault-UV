'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTROLLER_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';
import {
  parseUnits,
  formatUnits,
  formatUSD,
  calculateRedeemFee,
  calculateNetRedeem,
  calculateSlippageMinAssets,
} from '../lib/math';

export function useRedeem() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [sharesInput, setSharesInput] = useState<string>('');
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5% default
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);

  const sharesRaw = parseUnits(sharesInput, 18);

  // Fetch preview redemption on-chain
  const { data: previewAssetsRaw, isLoading: isPreviewLoading } = useReadContract({
    address: FALLBACK_ADDRESSES.CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'previewRedeem',
    args: sharesRaw > 0n ? [FALLBACK_ADDRESSES.USDC, sharesRaw] : undefined,
    query: {
      enabled: sharesRaw > 0n,
      refetchInterval: 5_000,
    },
  });

  const grossAssetsEstimated = (previewAssetsRaw as bigint) || 0n;
  const feeRaw = calculateRedeemFee(grossAssetsEstimated, 200n);
  const netAssetsRaw = calculateNetRedeem(grossAssetsEstimated, 200n);

  const grossUSD = formatUSD(Number(formatUnits(grossAssetsEstimated, 6)));
  const feeUSD = formatUSD(Number(formatUnits(feeRaw, 6)));
  const netUSD = formatUSD(Number(formatUnits(netAssetsRaw, 6)));

  const executeRedeem = async () => {
    if (!userAddress || sharesRaw <= 0n) return;
    setIsRedeeming(true);

    try {
      const minAssetsOut = calculateSlippageMinAssets(netAssetsRaw, slippageBps / 100);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 mins

      const hash = await writeContractAsync({
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'redeem',
        args: [FALLBACK_ADDRESSES.USDC, sharesRaw, minAssetsOut, userAddress, deadline],
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setSharesInput('');
    } catch (error) {
      console.error('Redeem failed:', error);
      throw error;
    } finally {
      setIsRedeeming(false);
    }
  };

  return {
    sharesInput,
    setSharesInput,
    slippageBps,
    setSlippageBps,
    sharesRaw,
    grossAssetsEstimated,
    feeRaw,
    netAssetsRaw,
    grossUSD,
    feeUSD,
    netUSD,
    isPreviewLoading,
    isRedeeming,
    executeRedeem,
  };
}
