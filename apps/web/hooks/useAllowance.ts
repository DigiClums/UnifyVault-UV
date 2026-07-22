import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { type Abi } from 'viem';
import { IERC20_ABI } from '../lib/config/abis';
import { parseWalletError } from '../lib/utils/formatters';
import * as React from 'react';

export function useAllowance(
  tokenAddress?: `0x${string}`,
  spenderAddress?: `0x${string}`,
  secondarySpenderAddress?: `0x${string}`,
) {
  const { address: userAddress } = useAccount();

  // Combine primary and secondary allowance reads into a single multicall
  const allowanceContracts = React.useMemo(() => {
    if (!tokenAddress || !userAddress) return [];
    const queries: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args: readonly unknown[];
    }[] = [];

    if (spenderAddress) {
      queries.push({
        address: tokenAddress,
        abi: IERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, spenderAddress],
      });
    }

    if (secondarySpenderAddress) {
      queries.push({
        address: tokenAddress,
        abi: IERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, secondarySpenderAddress],
      });
    }

    return queries;
  }, [tokenAddress, userAddress, spenderAddress, secondarySpenderAddress]);

  const {
    data: allowanceData,
    isLoading,
    refetch,
  } = useReadContracts({
    contracts: allowanceContracts,
    query: {
      enabled: allowanceContracts.length > 0,
      staleTime: 5000,
    },
  });

  const allowancePrimary = React.useMemo(() => {
    if (!spenderAddress || !allowanceData || allowanceData.length === 0) return undefined;
    return allowanceData[0]?.status === 'success' ? (allowanceData[0].result as bigint) : undefined;
  }, [spenderAddress, allowanceData]);

  const allowanceSecondary = React.useMemo(() => {
    if (!secondarySpenderAddress || !allowanceData) return undefined;
    const idx = spenderAddress ? 1 : 0;
    if (allowanceData.length <= idx) return undefined;
    return allowanceData[idx]?.status === 'success'
      ? (allowanceData[idx].result as bigint)
      : undefined;
  }, [spenderAddress, secondarySpenderAddress, allowanceData]);

  // Minimum allowance available between spenders
  const effectiveAllowance = React.useMemo(() => {
    const primary = (allowancePrimary as bigint | undefined) ?? 0n;
    if (!secondarySpenderAddress) return primary;
    const secondary = (allowanceSecondary as bigint | undefined) ?? 0n;
    return primary < secondary ? primary : secondary;
  }, [allowancePrimary, allowanceSecondary, secondarySpenderAddress]);

  // Approve action
  const {
    writeContractAsync,
    isPending: isApproveSubmitPending,
    error: approveError,
  } = useWriteContract();
  const [txHash, setTxHash] = React.useState<`0x${string}` | undefined>(undefined);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
  const [isSigning, setIsSigning] = React.useState(false);

  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const approve = React.useCallback(
    async (amount: bigint) => {
      if (!tokenAddress) return;
      setErrorMessage(undefined);
      setTxHash(undefined);
      setIsSigning(true);
      try {
        // Approve secondary spender (CustodyVault) if insufficient allowance
        if (secondarySpenderAddress) {
          const secondaryCurrent = (allowanceSecondary as bigint | undefined) ?? 0n;
          if (secondaryCurrent < amount) {
            const hashSec = await writeContractAsync({
              address: tokenAddress,
              abi: IERC20_ABI,
              functionName: 'approve',
              args: [secondarySpenderAddress, amount],
            });
            setTxHash(hashSec);
          }
        }
        // Approve primary spender (Controller) if insufficient allowance
        if (spenderAddress) {
          const primaryCurrent = (allowancePrimary as bigint | undefined) ?? 0n;
          if (primaryCurrent < amount) {
            const hashPrim = await writeContractAsync({
              address: tokenAddress,
              abi: IERC20_ABI,
              functionName: 'approve',
              args: [spenderAddress, amount],
            });
            setTxHash(hashPrim);
          }
        }
      } catch (err) {
        setErrorMessage(parseWalletError(err));
      } finally {
        setIsSigning(false);
      }
    },
    [
      tokenAddress,
      spenderAddress,
      secondarySpenderAddress,
      allowancePrimary,
      allowanceSecondary,
      writeContractAsync,
    ],
  );

  const reset = React.useCallback(() => {
    setTxHash(undefined);
    setErrorMessage(undefined);
    setIsSigning(false);
  }, []);

  const status = React.useMemo(() => {
    if (isTxSuccess) return 'confirmed';
    if (isTxPending) return 'pending';
    if (isSigning || isApproveSubmitPending) return 'submitting';
    return 'idle';
  }, [isTxSuccess, isTxPending, isSigning, isApproveSubmitPending]);

  return {
    allowance: effectiveAllowance,
    isLoading,
    refetch,
    approve,
    reset,
    status,
    errorMessage: errorMessage || (approveError ? parseWalletError(approveError) : undefined),
    txHash,
  };
}
