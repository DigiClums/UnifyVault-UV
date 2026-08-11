'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
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
      <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle animate-pulse shrink-0" />
    );
  }

  const isSystem = theme === 'system';

  return (
    <div className="relative inline-flex items-center shrink-0" ref={menuRef}>
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="p-2.5 rounded-xl bg-surface hover:bg-card border border-border-subtle text-foreground transition-all duration-300 focus:outline-none focus:ring-0 flex items-center justify-center min-h-[44px] min-w-[44px] shadow-sm active:scale-95 group"
        aria-label="Toggle Theme"
        title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode${isSystem ? ' (System Active)' : ''}`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-500 transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </button>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="ml-1 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface focus:outline-none transition-colors"
        aria-label="Theme options menu"
        title="More theme options (Light, Dark, System)"
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-border-subtle bg-card shadow-xl backdrop-blur-md p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => {
              setTheme('light');
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
              theme === 'light'
                ? 'bg-[#BFFF00]/20 text-[#5f8f00] dark:text-[#BFFF00] font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Sun className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>Light</span>
          </button>
          <button
            onClick={() => {
              setTheme('dark');
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-[#BFFF00]/20 text-[#5f8f00] dark:text-[#BFFF00] font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Moon className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => {
              setTheme('system');
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
              theme === 'system'
                ? 'bg-[#BFFF00]/20 text-[#5f8f00] dark:text-[#BFFF00] font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Monitor className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
}
