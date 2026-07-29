'use client';

import React from 'react';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { CHAIN_CONFIG } from '../constants';
import { createSafeWagmiStorage, setupIndexedDBGuard } from '../lib/utils/storageFallback';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'UnifyVault V2',
  projectId:
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '146781145b65a1c63ffcd7d6eaf03bd1',
  chains: [CHAIN_CONFIG],
  storage: createSafeWagmiStorage(),
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 10_000,
      staleTime: 5_000,
    },
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    setupIndexedDBGuard();
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#3B82F6',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
