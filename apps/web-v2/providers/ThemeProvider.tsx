'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { StatusBar, Style } from '@capacitor/status-bar';

function StatusBarSync() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (!resolvedTheme) return;

    // 1. Android Native Updater Interface (if injected)
    if (typeof window !== 'undefined' && (window as any).AndroidNativeUpdater?.setStatusBarTheme) {
      try {
        (window as any).AndroidNativeUpdater.setStatusBarTheme(resolvedTheme);
      } catch (e) {
        console.error('Failed to set native status bar theme:', e);
      }
    }

    // 2. Capacitor StatusBar plugin fallback / sync
    try {
      if (resolvedTheme === 'light') {
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      } else {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      }
    } catch (e) {
      // Capacitor might not be initialized in web browser mode
    }
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} {...props}>
      <StatusBarSync />
      {children}
    </NextThemesProvider>
  );
}
