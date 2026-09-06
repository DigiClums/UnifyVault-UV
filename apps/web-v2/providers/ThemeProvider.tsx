'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { StatusBar, Style } from '@capacitor/status-bar';

function StatusBarSync() {
  const { theme, resolvedTheme } = useTheme();

  // 1. Dynamic System Mode Listener for real-time OS preference changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncThemeForOS = (isDark: boolean) => {
      if (theme === 'system') {
        const resolved = isDark ? 'dark' : 'light';
        const root = document.documentElement;

        if (resolved === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
          root.style.colorScheme = 'light';
        }

        // Synchronize Android Native Status Bar
        if ((window as any).AndroidNativeUpdater?.setStatusBarTheme) {
          try {
            (window as any).AndroidNativeUpdater.setStatusBarTheme(resolved);
          } catch (e) {
            console.error('Failed to set native status bar theme on OS change:', e);
          }
        }

        // Synchronize Capacitor Status Bar
        try {
          StatusBar.setStyle({ style: resolved === 'light' ? Style.Light : Style.Dark }).catch(
            () => {},
          );
        } catch (e) {}
      }
    };

    let mediaQuery: MediaQueryList | null = null;
    let mqlListener: ((e: MediaQueryListEvent) => void) | null = null;

    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      mqlListener = (e: MediaQueryListEvent) => {
        syncThemeForOS(e.matches);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', mqlListener);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(mqlListener);
      }
    }

    const handleCustomOsThemeChange = () => {
      const isDark = window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
      syncThemeForOS(isDark);
    };

    window.addEventListener('os-theme-change', handleCustomOsThemeChange);

    return () => {
      if (mediaQuery && mqlListener) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', mqlListener);
        } else if ((mediaQuery as any).removeListener) {
          (mediaQuery as any).removeListener(mqlListener);
        }
      }
      window.removeEventListener('os-theme-change', handleCustomOsThemeChange);
    };
  }, [theme]);

  // 2. Synchronize Status Bar with resolvedTheme whenever theme/resolvedTheme changes
  React.useEffect(() => {
    if (!resolvedTheme) return;

    // A. Android Native Updater Interface (if injected)
    if (typeof window !== 'undefined' && (window as any).AndroidNativeUpdater?.setStatusBarTheme) {
      try {
        (window as any).AndroidNativeUpdater.setStatusBarTheme(resolvedTheme);
      } catch (e) {
        console.error('Failed to set native status bar theme:', e);
      }
    }

    // B. Capacitor StatusBar plugin fallback / sync
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
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      disableTransitionOnChange={false}
      {...props}
    >
      <StatusBarSync />
      {children}
    </NextThemesProvider>
  );
}
