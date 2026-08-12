'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { ERC20_ABI } from '../lib/contracts';
import { getMarketplaceAddress } from './useMarketplace';
import { getDefaultChainId } from '../constants';
import {
  computeSellOrderPreflight,
  PreflightBalanceResult,
  ETH_GAS_RESERVE,
} from '../lib/p2p/sellOrderPreflight';
import {
  validateP2PAsset,
  isNativeETHAsset,
  ValidateAssetResult,
} from '../lib/p2p/assetValidation';

export interface UseSellOrderPreflightParams {
  side: 'BUY' | 'SELL';
  asset: `0x${string}`;
  amountStr: string;
}

export function useSellOrderPreflight({
  side,
  asset,
  amountStr,
}: UseSellOrderPreflightParams) {
  const { address: userAddress, chain } = useAccount();
  const targetChainId = getDefaultChainId();
  const publicClient = usePublicClient({ chainId: targetChainId });
  const marketplaceAddress = getMarketplaceAddress();

  const [rawBalance, setRawBalance] = useState<bigint | null>(null);
  const [rawAllowance, setRawAllowance] = useState<bigint | null>(null);
  const [validatedDecimals, setValidatedDecimals] = useState<number | null>(null);
  const [validatedSymbol, setValidatedSymbol] = useState<string | null>(null);
  const [isContractDeployed, setIsContractDeployed] = useState<boolean | null>(true);
  const [contractReadError, setContractReadError] = useState<string | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const fetchBalanceAndAllowance = useCallback(async () => {
    if (!userAddress || !publicClient) {
      setRawBalance(null);
      setRawAllowance(null);
      setValidatedDecimals(null);
      setValidatedSymbol(null);
      setIsContractDeployed(null);
      setContractReadError(null);
      setIsBalanceLoading(false);
      setBalanceError(null);
      return;
    }

    if (side !== 'SELL') {
      setIsBalanceLoading(false);
      return;
    }

    const activeChainId = chain?.id || targetChainId;

    // Perform authoritative P2P asset validation for active chain
    const assetVal: ValidateAssetResult = validateP2PAsset(asset, activeChainId);

    if (!assetVal.isValid) {
      setRawBalance(null);
      setRawAllowance(null);
      setValidatedDecimals(null);
      setValidatedSymbol(null);
      setIsContractDeployed(false);
      setContractReadError(assetVal.errorMessage || 'Selected asset is not supported on the active network.');
      setBalanceError(assetVal.errorMessage || 'Selected asset is not supported on the active network.');
      setIsBalanceLoading(false);
      return;
    }

    try {
      setIsBalanceLoading(true);
      setBalanceError(null);
      setContractReadError(null);

      if (assetVal.isNative) {
        // Native ETH has no ERC20 contract — use getBalance() only
        setIsContractDeployed(true);
        setValidatedDecimals(18);
        setValidatedSymbol('ETH');

        const bal = await publicClient.getBalance({ address: userAddress });
        setRawBalance(bal);
        setRawAllowance(null);
      } else {
        const checksummedAddr = assetVal.checksummedAddress!;

        // 1. Read bytecode to verify contract exists on active chain
        let bytecode: string | undefined;
        try {
          bytecode = await publicClient.getBytecode({ address: checksummedAddr });
        } catch (err: any) {
          console.error('Error reading bytecode:', err);
          setIsContractDeployed(false);
          setContractReadError('Failed to read token contract state (bytecode/decimals) from chain.');
          setRawBalance(null);
          setRawAllowance(null);
          return;
        }

        if (!bytecode || bytecode === '0x' || bytecode === '0x0') {
          setIsContractDeployed(false);
          setContractReadError('Selected asset contract is not deployed on the active network.');
          setRawBalance(null);
          setRawAllowance(null);
          return;
        }

        setIsContractDeployed(true);

        // 2. Read decimals() on-chain (MUST succeed)
        let dec: number;
        try {
          dec = Number(
            await publicClient.readContract({
              address: checksummedAddr,
              abi: ERC20_ABI,
              functionName: 'decimals',
            })
          );
          setValidatedDecimals(dec);
        } catch (err: any) {
          console.error('Error reading decimals():', err);
          setContractReadError('Failed to read token contract state (bytecode/decimals) from chain.');
          setValidatedDecimals(null);
          setRawBalance(null);
          setRawAllowance(null);
          return;
        }

        // 3. Read symbol() on-chain when available
        let sym: string = assetVal.assetInfo?.symbol || '';
        try {
          const readSym = (await publicClient.readContract({
            address: checksummedAddr,
            abi: ERC20_ABI,
            functionName: 'symbol',
          })) as string;
          if (readSym) sym = readSym;
        } catch {
          // Symbol reading failure falls back to supported asset metadata symbol
        }
        setValidatedSymbol(sym);

        // 4. Read balanceOf(seller) and allowance(seller, Marketplace)
        const [bal, allow] = await Promise.all([
          publicClient.readContract({
            address: checksummedAddr,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: checksummedAddr,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [userAddress, marketplaceAddress],
          }) as Promise<bigint>,
        ]);

        setRawBalance(bal);
        setRawAllowance(allow);
      }
    } catch (err: any) {
      console.error('Error fetching seller balance/allowance:', err);
      const errMsg = err?.message || 'Failed to read wallet balance from chain.';
      setBalanceError(errMsg);
      setRawBalance(null);
      setRawAllowance(null);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [userAddress, chain?.id, publicClient, asset, side, marketplaceAddress, targetChainId]);

  useEffect(() => {
    fetchBalanceAndAllowance();
  }, [fetchBalanceAndAllowance]);

  const result: PreflightBalanceResult = computeSellOrderPreflight({
    side,
    asset,
    amountStr,
    rawBalance,
    rawAllowance,
    validatedDecimals,
    validatedSymbol,
    isContractDeployed,
    contractReadError,
    userAddress,
    connectedChainId: chain?.id,
    targetChainId,
    balanceError,
    isBalanceLoading,
  });

  /**
   * Section 7: Final Submission Revalidation immediately before writeContract/createSellOrder.
   * Performs an immediate, live sanity check against the current wallet, chain, asset, decimals, and balance.
   */
  const verifyFinalSubmissionState = useCallback(
    async (params: {
      expectedAsset: `0x${string}`;
      expectedAmountStr: string;
    }): Promise<{ isValid: boolean; errorMessage: string | null }> => {
      if (!userAddress) {
        return { isValid: false, errorMessage: 'Please connect your wallet first.' };
      }

      const connectedChainId = chain?.id;
      if (connectedChainId && connectedChainId !== targetChainId) {
        return { isValid: false, errorMessage: 'Wrong network. Please switch to the supported network.' };
      }

      const activeChainId = connectedChainId || targetChainId;
      const assetVal = validateP2PAsset(params.expectedAsset, activeChainId);

      if (!assetVal.isValid) {
        return {
          isValid: false,
          errorMessage: assetVal.errorMessage || 'Selected asset is not supported on the active network.',
        };
      }

      if (!publicClient) {
        return { isValid: false, errorMessage: 'Network client unavailable. Please try again.' };
      }

      if (assetVal.isNative) {
        try {
          const liveBal = await publicClient.getBalance({ address: userAddress });
          const available = liveBal > ETH_GAS_RESERVE ? liveBal - ETH_GAS_RESERVE : 0n;
          const reqBigInt = parseUnits(params.expectedAmountStr.trim(), 18);

          if (reqBigInt > available) {
            const formattedAvailable = formatUnits(available, 18);
            return {
              isValid: false,
              errorMessage: `Insufficient balance: Available balance is ${formattedAvailable} ETH, but requested ${params.expectedAmountStr} ETH.`,
            };
          }
        } catch (err: any) {
          return { isValid: false, errorMessage: 'Failed to read wallet balance from chain.' };
        }
      } else {
        const checksummedAddr = assetVal.checksummedAddress!;
        try {
          const bytecode = await publicClient.getBytecode({ address: checksummedAddr });
          if (!bytecode || bytecode === '0x' || bytecode === '0x0') {
            return {
              isValid: false,
              errorMessage: 'Selected asset contract is not deployed on the active network.',
            };
          }

          const dec = Number(
            await publicClient.readContract({
              address: checksummedAddr,
              abi: ERC20_ABI,
              functionName: 'decimals',
            })
          );

          const liveBal = (await publicClient.readContract({
            address: checksummedAddr,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
          })) as bigint;

          const reqBigInt = parseUnits(params.expectedAmountStr.trim(), dec);

          if (reqBigInt > liveBal) {
            const formattedAvailable = formatUnits(liveBal, dec);
            const sym = assetVal.assetInfo?.symbol || 'token';
            return {
              isValid: false,
              errorMessage: `Insufficient balance: Available balance is ${formattedAvailable} ${sym}, but requested ${params.expectedAmountStr} ${sym}.`,
            };
          }
        } catch (err: any) {
          return {
            isValid: false,
            errorMessage: 'Failed to read token contract state (bytecode/decimals) from chain.',
          };
        }
      }

      return { isValid: true, errorMessage: null };
    },
    [userAddress, chain?.id, targetChainId, publicClient]
  );

  return {
    ...result,
    rawBalance,
    rawAllowance,
    validatedDecimals,
    validatedSymbol,
    isContractDeployed,
    contractReadError,
    isBalanceLoading,
    balanceError,
    refetch: fetchBalanceAndAllowance,
    verifyFinalSubmissionState,
  };
}
