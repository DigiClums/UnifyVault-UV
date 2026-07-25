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
      <div className="w-11 h-11 rounded-lg bg-gray-900/80 border border-gray-800 animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 dark:bg-secondary dark:hover:bg-accent border border-gray-800 dark:border-border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center min-h-[44px] min-w-[44px]"
      aria-label="Toggle Theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-400 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
