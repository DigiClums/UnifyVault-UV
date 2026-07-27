'use client';

import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { ERC20_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';

export function useBalances() {
  const { address: userAddress } = useAccount();

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      {
        address: FALLBACK_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
      {
        address: FALLBACK_ADDRESSES.TOKEN,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
      {
        address: FALLBACK_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: userAddress ? [userAddress, FALLBACK_ADDRESSES.CONTROLLER] : undefined,
      },
    ],
    query: {
      enabled: !!userAddress,
      refetchInterval: 10_000,
    },
  });

  const usdcBalance = (data?.[0]?.result as bigint) || 0n;
  const sharesBalance = (data?.[1]?.result as bigint) || 0n;
  const usdcAllowance = (data?.[2]?.result as bigint) || 0n;

  return {
    usdcBalance,
    sharesBalance,
    usdcAllowance,
    isLoading,
    isError,
    refetch,
  };
}
