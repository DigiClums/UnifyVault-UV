'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWatchAsset, useWalletClient } from 'wagmi';
import { getExplorerBaseUrl } from '../constants';

export interface AddTokenOptions {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  image?: string;
}

export type TokenAddStatus =
  'idle' | 'pending' | 'success' | 'rejected' | 'unsupported' | 'unavailable';

export interface UseAddTokenResult {
  status: TokenAddStatus;
  errorMessage: string | null;
  explorerUrl: string;
  addToken: (options: AddTokenOptions) => Promise<boolean>;
  reset: () => void;
}

export function useAddTokenToWallet(): UseAddTokenResult {
  const { connector, chain, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);

  const [status, setStatus] = useState<TokenAddStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { watchAssetAsync } = useWatchAsset();

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  const addToken = useCallback(
    async (options: AddTokenOptions): Promise<boolean> => {
      const { address, symbol, decimals, image } = options;
      if (!address || address === '0x0000000000000000000000000000000000000000') {
        setStatus('unsupported');
        setErrorMessage('Invalid token contract address.');
        return false;
      }

      if (!isConnected) {
        setStatus('unavailable');
        setErrorMessage('Wallet connection is unavailable. Please reconnect your wallet.');
        return false;
      }

      setStatus('pending');
      setErrorMessage(null);

      // Diagnostic logging for development environment
      if (process.env.NODE_ENV === 'development') {
        console.log('[UVBTCETH Token Add] Connector:', connector?.name, connector?.id);
        console.log('[UVBTCETH Token Add] Chain ID:', chain?.id);
        console.log('[UVBTCETH Token Add] WalletClient available:', Boolean(walletClient));
      }

      const watchOptions = {
        address,
        symbol,
        decimals,
        ...(image ? { image } : {}),
      };

      // 1. Primary Path: Viem walletClient on active connected wallet
      if (walletClient && typeof walletClient.watchAsset === 'function') {
        try {
          const success = await walletClient.watchAsset({
            type: 'ERC20',
            options: watchOptions,
          });

          if (success) {
            setStatus('success');
            return true;
          } else {
            setStatus('rejected');
            setErrorMessage('Token was not added');
            return false;
          }
        } catch (err: unknown) {
          const errObj = err as any;
          const msg = errObj?.message || String(err);
          const code = errObj?.code;

          if (process.env.NODE_ENV === 'development') {
            console.log('[UVBTCETH Token Add] walletClient error:', code, msg);
          }

          if (
            code === 4001 ||
            msg.toLowerCase().includes('user rejected') ||
            msg.toLowerCase().includes('user denied') ||
            msg.toLowerCase().includes('cancelled')
          ) {
            setStatus('rejected');
            setErrorMessage('Token import was cancelled.');
            return false;
          }

          if (
            code === -32601 ||
            code === 4200 ||
            msg.toLowerCase().includes('not supported') ||
            msg.toLowerCase().includes('unsupported') ||
            msg.toLowerCase().includes('method not found')
          ) {
            setStatus('unsupported');
            setErrorMessage("This wallet doesn't support one-click token import.");
            return false;
          }
        }
      }

      // 2. Secondary Path: Connected Wagmi Connector EIP-1193 Provider
      let activeProvider: any = null;
      try {
        if (connector?.getProvider) {
          activeProvider = await connector.getProvider();
        }
      } catch {
        // Fallback
      }

      // Check window.ethereum fallback for desktop injected extension
      if (!activeProvider && typeof window !== 'undefined' && window.ethereum) {
        // Handle multiple injected providers (e.g., window.ethereum.providers)
        if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
          activeProvider =
            window.ethereum.providers.find((p: any) => p.isMetaMask || p.isRabby) ||
            window.ethereum.providers[0];
        } else {
          activeProvider = window.ethereum;
        }
      }

      if (activeProvider && typeof activeProvider.request === 'function') {
        try {
          const res = await activeProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: watchOptions,
            },
          });

          if (res === true) {
            setStatus('success');
            return true;
          } else if (res === false) {
            setStatus('rejected');
            setErrorMessage('Token was not added');
            return false;
          }
        } catch (err: unknown) {
          const errObj = err as any;
          const msg = errObj?.message || String(err);
          const code = errObj?.code;

          if (process.env.NODE_ENV === 'development') {
            console.log('[UVBTCETH Token Add] Active provider error:', code, msg);
          }

          if (
            code === 4001 ||
            msg.toLowerCase().includes('user rejected') ||
            msg.toLowerCase().includes('user denied') ||
            msg.toLowerCase().includes('cancelled')
          ) {
            setStatus('rejected');
            setErrorMessage('Token import was cancelled.');
            return false;
          }

          if (
            code === -32601 ||
            code === 4200 ||
            msg.toLowerCase().includes('not supported') ||
            msg.toLowerCase().includes('unsupported') ||
            msg.toLowerCase().includes('method not found')
          ) {
            setStatus('unsupported');
            setErrorMessage("This wallet doesn't support one-click token import.");
            return false;
          }
        }
      }

      // 3. Tertiary Path: Wagmi useWatchAsset hook
      try {
        if (watchAssetAsync) {
          const success = await watchAssetAsync({
            type: 'ERC20',
            options: watchOptions,
          });
          if (success) {
            setStatus('success');
            return true;
          }
        }
      } catch (err: unknown) {
        const errObj = err as any;
        const msg = errObj?.message || String(err);
        const code = errObj?.code;

        if (
          code === 4001 ||
          msg.toLowerCase().includes('user rejected') ||
          msg.toLowerCase().includes('user denied')
        ) {
          setStatus('rejected');
          setErrorMessage('Token import was cancelled.');
          return false;
        }

        if (
          code === -32601 ||
          code === 4200 ||
          msg.toLowerCase().includes('not supported') ||
          msg.toLowerCase().includes('unsupported')
        ) {
          setStatus('unsupported');
          setErrorMessage("This wallet doesn't support one-click token import.");
          return false;
        }
      }

      // Default fallback when automatic token import method is unavailable
      setStatus('unsupported');
      setErrorMessage("This wallet doesn't support one-click token import.");
      return false;
    },
    [walletClient, connector, chain?.id, isConnected, watchAssetAsync],
  );

  return {
    status,
    errorMessage,
    explorerUrl: explorerBaseUrl,
    addToken,
    reset,
  };
}
