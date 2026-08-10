'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, BarChart3, FileText } from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      href: '/deposit',
      label: 'Deposit',
      desc: 'Add USDC & mint shares',
      icon: ArrowDownRight,
      accent:
        'bg-[#BFFF00] text-black border-2 border-black hover:bg-[#d0ff66] shadow-[3px_3px_0_#000]',
      iconBg: 'bg-black text-[#BFFF00]',
    },
    {
      href: '/redeem',
      label: 'Redeem',
      desc: 'Burn shares & receive USDC',
      icon: ArrowUpRight,
      accent:
        'bg-card text-foreground border-2 border-black dark:border-white/15 hover:border-[#BFFF00] hover:bg-[#BFFF00] hover:text-black shadow-[3px_3px_0_rgba(0,0,0,0.85)]',
      iconBg: 'bg-[#BFFF00] text-black',
    },
    {
      href: '/portfolio',
      label: 'Portfolio',
      desc: 'Holdings & analytics',
      icon: BarChart3,
      accent:
        'bg-card text-foreground border-2 border-black dark:border-white/15 hover:border-[#BFFF00] hover:bg-[#BFFF00] hover:text-black shadow-[3px_3px_0_rgba(0,0,0,0.85)]',
      iconBg: 'bg-black text-[#BFFF00]',
    },
    {
      href: '/transactions',
      label: 'Activity',
      desc: 'Transaction history',
      icon: FileText,
      accent:
        'bg-card text-foreground border-2 border-black dark:border-white/15 hover:border-[#BFFF00] hover:bg-[#BFFF00] hover:text-black shadow-[3px_3px_0_rgba(0,0,0,0.85)]',
      iconBg: 'bg-black text-[#BFFF00]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className={`group relative flex min-h-[88px] items-center gap-3 rounded-2xl border-2 px-3.5 py-3 sm:px-4 sm:py-3.5 transition-all active:scale-[0.98] ${action.accent}`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 border-2 border-black ${action.iconBg}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-foreground block leading-tight">
                {action.label}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:block leading-tight">
                {action.desc}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
