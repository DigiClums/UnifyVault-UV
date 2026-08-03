'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="w-11 h-11 rounded-xl bg-secondary/60 border border-border animate-pulse" />
    );
  }

  const isSystem = theme === 'system';

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="p-2.5 rounded-xl bg-secondary/80 hover:bg-accent border border-border text-foreground transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center min-h-[44px] min-w-[44px] shadow-sm active:scale-95 group"
        aria-label="Toggle Theme"
        title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode${isSystem ? ' (System Active)' : ''}`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </button>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="ml-1 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 focus:outline-none transition-colors"
        aria-label="Theme options menu"
        title="More theme options (Light, Dark, System)"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-border bg-card shadow-lg backdrop-blur-md p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => {
              setTheme('light');
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
              theme === 'light' ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-secondary/80'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Light</span>
          </button>
          <button
            onClick={() => {
              setTheme('dark');
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
              theme === 'dark' ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-secondary/80'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => {
              setTheme('system');
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
              theme === 'system' ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-secondary/80'
            }`}
          >
            <Monitor className="w-4 h-4 text-emerald-400" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
}

