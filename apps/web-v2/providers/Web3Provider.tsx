'use client';

import React from 'react';
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { base, baseSepolia } from 'viem/chains';
import { http, fallback } from 'viem';
import {
  createSafeWagmiStorage,
  setupIndexedDBGuard,
  setupWalletConnectGuard,
} from '../lib/utils/storageFallback';
import { installProviderInterceptors } from '../lib/utils/providerInterceptor';
import '@rainbow-me/rainbowkit/styles.css';

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '146781145b65a1c63ffcd7d6eaf03bd1';

const walletConnectRelayUrl =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL || 'wss://relay.walletconnect.org';

const sepoliaPrimaryRpc =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.BASE_SEPOLIA_RPC_URL ||
  'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';

const sepoliaFallbackRpc =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA_FALLBACK || 'https://sepolia.base.org';

const mainnetPrimaryRpc =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET ||
  process.env.BASE_MAINNET_RPC_URL ||
  'https://mainnet.base.org';

const config = getDefaultConfig({
  appName: 'UnifyVault',
  projectId: walletConnectProjectId,
  chains: [base, baseSepolia],
  walletConnectParameters: {
    relayUrl: walletConnectRelayUrl,
    logger: 'silent',
  },
  transports: {
    [base.id]: fallback([
      http(mainnetPrimaryRpc, {
        batch: true,
        retryCount: 3,
        retryDelay: 1000,
      }),
      http('https://mainnet.base.org', {
        batch: true,
      }),
    ]),
    [baseSepolia.id]: fallback([
      http(sepoliaPrimaryRpc, {
        batch: true,
        retryCount: 2,
        retryDelay: 800,
      }),
      http(sepoliaFallbackRpc, {
        batch: true,
        retryCount: 2,
        retryDelay: 800,
      }),
      http('https://base-sepolia-rpc.publicnode.com', {
        batch: true,
      }),
    ]),
  },
  storage: createSafeWagmiStorage(),
  ssr: true,
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000, // 15s cache freshness to eliminate redundant RPC requests
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
        refetchOnWindowFocus: false, // Prevent RPC refetch storm on window focus
        refetchOnMount: false, // Share cached data on mount if fresh
        refetchOnReconnect: false,
        retry: 2, // Graceful retry on rate limits
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

function DynamicRainbowKitProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const rkTheme = React.useMemo(() => {
    const isDark = !mounted || resolvedTheme === 'dark';
    const themeOptions = {
      accentColor: 'hsl(250, 89%, 60%)',
      accentColorForeground: 'white',
      borderRadius: 'medium' as const,
      overlayBlur: 'small' as const,
    };
    return isDark ? darkTheme(themeOptions) : lightTheme(themeOptions);
  }, [mounted, resolvedTheme]);

  return <RainbowKitProvider theme={rkTheme}>{children}</RainbowKitProvider>;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  React.useEffect(() => {
    setupIndexedDBGuard();
    setupWalletConnectGuard();
    // Install EIP-1193 provider interceptors to log outgoing transactions
    // This MUST run early so it proxies window.ethereum / window.safepalProvider
    // before wagmi/viem uses them for eth_sendTransaction.
    installProviderInterceptors();

    // SafePal detection: if the injected provider is SafePal, advise using
    // WalletConnect instead.  SafePal's injected EVM provider uses a
    // proprietary RPC backend that does not honor dApp-provided nonces.
    // WalletConnect bypasses this and delegates nonce management correctly.
    // This does NOT affect MetaMask or any other injected wallet.
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        ethereum?: { isSafePal?: boolean; isMetaMask?: boolean };
        safepalProvider?: unknown;
      };
      if (win.safepalProvider || win.ethereum?.isSafePal) {
        console.info(
          '%c[UnifyVault] %cSafePal detected.%c\n' +
            '  For best results, use the %cWalletConnect%c option in the wallet connection modal.\n' +
            '  The injected SafePal provider does not honor dApp-provided nonces\n' +
            '  and uses a proprietary RPC backend.  WalletConnect handles this correctly.\n' +
            '  See docs/safepal-nonce-investigation.md for details.',
          'color: #f59e0b; font-weight: bold;',
          'color: #ef4444; font-weight: bold;',
          'color: inherit;',
          'color: #3b82f6; font-weight: bold;',
          'color: inherit;',
        );
      }
    }
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DynamicRainbowKitProvider>{children}</DynamicRainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
