import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { IERC20_ABI } from '../lib/config/abis';
import { parseWalletError } from '../lib/utils/formatters';
import * as React from 'react';

export function useAllowance(tokenAddress?: `0x${string}`, spenderAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();

  // Read allowance
  const {
    data: allowance,
    isLoading: isLoadingRead,
    refetch,
  } = useReadContract({
    address: tokenAddress,
    abi: IERC20_ABI,
    functionName: 'allowance',
    args: userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!spenderAddress && !!userAddress,
    },
  });

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
      if (!tokenAddress || !spenderAddress) return;
      setErrorMessage(undefined);
      setTxHash(undefined);
      setIsSigning(true);
      try {
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: IERC20_ABI,
          functionName: 'approve',
          args: [spenderAddress, amount],
        });
        setTxHash(hash);
      } catch (err) {
        setErrorMessage(parseWalletError(err));
      } finally {
        setIsSigning(false);
      }
    },
    [tokenAddress, spenderAddress, writeContractAsync],
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
    allowance: allowance as bigint | undefined,
    isLoading: isLoadingRead,
    refetch,
    approve,
    reset,
    status,
    errorMessage: errorMessage || (approveError ? parseWalletError(approveError) : undefined),
    txHash,
  };
}
