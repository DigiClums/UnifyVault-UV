'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { Address, Hash } from 'viem';
import { createSimpleAccount, getSponsoredSmartAccountClient } from '../lib/smartAccount/client';
import { buildGaslessDepositCalls } from '../lib/smartAccount/deposit';
import { buildGaslessRedeemCalls } from '../lib/smartAccount/redeem';
import {
  buildSmartAccountTransferCall,
  SmartAccountTransferParams,
} from '../lib/smartAccount/transfer';
import { isGaslessSponsorshipEnabled } from '../lib/smartAccount/config';
import {
  GaslessDepositParams,
  GaslessRedeemParams,
  SmartAccountCall,
} from '../lib/smartAccount/types';

export type SmartAccountActionStatus =
  | 'idle'
  | 'initializing'
  | 'preparing_calls'
  | 'estimating_gas'
  | 'requesting_sponsorship'
  | 'awaiting_signature'
  | 'submitting_user_op'
  | 'confirming'
  | 'success'
  | 'error';

export function useSmartAccount() {
  const { address: eoaAddress, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [isAccountLoading, setIsAccountLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<SmartAccountActionStatus>('idle');
  const [lastUserOpHash, setLastUserOpHash] = useState<Hash | null>(null);
  const [lastTxHash, setLastTxHash] = useState<Hash | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGaslessSupported = useMemo(() => {
    return isConnected && chainId === baseSepolia.id && isGaslessSponsorshipEnabled(chainId);
  }, [isConnected, chainId]);

  // Derive deterministic Smart Account address
  useEffect(() => {
    let cancelled = false;

    async function loadSmartAccount() {
      if (!walletClient || !publicClient || !eoaAddress) {
        setSmartAccountAddress(null);
        return;
      }

      try {
        setIsAccountLoading(true);
        const account = await createSimpleAccount({
          owner: walletClient,
          publicClient,
        });

        if (!cancelled) {
          setSmartAccountAddress(account.address);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[useSmartAccount] Failed to derive Smart Account:', err);
          setError(err?.message || 'Failed to initialize Smart Account');
        }
      } finally {
        if (!cancelled) {
          setIsAccountLoading(false);
        }
      }
    }

    loadSmartAccount();

    return () => {
      cancelled = true;
    };
  }, [walletClient, publicClient, eoaAddress]);

  /**
   * Executes a sponsored gasless deposit (batched USDC approve + Controller deposit)
   */
  const depositGasless = useCallback(
    async (params: GaslessDepositParams): Promise<{ userOpHash?: Hash; txHash?: Hash }> => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected. Connect an EOA wallet first.');
      }

      setError(null);
      setStatus('preparing_calls');

      try {
        const calls = buildGaslessDepositCalls(params);

        setStatus('requesting_sponsorship');
        const smartAccountClient = await getSponsoredSmartAccountClient({
          owner: walletClient,
          publicClient,
          chainId: chainId || baseSepolia.id,
        });

        setStatus('awaiting_signature');
        const userOpHash = await smartAccountClient.sendUserOperation({
          calls: calls.map((c) => ({
            to: c.to,
            value: c.value || 0n,
            data: c.data,
          })),
        });

        setLastUserOpHash(userOpHash);
        setStatus('submitting_user_op');

        setStatus('confirming');
        const receipt = await smartAccountClient.waitForUserOperationReceipt({
          hash: userOpHash,
        });

        setLastTxHash(receipt.receipt.transactionHash);
        setStatus('success');

        return {
          userOpHash,
          txHash: receipt.receipt.transactionHash,
        };
      } catch (err: any) {
        console.error('[useSmartAccount] Gasless deposit failed:', err);
        const errorMsg = err?.message || 'Gasless deposit execution failed.';
        setError(errorMsg);
        setStatus('error');
        throw err;
      }
    },
    [walletClient, publicClient, chainId],
  );

  /**
   * Executes a sponsored gasless redeem (Controller redeem)
   */
  const redeemGasless = useCallback(
    async (params: GaslessRedeemParams): Promise<{ userOpHash?: Hash; txHash?: Hash }> => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected. Connect an EOA wallet first.');
      }

      setError(null);
      setStatus('preparing_calls');

      try {
        const calls = buildGaslessRedeemCalls(params);

        setStatus('requesting_sponsorship');
        const smartAccountClient = await getSponsoredSmartAccountClient({
          owner: walletClient,
          publicClient,
          chainId: chainId || baseSepolia.id,
        });

        setStatus('awaiting_signature');
        const userOpHash = await smartAccountClient.sendUserOperation({
          calls: calls.map((c) => ({
            to: c.to,
            value: c.value || 0n,
            data: c.data,
          })),
        });

        setLastUserOpHash(userOpHash);
        setStatus('submitting_user_op');

        setStatus('confirming');
        const receipt = await smartAccountClient.waitForUserOperationReceipt({
          hash: userOpHash,
        });

        setLastTxHash(receipt.receipt.transactionHash);
        setStatus('success');

        return {
          userOpHash,
          txHash: receipt.receipt.transactionHash,
        };
      } catch (err: any) {
        console.error('[useSmartAccount] Gasless redeem failed:', err);
        const errorMsg = err?.message || 'Gasless redeem execution failed.';
        setError(errorMsg);
        setStatus('error');
        throw err;
      }
    },
    [walletClient, publicClient, chainId],
  );

  /**
   * Executes a sponsored gasless UVBE token transfer (UVBE.transfer)
   */
  const transferGasless = useCallback(
    async (params: SmartAccountTransferParams): Promise<{ userOpHash?: Hash; txHash?: Hash }> => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected. Connect an EOA wallet first.');
      }

      setError(null);
      setStatus('preparing_calls');

      try {
        const call = buildSmartAccountTransferCall(params);

        setStatus('requesting_sponsorship');
        const smartAccountClient = await getSponsoredSmartAccountClient({
          owner: walletClient,
          publicClient,
          chainId: chainId || baseSepolia.id,
        });

        setStatus('awaiting_signature');
        const userOpHash = await smartAccountClient.sendUserOperation({
          calls: [
            {
              to: call.to,
              value: call.value || 0n,
              data: call.data,
            },
          ],
        });

        setLastUserOpHash(userOpHash);
        setStatus('submitting_user_op');

        setStatus('confirming');
        const receipt = await smartAccountClient.waitForUserOperationReceipt({
          hash: userOpHash,
        });

        setLastTxHash(receipt.receipt.transactionHash);
        setStatus('success');

        return {
          userOpHash,
          txHash: receipt.receipt.transactionHash,
        };
      } catch (err: any) {
        console.error('[useSmartAccount] Gasless transfer failed:', err);
        const errorMsg = err?.message || 'Gasless transfer execution failed.';
        setError(errorMsg);
        setStatus('error');
        throw err;
      }
    },
    [walletClient, publicClient, chainId],
  );

  /**
   * Executes a sponsored gasless P2P Escrow action (single call or 2-call batch)
   */
  const executeGaslessP2PAction = useCallback(
    async (
      callsInput: SmartAccountCall | SmartAccountCall[],
    ): Promise<{ userOpHash?: Hash; txHash?: Hash }> => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected. Connect an EOA wallet first.');
      }

      const calls = Array.isArray(callsInput) ? callsInput : [callsInput];

      setError(null);
      setStatus('preparing_calls');

      try {
        setStatus('requesting_sponsorship');
        const smartAccountClient = await getSponsoredSmartAccountClient({
          owner: walletClient,
          publicClient,
          chainId: chainId || baseSepolia.id,
        });

        setStatus('awaiting_signature');
        const userOpHash = await smartAccountClient.sendUserOperation({
          calls: calls.map((c) => ({
            to: c.to,
            value: c.value || 0n,
            data: c.data,
          })),
        });

        setLastUserOpHash(userOpHash);
        setStatus('submitting_user_op');

        setStatus('confirming');
        const receipt = await smartAccountClient.waitForUserOperationReceipt({
          hash: userOpHash,
        });

        setLastTxHash(receipt.receipt.transactionHash);
        setStatus('success');

        return {
          userOpHash,
          txHash: receipt.receipt.transactionHash,
        };
      } catch (err: any) {
        console.error('[useSmartAccount] Gasless P2P action failed:', err);
        const errorMsg = err?.message || 'Gasless P2P execution failed.';
        setError(errorMsg);
        setStatus('error');
        throw err;
      }
    },
    [walletClient, publicClient, chainId],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setLastUserOpHash(null);
    setLastTxHash(null);
    setError(null);
  }, []);

  return {
    eoaAddress,
    smartAccountAddress,
    isAccountLoading,
    isGaslessSupported,
    status,
    lastUserOpHash,
    lastTxHash,
    error,
    reset,
    depositGasless,
    redeemGasless,
    transferGasless,
    executeGaslessP2PAction,
  };
}
