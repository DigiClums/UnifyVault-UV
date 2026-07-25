'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-11 h-11 rounded-xl bg-secondary/60 border border-border animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2.5 rounded-xl bg-secondary/80 hover:bg-accent border border-border text-foreground transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center min-h-[44px] min-w-[44px] shadow-sm active:scale-95"
      aria-label="Toggle Theme"
      title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
