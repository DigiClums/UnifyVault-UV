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
  const { chain } = useAccount();
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

      // 1. Try wagmi watchAssetAsync
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errObj = err as any;
        const msg = errObj?.message || String(err);

        if (
          errObj?.code === 4001 ||
          msg.toLowerCase().includes('user rejected') ||
          msg.toLowerCase().includes('user denied')
        ) {
          setStatus('rejected');
          setErrorMessage('Token addition request was cancelled in your wallet.');
          return false;
        }
      }

      // 2. Direct fallback to window.ethereum.request({ method: 'wallet_watchAsset' })
      if (typeof window !== 'undefined' && window.ethereum && window.ethereum.request) {
        try {
          const added = await window.ethereum.request({
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
          if (added) {
            setStatus('success');
            return true;
          } else {
            setStatus('rejected');
            setErrorMessage('Token addition cancelled by user.');
            return false;
          }
        } catch (fallbackErr: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fObj = fallbackErr as any;
          const fMsg = fObj?.message || String(fallbackErr);
          if (
            fObj?.code === 4001 ||
            fMsg.toLowerCase().includes('user rejected') ||
            fMsg.toLowerCase().includes('user denied')
          ) {
            setStatus('rejected');
            setErrorMessage('Token addition request was cancelled in your wallet.');
            return false;
          }
          setStatus('unsupported');
          setErrorMessage('Your wallet does not support automatic token import.');
          return false;
        }
      }

      setStatus('unsupported');
      setErrorMessage('Your wallet does not support automatic token import.');
      return false;
    },
    [watchAssetAsync],
  );

  return {
    status,
    errorMessage,
    explorerUrl: explorerBaseUrl,
    addToken,
    reset,
  };
}
