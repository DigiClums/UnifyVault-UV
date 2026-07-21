import { useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { UNIFY_VAULT_CONTROLLER_ABI } from '../lib/config/abis';
import { useControllerAddress } from './useControllerAddress';
import { parseWalletError } from '../lib/utils/formatters';
import * as React from 'react';

export function useDeposit(tokenAddress?: `0x${string}`) {
  const { controllerAddress } = useControllerAddress();
  const [depositParams, setDepositParams] = React.useState<
    { amount: bigint; minSharesOut: bigint; receiver: `0x${string}` } | undefined
  >(undefined);

  // Pre-flight simulation before writeContract
  const { data: simulation, error: simulateError } = useSimulateContract({
    address: controllerAddress,
    abi: UNIFY_VAULT_CONTROLLER_ABI,
    functionName: 'deposit',
    args:
      tokenAddress && depositParams
        ? [tokenAddress, depositParams.amount, depositParams.minSharesOut, depositParams.receiver]
        : undefined,
    query: {
      enabled:
        !!controllerAddress && !!tokenAddress && !!depositParams && depositParams.amount > 0n,
    },
  });

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

  const deposit = React.useCallback(
    async (amount: bigint, minSharesOut: bigint, receiver: `0x${string}`) => {
      if (!controllerAddress || !tokenAddress) return;
      setDepositParams({ amount, minSharesOut, receiver });
      setErrorMessage(undefined);
      setTxHash(undefined);
      setIsSigning(true);
      try {
        if (simulation?.request) {
          const hash = await writeContractAsync(simulation.request);
          setTxHash(hash);
        } else {
          const hash = await writeContractAsync({
            address: controllerAddress,
            abi: UNIFY_VAULT_CONTROLLER_ABI,
            functionName: 'deposit',
            args: [tokenAddress, amount, minSharesOut, receiver],
          });
          setTxHash(hash);
        }
      } catch (err) {
        setErrorMessage(parseWalletError(err));
      } finally {
        setIsSigning(false);
      }
    },
    [controllerAddress, tokenAddress, simulation, writeContractAsync],
  );

  const reset = React.useCallback(() => {
    setTxHash(undefined);
    setErrorMessage(undefined);
    setIsSigning(false);
    setDepositParams(undefined);
  }, []);

  const status = React.useMemo(() => {
    if (isTxSuccess) return 'confirmed';
    if (isTxPending) return 'pending';
    if (isSigning || isSubmitPending) return 'submitting';
    return 'idle';
  }, [isTxSuccess, isTxPending, isSigning, isSubmitPending]);

  return {
    deposit,
    reset,
    status,
    txHash,
    errorMessage:
      errorMessage ||
      (simulateError ? parseWalletError(simulateError) : undefined) ||
      (submitError ? parseWalletError(submitError) : undefined) ||
      (txReceiptError ? parseWalletError(txReceiptError) : undefined),
  };
}
