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

  const assets = netAssetsOut as bigint | undefined;

  const { grossAssets, protocolFee } = React.useMemo(() => {
    if (assets === undefined) {
      return { grossAssets: undefined, protocolFee: undefined };
    }
    // Protocol redeem fee is 0.10% (10 BPS)
    // netAssetsOut = grossAssets - (grossAssets * 10) / 10000 = (grossAssets * 9990) / 10000
    // grossAssets = (netAssetsOut * 10000) / 9990
    // protocolFee = grossAssets - netAssetsOut
    const gross = (assets * 10000n) / 9990n;
    const fee = gross - assets;
    return { grossAssets: gross, protocolFee: fee };
  }, [assets]);

  return {
    previewAssets: assets,
    netAssetsOut: assets,
    grossAssets,
    protocolFee,
    isLoading: isLoading && parsedShares > 0n,
    isError,
    error,
    refetch,
  };
}
