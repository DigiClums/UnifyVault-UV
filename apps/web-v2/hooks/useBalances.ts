'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { ERC20_ABI } from '../lib/contracts';
import { MAINNET_TOKENS } from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';

export function useBalances() {
  const { address: userAddress } = useAccount();
  const { token, controller } = useProtocolDirectory();

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      {
        address: MAINNET_TOKENS.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
      {
        address: token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress && token ? [userAddress] : undefined,
      },
      {
        address: MAINNET_TOKENS.USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: userAddress && controller ? [userAddress, controller] : undefined,
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
