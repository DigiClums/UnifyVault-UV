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

export function useRedeemPreview(tokenAddress?: `0x${string}`, sharesString?: string) {
  const { controllerAddress } = useControllerAddress();

  // Debounce input to reduce duplicate RPC hits
  const debouncedSharesString = useDebounce(sharesString, 450);

  const parsedShares = React.useMemo(() => {
    if (
      !debouncedSharesString ||
      debouncedSharesString === '0' ||
      isNaN(Number(debouncedSharesString))
    )
      return 0n;
    return parseAmount(debouncedSharesString, 18); // Shares have 18 decimals
  }, [debouncedSharesString]);

  const {
    data: netAssetsOut,
    isLoading,
    isError,
    error,
    refetch,
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
      refetchInterval: 15000, // Sync with oracle updates every 15 seconds
    },
  });

  return {
    netAssetsOut: netAssetsOut as bigint | undefined,
    isLoading: isLoading && parsedShares > 0n,
    isError,
    error,
    refetch,
  };
}
