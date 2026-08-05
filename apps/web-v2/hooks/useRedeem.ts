'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTROLLER_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';
import { MAINNET_TOKENS } from '../constants';
import { parseUnits, formatUnits, formatUSD, calculateSlippageMinAssets } from '../lib/math';
import { base } from 'viem/chains';

export function useRedeem(
  targetAssetAddress: `0x${string}` = MAINNET_TOKENS.USDC,
  targetDecimals: number = 6,
) {
  const { address: userAddress, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { controller } = useProtocolDirectory();

  const [sharesInput, setSharesInput] = useState<string>('');
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5% default
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [txError, setTxError] = useState<string | null>(null);

  const sharesRaw = parseUnits(sharesInput, 18);
  const isCorrectNetwork = chain?.id === base.id;
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

  const grossAssetsEstimated = (previewAssetsRaw as bigint) || 0n;
  const netAssetsRaw = grossAssetsEstimated;

  const grossUSD = formatUSD(Number(formatUnits(grossAssetsEstimated, targetDecimals)));
  const feeUSD = formatUSD(
    Number(formatUnits((grossAssetsEstimated * 200n) / 10000n, targetDecimals)),
  );
  const netUSD = formatUSD(Number(formatUnits(netAssetsRaw, targetDecimals)));

  const executeRedeem = async () => {
    if (!userAddress || sharesRaw <= 0n || !targetController || netAssetsRaw <= 0n) {
      throw new Error('Cannot execute redeem: Valid on-chain preview or quote is missing.');
    }
    if (!isCorrectNetwork) {
      throw new Error('Wrong network: Please switch to Base Mainnet (Chain ID 8453)');
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
