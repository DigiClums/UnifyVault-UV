'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Vault,
  Users,
  History,
  Activity,
  RefreshCw,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/treasury', label: 'Treasury & Revenue', icon: Vault },
    { href: '/admin/users', label: 'User Accounting', icon: Users },
    { href: '/admin/transactions', label: 'Live Activity', icon: History },
    { href: '/admin/oracle', label: 'Oracle Manager', icon: Activity },
    { href: '/admin/rebalance', label: 'Strategy Rebalance', icon: RefreshCw },
    { href: '/admin/monitoring', label: 'System Monitoring', icon: Activity },
    { href: '/admin/settings', label: 'Protocol Settings', icon: Settings },
  ];

  return (
    <aside className="w-full lg:w-64 bg-surface/90 border border-border-subtle rounded-2xl p-4 space-y-6 backdrop-blur-xl">
      <div className="flex items-center space-x-3 px-2 pb-4 border-b border-border-subtle/50">
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Admin Console</h3>
          <span className="text-[10px] text-purple-400 font-mono font-semibold">
            Governance Role
          </span>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                isActive
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'text-slate-400 hover:text-white hover:bg-card/50',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] text-purple-300 space-y-1">
        <p className="font-bold">Security Enforcement</p>
        <p className="text-[10px] text-slate-400 leading-normal">
          All state-mutating actions require an authorized admin wallet transaction.
        </p>
      </div>
    </aside>
  );
}
