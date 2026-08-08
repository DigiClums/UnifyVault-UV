'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWatchAsset, useWalletClient } from 'wagmi';
import { getExplorerBaseUrl } from '../constants';
import { baseSepolia } from 'viem/chains';

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

/**
 * Resolves the active EVM wallet provider prioritizing:
 * 1. Active Wagmi connector provider (e.g. WalletConnect on Android Chrome or active DApp connection)
 * 2. SafePal injected provider (window.safepalProvider or window.ethereum.isSafePal when active)
 * 3. EIP-6963 multi-injected provider array
 * 4. Desktop injected window.ethereum
 */
async function resolveWalletProvider(connector: any): Promise<{ provider: any; source: string }> {
  // 1. FIRST: Check active Wagmi connector provider (e.g. WalletConnect / RainbowKit active session)
  if (connector?.getProvider) {
    try {
      const connProvider = await connector.getProvider();
      if (connProvider) {
        if (
          typeof window !== 'undefined' &&
          ((window as any).safepalProvider || connProvider.isSafePal)
        ) {
          return {
            provider: (window as any).safepalProvider || connProvider,
            source: 'safepalProvider:connected',
          };
        }
        return { provider: connProvider, source: `connector:${connector.id || connector.name}` };
      }
    } catch {
      // Fallback
    }
  }

  // 2. SECOND: Check SafePal injected provider in SafePal DApp Browser / webview
  if (typeof window !== 'undefined') {
    const win = window as any;

    if (win.safepalProvider) {
      return { provider: win.safepalProvider, source: 'safepalProvider:injected' };
    }
    if (win.ethereum && win.ethereum.isSafePal) {
      return { provider: win.ethereum, source: 'ethereum.isSafePal' };
    }
    if (Array.isArray(win.ethereum?.providers)) {
      const sp = win.ethereum.providers.find((p: any) => p.isSafePal);
      if (sp) {
        return { provider: sp, source: 'ethereum.providers.isSafePal' };
      }
    }
  }

  // 3. TERTIARY: Standard EIP-6963 / window.ethereum fallback for desktop extensions
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    const win = window as any;
    if (Array.isArray(win.ethereum.providers) && win.ethereum.providers.length > 0) {
      const target =
        win.ethereum.providers.find((p: any) => p.isMetaMask || p.isRabby || p.isSafePal) ||
        win.ethereum.providers[0];
      return { provider: target, source: 'ethereum.providers' };
    }
    return { provider: win.ethereum, source: 'window.ethereum' };
  }

  return { provider: null, source: 'none' };
}

export function useAddTokenToWallet(): UseAddTokenResult {
  const { connector, chain, isConnected, address: accountAddress } = useAccount();
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

      // Explicit Network Validation BEFORE calling wallet_watchAsset
      // Target chain MUST be Base Sepolia (Chain ID 84532)
      const requiredChainId = baseSepolia.id;
      if (chain?.id && chain.id !== requiredChainId) {
        setStatus('unsupported');
        setErrorMessage(
          'Please switch your wallet network to Base Sepolia (Chain ID 84532) before importing UVBTCETH.',
        );
        return false;
      }

      setStatus('pending');
      setErrorMessage(null);

      // Resolve active EIP-1193 provider corresponding to connected wallet
      const { provider: activeProvider, source: providerSource } =
        await resolveWalletProvider(connector);

      // Dev-only diagnostic logging with actual connected account & provider source
      if (process.env.NODE_ENV === 'development') {
        console.debug('[UV] wallet provider', {
          source: providerSource,
          account: accountAddress,
          chainId: chain?.id,
          hasWatchAsset: typeof activeProvider?.request === 'function',
        });
      }

      // Standard EIP-747 Payload Options (strictly address, symbol, decimals, image)
      const watchOptions: {
        address: `0x${string}`;
        symbol: string;
        decimals: number;
        image?: string;
      } = {
        address,
        symbol,
        decimals,
        ...(image ? { image } : {}),
      };

      // 1. Dispatch via Resolved Active Provider (SafePal / WalletConnect / Injected)
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
            setErrorMessage('SafePal did not add the token. You can import it manually.');
            return false;
          }
        } catch (err: unknown) {
          const errObj = err as any;
          const msg = errObj?.message || String(err);
          const code = errObj?.code;

          if (process.env.NODE_ENV === 'development') {
            console.debug('[UV] Active provider error:', code, msg);
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

      // 2. Viem walletClient fallback
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

      // 3. Wagmi useWatchAsset fallback
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
    [walletClient, connector, chain?.id, isConnected, accountAddress, watchAssetAsync],
  );

  return {
    status,
    errorMessage,
    explorerUrl: explorerBaseUrl,
    addToken,
    reset,
  };
}
