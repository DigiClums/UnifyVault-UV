'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowDownRight,
  PieChart,
  History,
  Ellipsis,
  ArrowUpRight,
  BarChart3,
  Vault,
  FileCode,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const mainItems: NavItem[] = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/deposit', label: 'Deposit', icon: ArrowDownRight },
  { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  { href: '/transactions', label: 'Activity', icon: History },
];

const moreItems: NavItem[] = [
  { href: '/redeem', label: 'Redeem', icon: ArrowUpRight },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/treasury', label: 'Treasury', icon: Vault },
  { href: '/contracts', label: 'Contracts', icon: FileCode },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close more sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  // Close on Escape
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [moreOpen]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    // Root path requires exact match to prevent matching everything
    if (href === '/') return pathname === '/';
    // All other paths: exact match OR pathname starts with href followed by / or end
    return pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href + '?');
  };

  const isMoreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-14 px-1 max-w-lg mx-auto">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center min-w-0 flex-1 py-1 px-1 rounded-lg transition-colors min-h-[44px]',
                  active ? 'text-accent-blue' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 mb-0.5',
                    active && 'drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]',
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] font-semibold leading-none',
                    active && 'text-accent-blue',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              'flex flex-col items-center justify-center min-w-0 flex-1 py-1 px-1 rounded-lg transition-colors min-h-[44px] cursor-pointer',
              moreOpen || isMoreActive ? 'text-accent-blue' : 'text-slate-500 hover:text-slate-300',
            )}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
          >
            {moreOpen ? (
              <X className="w-5 h-5 mb-0.5" strokeWidth={2.5} />
            ) : (
              <Ellipsis
                className={cn(
                  'w-5 h-5 mb-0.5',
                  isMoreActive && 'drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]',
                )}
                strokeWidth={isMoreActive ? 2.5 : 2}
              />
            )}
            <span
              className={cn(
                'text-[10px] font-semibold leading-none',
                (moreOpen || isMoreActive) && 'text-accent-blue',
              )}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More Sheet Overlay */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300" />
      )}

      {/* More Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800/80 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out',
          moreOpen ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}
      >
        {/* Sheet handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="px-4 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3 px-1">
            More
          </p>
          <div className="grid grid-cols-2 gap-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px]',
                    active
                      ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50',
                  )}
                >
                  <Icon className={cn('w-4 h-4', active && 'text-accent-blue')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spacer for content above bottom nav */}
      <div
        className="lg:hidden h-14"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      />
    </>
  );
}
