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
        'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    {
      href: '/redeem',
      label: 'Redeem',
      desc: 'Burn shares & receive USDC',
      icon: ArrowUpRight,
      accent:
        'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      href: '/portfolio',
      label: 'Portfolio',
      desc: 'Holdings & analytics',
      icon: BarChart3,
      accent:
        'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20 hover:border-violet-500/40',
      iconBg: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
    },
    {
      href: '/transactions',
      label: 'Activity',
      desc: 'Transaction history',
      icon: FileText,
      accent:
        'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20 hover:border-slate-500/40',
      iconBg: 'bg-slate-200 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400',
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
            className={`group relative flex items-center space-x-2 rounded-xl border px-2.5 py-2 sm:px-4 sm:py-3 transition-all active:scale-[0.98] ${action.accent}`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${action.iconBg}`}>
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
