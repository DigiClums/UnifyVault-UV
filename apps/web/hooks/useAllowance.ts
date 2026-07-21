import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { IERC20_ABI } from '../lib/config/abis';
import { parseWalletError } from '../lib/utils/formatters';
import * as React from 'react';

export function useAllowance(
  tokenAddress?: `0x${string}`,
  spenderAddress?: `0x${string}`,
  secondarySpenderAddress?: `0x${string}`,
) {
  const { address: userAddress } = useAccount();

  // Read allowance for primary spender (e.g. Controller)
  const {
    data: allowancePrimary,
    isLoading: isLoadingPrimary,
    refetch: refetchPrimary,
  } = useReadContract({
    address: tokenAddress,
    abi: IERC20_ABI,
    functionName: 'allowance',
    args: userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!spenderAddress && !!userAddress,
    },
  });

  // Read allowance for secondary spender (e.g. CustodyVault)
  const {
    data: allowanceSecondary,
    isLoading: isLoadingSecondary,
    refetch: refetchSecondary,
  } = useReadContract({
    address: tokenAddress,
    abi: IERC20_ABI,
    functionName: 'allowance',
    args:
      userAddress && secondarySpenderAddress ? [userAddress, secondarySpenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!secondarySpenderAddress && !!userAddress,
    },
  });

  const refetch = React.useCallback(async () => {
    await Promise.all([refetchPrimary(), refetchSecondary()]);
  }, [refetchPrimary, refetchSecondary]);

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
    isLoading: isLoadingPrimary || isLoadingSecondary,
    refetch,
    approve,
    reset,
    status,
    errorMessage: errorMessage || (approveError ? parseWalletError(approveError) : undefined),
    txHash,
  };
}
