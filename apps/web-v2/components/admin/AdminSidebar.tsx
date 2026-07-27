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
  Server,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function AdminSidebar() {
  const pathname = usePathname();

  const sections = [
    {
      title: 'OVERVIEW',
      items: [{ href: '/admin', label: 'Console Home', icon: LayoutDashboard }],
    },
    {
      title: 'OPERATIONS',
      items: [
        { href: '/admin/treasury', label: 'Treasury & Revenue', icon: Vault },
        { href: '/admin/users', label: 'User Accounting', icon: Users },
        { href: '/admin/transactions', label: 'Live Activity', icon: History },
      ],
    },
    {
      title: 'PROTOCOL',
      items: [
        { href: '/admin/oracle', label: 'Oracle Manager', icon: Activity },
        { href: '/admin/rebalance', label: 'Strategy Rebalance', icon: RefreshCw },
        { href: '/admin/monitoring', label: 'System Monitoring', icon: Server },
      ],
    },
    {
      title: 'CONFIGURATION',
      items: [{ href: '/admin/settings', label: 'Protocol Settings', icon: Settings }],
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-surface/90 border border-border-subtle rounded-2xl p-4 space-y-5 backdrop-blur-xl shrink-0">
      <div className="flex items-center space-x-3 px-2 pb-3 border-b border-border-subtle/50">
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Admin Console</h3>
          <span className="text-[10px] text-purple-400 font-mono font-semibold uppercase tracking-wider">
            Governance Mode
          </span>
        </div>
      </div>

      <nav className="space-y-4">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
              {sec.title}
            </div>
            {sec.items.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[38px]',
                    isActive
                      ? 'bg-purple-600 text-white shadow-glow font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-card/50',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] text-purple-300 space-y-1">
        <p className="font-bold">Security Safeguards</p>
        <p className="text-[10px] text-slate-400 leading-normal">
          State-mutating actions require an authorized governance key signature.
        </p>
      </div>
    </aside>
  );
}
