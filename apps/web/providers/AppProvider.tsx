'use client';

import * as React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { Web3Provider } from './Web3Provider';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <Web3Provider>{children}</Web3Provider>
    </ThemeProvider>
  );
}
