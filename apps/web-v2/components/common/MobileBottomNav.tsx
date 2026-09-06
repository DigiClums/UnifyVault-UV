'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, PieChart, Zap, Coins, Send, Settings } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const defaultNavTabs: NavItem[] = [
  { href: '/', label: 'Home', icon: Wallet },
  { href: '/portfolio', label: 'Vault', icon: PieChart },
  { href: '/staking', label: 'Stake', icon: Zap },
  { href: '/p2p', label: 'P2P', icon: Coins },
  { href: '/transfer', label: 'Transfer', icon: Send },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const native = Boolean(
        (window as any).AndroidNativeUpdater ||
        ((window as any).Capacitor &&
          typeof (window as any).Capacitor.isNativePlatform === 'function' &&
          (window as any).Capacitor.isNativePlatform()),
      );
      setIsNative(native);
    }
  }, []);

  const navTabs: NavItem[] = React.useMemo(() => {
    if (isNative) {
      return [
        { href: '/', label: 'Home', icon: Wallet },
        { href: '/staking', label: 'Stake', icon: Zap },
        { href: '/p2p', label: 'P2P', icon: Coins },
        { href: '/transfer', label: 'Send', icon: Send },
        { href: '/settings', label: 'Settings', icon: Settings },
      ];
    }
    return defaultNavTabs;
  }, [isNative]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') {
      return pathname === '/' || pathname === '/app-home';
    }
    return pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href + '?');
  };

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-black/95 backdrop-blur-2xl border-t-2 border-black dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
          {navTabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 min-h-[48px]',
                  active ? 'text-black font-bold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {/* Active Tab Accent Background Pill */}
                {active && (
                  <span className="absolute inset-x-2 inset-y-1 bg-[#BFFF00] rounded-xl -z-10 border border-black shadow-[2px_2px_0_#000] dark:shadow-none" />
                )}

                <Icon
                  className={cn(
                    'w-5 h-5 mb-0.5 transition-transform duration-150',
                    active ? 'text-black scale-110' : 'text-muted-foreground',
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] tracking-tight leading-none',
                    active ? 'text-black font-black' : 'font-semibold',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for content above bottom nav */}
      <div
        className="xl:hidden w-full pointer-events-none"
        style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        aria-hidden="true"
      />
    </>
  );
}
