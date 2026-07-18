import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { UNIFY_VAULT_CONTROLLER_ABI } from '../lib/config/abis';
import { useControllerAddress } from './useControllerAddress';
import { parseWalletError } from '../lib/utils/formatters';
import * as React from 'react';

export function useRedeem(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const { controllerAddress } = useControllerAddress();
  const { writeContractAsync, isPending: isSubmitPending, error: submitError } = useWriteContract();
  const [txHash, setTxHash] = React.useState<`0x${string}` | undefined>(undefined);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
  const [isSigning, setIsSigning] = React.useState(false);

  const {
    isLoading: isTxPending,
    isSuccess: isTxSuccess,
    error: txReceiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const redeem = React.useCallback(
    async (shares: bigint, minAssetsOut: bigint) => {
      if (!controllerAddress || !tokenAddress || !userAddress) return;
      setErrorMessage(undefined);
      setTxHash(undefined);
      setIsSigning(true);
      try {
        // Set standard 1-hour deadline
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        const hash = await writeContractAsync({
          address: controllerAddress,
          abi: UNIFY_VAULT_CONTROLLER_ABI,
          functionName: 'redeem',
          args: [tokenAddress, shares, minAssetsOut, userAddress, deadline],
        });
        setTxHash(hash);
      } catch (err) {
        setErrorMessage(parseWalletError(err));
      } finally {
        setIsSigning(false);
      }
    },
    [controllerAddress, tokenAddress, userAddress, writeContractAsync],
  );

  const reset = React.useCallback(() => {
    setTxHash(undefined);
    setErrorMessage(undefined);
    setIsSigning(false);
  }, []);

  const status = React.useMemo(() => {
    if (isTxSuccess) return 'confirmed';
    if (isTxPending) return 'pending';
    if (isSigning || isSubmitPending) return 'submitting';
    return 'idle';
  }, [isTxSuccess, isTxPending, isSigning, isSubmitPending]);

  return {
    redeem,
    reset,
    status,
    txHash,
    errorMessage:
      errorMessage ||
      (submitError ? parseWalletError(submitError) : undefined) ||
      (txReceiptError ? parseWalletError(txReceiptError) : undefined),
  };
}
