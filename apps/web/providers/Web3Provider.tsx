'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';
import { wagmiConfig } from '../lib/config/config';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false, // Prevent background RPC refetch spam on window focus
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

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DynamicRainbowKitProvider>{children}</DynamicRainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
