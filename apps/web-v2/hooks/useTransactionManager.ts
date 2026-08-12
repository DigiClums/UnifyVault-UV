'use client';

import { useState, useRef, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import {
  TransactionState,
  TransactionProgressState,
  ExecuteTransactionOptions,
  ExecuteWithApprovalOptions,
} from '../lib/transaction/types';
import { normalizeTransactionError } from '../lib/transaction/errorNormalizer';
import { checkERC20Allowance, ERC20_ALLOWANCE_ABI } from '../lib/transaction/allowanceHelper';

const DEFAULT_TIMEOUT_MS = 15_000; // 15 seconds wallet request timeout

const INITIAL_STATE: TransactionProgressState = {
  state: 'IDLE',
  attemptId: null,
  txHash: null,
  errorMessage: null,
  rawError: null,
  stepName: null,
  stepDescription: null,
  allowanceChecked: false,
  allowanceRequired: null,
  allowanceCurrent: null,
  allowanceSkipped: false,
  timeoutSeconds: DEFAULT_TIMEOUT_MS / 1000,
};

export function useTransactionManager(options?: { defaultTimeoutMs?: number }) {
  const { address: userAddress, chain, connector } = useAccount();
  const publicClient = usePublicClient();

  const timeoutMs = options?.defaultTimeoutMs || DEFAULT_TIMEOUT_MS;
  const timeoutSeconds = timeoutMs / 1000;

  const [progressState, setProgressState] = useState<TransactionProgressState>({
    ...INITIAL_STATE,
    timeoutSeconds,
  });

  // Unique Attempt ID ref & Timeout timer ref
  const currentAttemptIdRef = useRef<string | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store last execution config for [ TRY AGAIN ]
  const lastExecutionRef = useRef<(() => Promise<any>) | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearTimer();
    currentAttemptIdRef.current = null;
    setProgressState({
      ...INITIAL_STATE,
      timeoutSeconds,
    });
  }, [clearTimer, timeoutSeconds]);

  /**
   * Generates a new unique attempt ID.
   */
  const startNewAttempt = useCallback(
    (stepName?: string, stepDescription?: string): string => {
      clearTimer();
      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      currentAttemptIdRef.current = attemptId;

      setProgressState({
        state: 'PREPARING',
        attemptId,
        txHash: null,
        errorMessage: null,
        rawError: null,
        stepName: stepName || 'Preparing transaction',
        stepDescription: stepDescription || 'Initializing contract parameters...',
        allowanceChecked: false,
        allowanceRequired: null,
        allowanceCurrent: null,
        allowanceSkipped: false,
        timeoutSeconds,
      });

      return attemptId;
    },
    [clearTimer, timeoutSeconds],
  );

  /**
   * Transitions to WALLET_REQUEST and sets up the 15-20s timeout timer.
   */
  const enterWalletRequestState = useCallback(
    (attemptId: string, customMessage?: string) => {
      if (currentAttemptIdRef.current !== attemptId) return;

      setProgressState((prev) => ({
        ...prev,
        state: 'WALLET_REQUEST',
        stepDescription: customMessage || 'Please approve the transaction prompt in your wallet.',
      }));

      // Set timeout timer
      clearTimer();
      timeoutTimerRef.current = setTimeout(() => {
        // Only trigger timeout if attempt ID is still active & state is WALLET_REQUEST
        if (currentAttemptIdRef.current === attemptId) {
          setProgressState((prev) => {
            if (prev.state === 'WALLET_REQUEST') {
              return {
                ...prev,
                state: 'WALLET_REQUEST_TIMEOUT',
                errorMessage:
                  'Your wallet approval request did not appear. This can happen when the connection is slow or the wallet is temporarily unavailable.',
              };
            }
            return prev;
          });
        }
      }, timeoutMs);
    },
    [clearTimer, timeoutMs],
  );

  /**
   * Executes a contract write call with full lifecycle state management,
   * timeout handling, hash tracking, receipt confirmation, and stale response protection.
   */
  const executeTransaction = useCallback(
    async <T = `0x${string}`>(
      writeFn: () => Promise<`0x${string}`>,
      opts?: ExecuteTransactionOptions,
    ): Promise<`0x${string}`> => {
      const attemptId = startNewAttempt(opts?.stepName, opts?.stepDescription);

      // Save execution wrapper for retry
      lastExecutionRef.current = () => executeTransaction(writeFn, opts);

      enterWalletRequestState(
        attemptId,
        opts?.stepDescription || 'Please confirm the request in your connected wallet.',
      );

      try {
        const txHash = await writeFn();

        // Stale response guard: check if attemptId is still the active attempt
        if (currentAttemptIdRef.current !== attemptId) {
          console.warn(`Ignoring resolved txHash for stale attempt #${attemptId}`);
          return txHash;
        }

        clearTimer();

        if (opts?.onTxHash) opts.onTxHash(txHash);

        // Immediate transition to SUBMITTED -> CONFIRMING
        setProgressState((prev) => ({
          ...prev,
          state: 'SUBMITTED',
          txHash,
          stepName: opts?.stepName || 'Transaction Submitted',
          stepDescription: 'Transaction broadcasted to Base network. Waiting for confirmation...',
        }));

        // Transition to CONFIRMING
        setProgressState((prev) => ({
          ...prev,
          state: 'CONFIRMING',
        }));

        // Wait for receipt via RPC publicClient if available
        if (publicClient) {
          try {
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

            if (currentAttemptIdRef.current !== attemptId) return txHash;

            if (receipt.status === 'success') {
              setProgressState((prev) => ({
                ...prev,
                state: 'CONFIRMED',
                stepDescription: 'Transaction confirmed successfully on blockchain!',
              }));
              if (opts?.onSuccess) opts.onSuccess(receipt);
            } else {
              setProgressState((prev) => ({
                ...prev,
                state: 'FAILED',
                errorMessage: 'Transaction reverted on-chain by smart contract rules.',
              }));
            }
          } catch (receiptErr) {
            if (currentAttemptIdRef.current !== attemptId) return txHash;
            const normalized = normalizeTransactionError(receiptErr);
            setProgressState((prev) => ({
              ...prev,
              state: 'FAILED',
              errorMessage: normalized.message,
              rawError: receiptErr,
            }));
          }
        } else {
          // If no publicClient available, mark as CONFIRMED on hash return
          setProgressState((prev) => ({
            ...prev,
            state: 'CONFIRMED',
            stepDescription: 'Transaction broadcasted successfully.',
          }));
        }

        return txHash;
      } catch (err: unknown) {
        // Stale response guard: ignore errors from stale attempts
        if (currentAttemptIdRef.current !== attemptId) {
          console.warn(`Ignoring error for stale attempt #${attemptId}`);
          throw err;
        }

        clearTimer();

        const normalized = normalizeTransactionError(err);

        if (normalized.isUserRejection) {
          setProgressState((prev) => ({
            ...prev,
            state: 'USER_REJECTED',
            errorMessage: normalized.message,
            rawError: err,
          }));
        } else if (normalized.isTimeout) {
          setProgressState((prev) => ({
            ...prev,
            state: 'WALLET_REQUEST_TIMEOUT',
            errorMessage: normalized.message,
            rawError: err,
          }));
        } else {
          setProgressState((prev) => ({
            ...prev,
            state: 'FAILED',
            errorMessage: normalized.message,
            rawError: err,
          }));
        }

        throw err;
      }
    },
    [startNewAttempt, enterWalletRequestState, clearTimer, publicClient],
  );

  /**
   * Executes a transaction flow with automated ERC20 allowance checking.
   * If current allowance >= required, skips the approval popup entirely!
   * If insufficient, requests approval -> waits for confirmation -> executes main transaction.
   */
  const executeWithApprovalIfNeeded = useCallback(
    async (
      mainActionFn: () => Promise<`0x${string}`>,
      approveFn: () => Promise<`0x${string}`>,
      opts: ExecuteWithApprovalOptions,
    ): Promise<`0x${string}`> => {
      const {
        assetAddress,
        spenderAddress,
        requiredAmount,
        stepName = 'Executing Operation',
        approvalStepName = 'Approve ERC20 Token',
      } = opts;

      // 1. Check Allowance if details provided
      if (assetAddress && spenderAddress && requiredAmount && userAddress && publicClient) {
        startNewAttempt('Checking ERC20 Allowance', 'Verifying token approval balance...');

        const allowanceCheck = await checkERC20Allowance({
          publicClient,
          userAddress,
          assetAddress,
          spenderAddress,
          requiredAmount,
        });

        setProgressState((prev) => ({
          ...prev,
          allowanceChecked: true,
          allowanceRequired: requiredAmount,
          allowanceCurrent: allowanceCheck.currentAllowance,
          allowanceSkipped: allowanceCheck.isSufficient,
        }));

        if (allowanceCheck.isSufficient) {
          // Allowance is ALREADY sufficient! Skip approval popup directly.
          return executeTransaction(mainActionFn, {
            ...opts,
            stepName,
            stepDescription: `Allowance sufficient. Executing ${stepName}...`,
          });
        }

        // 2. Allowance is INSUFFICIENT: Execute approval first
        const approvalTxHash = await executeTransaction(approveFn, {
          stepName: approvalStepName,
          stepDescription: `Approve token spending for contract (${spenderAddress.slice(0, 6)}...${spenderAddress.slice(-4)})`,
        });

        // Wait for approval confirmation before proceeding to main operation
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approvalTxHash });
        }
      }

      // 3. Execute main action
      return executeTransaction(mainActionFn, {
        ...opts,
        stepName,
      });
    },
    [userAddress, publicClient, startNewAttempt, executeTransaction],
  );

  /**
   * Mobile Open Wallet Helper
   */
  const openMobileWallet = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Check WalletConnect / Mobile Deep Link
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      // Standard deep link attempt
      const walletUri =
        (connector as any)?.getPeerMeta?.()?.icons?.[0] ||
        (window as any).ethereum?.isMetaMask
          ? 'https://metamask.app.link/dapp/' + window.location.host
          : undefined;

      if (walletUri) {
        window.location.href = walletUri;
      }
    }
  }, [connector]);

  /**
   * Retries the last failed/timed-out execution with a new attempt ID.
   */
  const retryLastTransaction = useCallback(async () => {
    if (lastExecutionRef.current) {
      return lastExecutionRef.current();
    }
  }, []);

  return {
    progressState,
    executeTransaction,
    executeWithApprovalIfNeeded,
    resetTransactionState: resetState,
    retryLastTransaction,
    openMobileWallet,
    clearTimer,
  };
}
