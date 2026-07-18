import { useAccount, useReadContract } from 'wagmi';
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

export function useDepositPreview(
  tokenAddress?: `0x${string}`,
  amountString?: string,
  decimals = 18,
) {
  const { address: userAddress } = useAccount();
  const { controllerAddress } = useControllerAddress();

  // Debounce input to reduce duplicate RPC hits
  const debouncedAmountString = useDebounce(amountString, 450);

  const parsedAmount = React.useMemo(() => {
    if (
      !debouncedAmountString ||
      debouncedAmountString === '0' ||
      isNaN(Number(debouncedAmountString))
    )
      return 0n;
    return parseAmount(debouncedAmountString, decimals);
  }, [debouncedAmountString, decimals]);

  const {
    data: quote,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: controllerAddress,
    abi: UNIFY_VAULT_CONTROLLER_ABI,
    functionName: 'getDepositQuote',
    args:
      controllerAddress && tokenAddress && parsedAmount > 0n && userAddress
        ? [tokenAddress, parsedAmount, 0n, userAddress]
        : undefined,
    query: {
      enabled: !!controllerAddress && !!tokenAddress && parsedAmount > 0n && !!userAddress,
      refetchInterval: 15000, // Sync with oracle updates every 15 seconds
    },
  });

  return {
    quote: quote as
      | {
          assetId: `0x${string}`;
          asset: `0x${string}`;
          receiver: `0x${string}`;
          depositAmount: bigint;
          rawPrice: bigint;
          normalizedPrice: bigint;
          sharesPreview: bigint;
          protocolFee: bigint;
          netDeposit: bigint;
          timestamp: bigint;
        }
      | undefined,
    isLoading: isLoading && parsedAmount > 0n,
    isError,
    error,
    refetch,
  };
}
