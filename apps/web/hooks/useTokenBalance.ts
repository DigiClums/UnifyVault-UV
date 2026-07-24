import { useAccount, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { IERC20_ABI } from '../lib/config/abis';

export function useTokenBalance(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();

  const { data, isLoading, refetch, isError } = useReadContracts({
    contracts: [
      {
        address: tokenAddress,
        abi: IERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
      {
        address: tokenAddress,
        abi: IERC20_ABI,
        functionName: 'decimals',
      },
      {
        address: tokenAddress,
        abi: IERC20_ABI,
        functionName: 'symbol',
      },
    ],
    query: {
      enabled: !!tokenAddress && !!userAddress,
      staleTime: 10000,
    },
  });

  const [balanceResult, decimalsResult, symbolResult] = data || [];
  const balance =
    balanceResult?.status === 'success' ? (balanceResult.result as bigint) : undefined;
  const decimals =
    decimalsResult?.status === 'success' ? (decimalsResult.result as number) : undefined;
  const symbol = symbolResult?.status === 'success' ? (symbolResult.result as string) : undefined;
  const formattedBalance = balance !== undefined ? formatUnits(balance, decimals ?? 18) : undefined;

  return {
    balance,
    decimals,
    symbol,
    formattedBalance,
    isLoading,
    isError,
    refetch,
  };
}
