import { useReadContract, useAccount } from 'wagmi';
import { UNIFY_VAULT_CONTROLLER_ABI, COST_BASIS_MANAGER_ABI } from '../lib/config/abis';
import { useControllerAddress } from './useControllerAddress';
import { useProtocolDirectoryAddresses } from './useProtocolDirectoryAddresses';
import { parseAmount } from '../lib/utils/formatters';
import * as React from 'react';

// Debounce helper utility hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useRedeemPreview(tokenAddress?: `0x${string}`, sharesInput?: string | bigint) {
  const { address: userAddress } = useAccount();
  const { controllerAddress } = useControllerAddress();
  const { costBasisManagerAddress } = useProtocolDirectoryAddresses();

  const stringValue = typeof sharesInput === 'string' ? sharesInput : undefined;
  // Debounce input to reduce duplicate RPC hits
  const debouncedSharesString = useDebounce(stringValue, 450);

  const parsedShares = React.useMemo(() => {
    if (typeof sharesInput === 'bigint') return sharesInput;
    if (
      !debouncedSharesString ||
      debouncedSharesString === '0' ||
      isNaN(Number(debouncedSharesString))
    )
      return 0n;
    return parseAmount(debouncedSharesString, 18); // Shares have 18 decimals
  }, [sharesInput, debouncedSharesString]);

  // Read net payout from controller previewRedeem
  const {
    data: netAssetsOutData,
    isLoading: isLoadingController,
    isError: isControllerError,
    error: controllerError,
    refetch: refetchController,
  } = useReadContract({
    address: controllerAddress,
    abi: UNIFY_VAULT_CONTROLLER_ABI,
    functionName: 'previewRedeem',
    args:
      controllerAddress && tokenAddress && parsedShares > 0n
        ? [tokenAddress, parsedShares]
        : undefined,
    query: {
      enabled: !!controllerAddress && !!tokenAddress && parsedShares > 0n,
      refetchInterval: 15000,
    },
  });

  // Read cost basis data from CostBasisManager
  const { data: costBasisData, refetch: refetchCostBasis } = useReadContract({
    address: costBasisManagerAddress,
    abi: COST_BASIS_MANAGER_ABI,
    functionName: 'costBasis',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!costBasisManagerAddress && !!userAddress,
      refetchInterval: 15000,
    },
  });

  const netAssetsOut = netAssetsOutData as bigint | undefined;

  const { grossAssets, protocolFee, costBasis, realizedProfit, performanceFee, chargeableProfit } =
    React.useMemo(() => {
      if (netAssetsOut === undefined || parsedShares === 0n) {
        return {
          grossAssets: undefined,
          protocolFee: undefined,
          costBasis: undefined,
          realizedProfit: undefined,
          performanceFee: undefined,
          chargeableProfit: undefined,
        };
      }

      // UnifyVault v2.2.0 Fee Structure:
      // Protocol redeem fee: 0.25% (25 BPS) for legacy compatibility or 2.00% (200 BPS)
      // We compute gross assets based on net payout:
      // If netAssetsOut comes directly from previewRedeem, gross = (netAssetsOut * 10000n) / 9975n
      const gross = (netAssetsOut * 10000n) / 9975n;
      const protoFee = gross - netAssetsOut;

      // Cost basis calculation
      let allocatedCostBasis = 0n;
      if (costBasisData) {
        const [totalCostBasis, sharesOwned] = costBasisData as [bigint, bigint];
        if (sharesOwned > 0n) {
          allocatedCostBasis = (totalCostBasis * parsedShares) / sharesOwned;
        }
      } else {
        // Fallback cost basis estimate (76% ratio for demonstration / initial cost basis)
        allocatedCostBasis = (gross * 76n) / 100n;
      }

      const netOutBeforePerfFee = gross - protoFee;
      const grossProfit =
        netOutBeforePerfFee > allocatedCostBasis ? netOutBeforePerfFee - allocatedCostBasis : 0n;

      // Performance Fee: 5.00% (500 BPS) on chargeable profit
      const perfFee = (grossProfit * 500n) / 10000n;
      const netReceived = netOutBeforePerfFee - perfFee;

      return {
        grossAssets: gross,
        protocolFee: protoFee,
        costBasis: allocatedCostBasis,
        realizedProfit: grossProfit,
        performanceFee: perfFee,
        chargeableProfit: grossProfit,
        netAssetsOut: netReceived,
      };
    }, [netAssetsOut, parsedShares, costBasisData]);

  const refetchAll = React.useCallback(async () => {
    await Promise.all([refetchController(), refetchCostBasis()]);
  }, [refetchController, refetchCostBasis]);

  return {
    previewAssets: netAssetsOut,
    netAssetsOut,
    grossAssets,
    protocolFee,
    costBasis,
    realizedProfit,
    performanceFee,
    chargeableProfit,
    isLoading: isLoadingController && parsedShares > 0n,
    isError: isControllerError,
    error: controllerError,
    refetch: refetchAll,
  };
}
