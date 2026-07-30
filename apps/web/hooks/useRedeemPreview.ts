import { useReadContract } from 'wagmi';
import { UNIFY_VAULT_CONTROLLER_ABI } from '../lib/config/abis';
import { useControllerAddress } from './useControllerAddress';
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
  const { controllerAddress } = useControllerAddress();

  const stringValue = typeof sharesInput === 'string' ? sharesInput : undefined;
  const debouncedSharesString = useDebounce(stringValue, 450);

  const parsedShares = React.useMemo(() => {
    if (typeof sharesInput === 'bigint') return sharesInput;
    if (
      !debouncedSharesString ||
      debouncedSharesString === '0' ||
      isNaN(Number(debouncedSharesString))
    )
      return 0n;
    return parseAmount(debouncedSharesString, 18);
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

  const netAssetsOut = netAssetsOutData as bigint | undefined;

  const { grossAssets, protocolFee } = React.useMemo(() => {
    if (netAssetsOut === undefined || parsedShares === 0n) {
      return {
        grossAssets: undefined,
        protocolFee: undefined,
      };
    }

    // Redemption Fee: 2.00% (200 BPS)
    const gross = (netAssetsOut * 10000n) / 9800n;
    const protoFee = gross - netAssetsOut;

    return {
      grossAssets: gross,
      protocolFee: protoFee,
    };
  }, [netAssetsOut, parsedShares]);

  return {
    previewAssets: netAssetsOut,
    netAssetsOut,
    grossAssets,
    protocolFee,
    isLoading: isLoadingController && parsedShares > 0n,
    isError: isControllerError,
    error: controllerError,
    refetch: refetchController,
  };
}
