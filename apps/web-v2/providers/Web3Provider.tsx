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
import { createSafeWagmiStorage, setupIndexedDBGuard } from '../lib/utils/storageFallback';
import '@rainbow-me/rainbowkit/styles.css';

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '146781145b65a1c63ffcd7d6eaf03bd1';

const sepoliaPrimaryRpc =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.BASE_SEPOLIA_RPC_URL ||
  'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';

const mainnetPrimaryRpc =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET ||
  process.env.BASE_MAINNET_RPC_URL ||
  'https://mainnet.base.org';

const config = getDefaultConfig({
  appName: 'UnifyVault V2',
  appDescription: 'Multi-asset index tracking & portfolio vault engine',
  appUrl: 'https://app.unifyvault.xyz',
  appIcon: 'https://app.unifyvault.xyz/favicon.ico',
  projectId: walletConnectProjectId,
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: fallback([
      http(sepoliaPrimaryRpc, {
        batch: true,
        retryCount: 3,
        retryDelay: 1000,
      }),
      http('https://sepolia.base.org', {
        batch: true,
      }),
    ]),
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
  },
  storage: createSafeWagmiStorage(),
  ssr: true,
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000, // 15s cache freshness
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
        refetchOnWindowFocus: true, // Re-sync on window focus when returning from mobile wallet app
        refetchOnMount: true,
        refetchOnReconnect: true, // Re-sync on wallet session reconnect
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

  return (
    <RainbowKitProvider theme={rkTheme} initialChain={baseSepolia}>
      {children}
    </RainbowKitProvider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  React.useEffect(() => {
    setupIndexedDBGuard();
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DynamicRainbowKitProvider>{children}</DynamicRainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
