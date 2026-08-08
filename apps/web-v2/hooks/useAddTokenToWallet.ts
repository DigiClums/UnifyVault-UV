'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWatchAsset } from 'wagmi';
import { getExplorerBaseUrl } from '../constants';

export interface AddTokenOptions {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  image?: string;
}

export type TokenAddStatus = 'idle' | 'pending' | 'success' | 'rejected' | 'unsupported';

export interface UseAddTokenResult {
  status: TokenAddStatus;
  errorMessage: string | null;
  explorerUrl: string;
  addToken: (options: AddTokenOptions) => Promise<boolean>;
  reset: () => void;
}

export function useAddTokenToWallet(): UseAddTokenResult {
  const { connector, chain } = useAccount();
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

      setStatus('pending');
      setErrorMessage(null);

      // Dev-only diagnostic logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[UVBTCETH Token Add] Connector:', connector?.name, connector?.id);
        console.log('[UVBTCETH Token Add] Chain ID:', chain?.id);
      }

      // 1. Obtain active provider directly from connected Wagmi connector (EIP-1193)
      let provider: any = null;
      try {
        if (connector?.getProvider) {
          provider = await connector.getProvider();
        }
      } catch {
        // Fallback to window.ethereum if connector getProvider fails
      }

      if (!provider && typeof window !== 'undefined' && window.ethereum) {
        provider = window.ethereum;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[UVBTCETH Token Add] Active Provider available:',
          Boolean(provider),
          Boolean(provider?.request),
        );
      }

      // 2. Call wallet_watchAsset on the active connector provider
      if (provider && typeof provider.request === 'function') {
        try {
          const res = await provider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address,
                symbol,
                decimals,
                ...(image ? { image } : {}),
              },
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
            console.log('[UVBTCETH Token Add] Provider request error:', code, msg);
          }

          // User rejected / cancelled in wallet
          if (
            code === 4001 ||
            msg.toLowerCase().includes('user rejected') ||
            msg.toLowerCase().includes('user denied') ||
            msg.toLowerCase().includes('rejected')
          ) {
            setStatus('rejected');
            setErrorMessage('Token import request was cancelled in your wallet.');
            return false;
          }

          // Method not supported on mobile provider (-32601 or Unsupported)
          if (
            code === -32601 ||
            msg.toLowerCase().includes('not supported') ||
            msg.toLowerCase().includes('unsupported') ||
            msg.toLowerCase().includes('does not support')
          ) {
            setStatus('unsupported');
            setErrorMessage("Your wallet doesn't support automatic token import.");
            return false;
          }
        }
      }

      // 3. Fallback to wagmi watchAssetAsync if direct provider request did not succeed
      try {
        if (watchAssetAsync) {
          const success = await watchAssetAsync({
            type: 'ERC20',
            options: {
              address,
              symbol,
              decimals,
              ...(image ? { image } : {}),
            },
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
          setErrorMessage('Token import request was cancelled in your wallet.');
          return false;
        }

        if (
          code === -32601 ||
          msg.toLowerCase().includes('not supported') ||
          msg.toLowerCase().includes('unsupported')
        ) {
          setStatus('unsupported');
          setErrorMessage("Your wallet doesn't support automatic token import.");
          return false;
        }
      }

      // 4. Default fallback if unsupported by wallet
      setStatus('unsupported');
      setErrorMessage("Your wallet doesn't support automatic token import.");
      return false;
    },
    [connector, chain?.id, watchAssetAsync],
  );

  return {
    status,
    errorMessage,
    explorerUrl: explorerBaseUrl,
    addToken,
    reset,
  };
}
