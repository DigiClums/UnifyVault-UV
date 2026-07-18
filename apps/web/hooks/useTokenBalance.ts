import { useAccount, useReadContracts } from 'wagmi';
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
    },
  });

  const [balanceResult, decimalsResult, symbolResult] = data || [];

  return {
    balance: balanceResult?.status === 'success' ? (balanceResult.result as bigint) : undefined,
    decimals: decimalsResult?.status === 'success' ? (decimalsResult.result as number) : undefined,
    symbol: symbolResult?.status === 'success' ? (symbolResult.result as string) : undefined,
    isLoading,
    isError,
    refetch,
  };
}
