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
import { createSafeWagmiStorage, setupIndexedDBGuard } from '../lib/utils/storageFallback';
import '@rainbow-me/rainbowkit/styles.css';

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '146781145b65a1c63ffcd7d6eaf03bd1';

const config = getDefaultConfig({
  appName: 'UnifyVault',
  projectId: walletConnectProjectId,
  chains: [base, baseSepolia],
  storage: createSafeWagmiStorage(),
  ssr: true,
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchInterval: 10_000,
        staleTime: 5_000,
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
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DynamicRainbowKitProvider>{children}</DynamicRainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
