'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Table2, LineChart, SlidersHorizontal, Layers } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function OptionsMobileNav() {
  const pathname = usePathname();

  const navTabs = [
    { href: '/options', label: 'Overview', icon: LayoutDashboard },
    { href: '/options/chain', label: 'Chain', icon: Table2 },
    { href: '/options/chart', label: 'Chart', icon: LineChart },
    { href: '/options/trade', label: 'Trade', icon: SlidersHorizontal },
    { href: '/options/positions', label: 'Positions', icon: Layers },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-background/95 backdrop-blur-md border-t-2 border-black dark:border-white/10 px-2 py-1.5 shadow-lg">
      <div className="grid grid-cols-5 gap-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-mono font-bold transition-all min-h-[44px]',
                isActive
                  ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
