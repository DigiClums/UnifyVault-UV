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

      // Safety timeout for mobile browsers where RPC promises might stall when switching apps
      const timeoutId = setTimeout(() => {
        setStatus((current) => {
          if (current === 'pending') {
            setErrorMessage(
              'Request timed out or wallet app didn’t respond. You can copy the contract address manually below.',
            );
            return 'unsupported';
          }
          return current;
        });
      }, 10000);

      // 1. Direct window.ethereum check FIRST (Primary for Mobile Wallet In-App Browsers like MetaMask Mobile / Trust Wallet)
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
          clearTimeout(timeoutId);
          if (added) {
            setStatus('success');
            return true;
          } else {
            setStatus('rejected');
            setErrorMessage('Token addition request was cancelled in your wallet.');
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
            clearTimeout(timeoutId);
            setStatus('rejected');
            setErrorMessage('Token addition request was cancelled in your wallet.');
            return false;
          }
        }
      }

      // 2. Wagmi watchAssetAsync fallback (Primary for WalletConnect / Web3 Connectors)
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
          clearTimeout(timeoutId);
          if (success) {
            setStatus('success');
            return true;
          }
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
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

      clearTimeout(timeoutId);
      setStatus('unsupported');
      setErrorMessage(
        'Your mobile browser or wallet connector does not support automatic token import. Copy the contract address below to import manually.',
      );
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
