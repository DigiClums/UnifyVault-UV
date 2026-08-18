'use client';

import React, { useState } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sections = [
    {
      title: 'OVERVIEW',
      items: [{ href: '/admin', label: 'Console Home', icon: LayoutDashboard }],
    },
    {
      title: 'OPERATIONS',
      items: [
        { href: '/admin/custody', label: 'Custody Vault', icon: ShieldCheck },
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

  const allItems = sections.flatMap((sec) => sec.items);
  const activeItem = allItems.find((item) => item.href === pathname) || allItems[0];

  return (
    <>
      {/* ── Mobile Compact Navigation (< lg) ── */}
      <div className="lg:hidden w-full bg-surface/90 border border-border-subtle rounded-2xl p-3 space-y-2.5 backdrop-blur-xl shrink-0 shadow-sm">
        {/* Mobile Header & Expand Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">Admin Console</span>
              <span className="text-[10px] text-purple-400 font-mono font-semibold uppercase">
                {activeItem?.label || 'Governance Mode'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-all min-h-[38px] cursor-pointer"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle admin sections menu"
          >
            <span>Sections ({allItems.length})</span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
                mobileMenuOpen && 'rotate-180',
              )}
            />
          </button>
        </div>

        {/* Mobile Horizontal Quick-Nav Scroll Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 min-h-[36px] shrink-0',
                  isActive
                    ? 'bg-purple-600 text-white shadow-glow font-bold'
                    : 'bg-card/70 text-muted-foreground hover:text-foreground hover:bg-card border border-border-subtle',
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Expanded Drawer for All Categorized Sections */}
        {mobileMenuOpen && (
          <nav className="space-y-3 pt-2 border-t border-border-subtle/60 animate-in fade-in slide-in-from-top-2 duration-150">
            {sections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div className="px-2 text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                  {sec.title}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {sec.items.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px]',
                          isActive
                            ? 'bg-purple-600 text-white shadow-glow font-bold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/60',
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] text-purple-300 space-y-0.5 mt-2">
              <p className="font-bold">Security Safeguards</p>
              <p className="text-[10px] text-muted-foreground leading-normal">
                State-mutating actions require an authorized governance key signature.
              </p>
            </div>
          </nav>
        )}
      </div>

      {/* ── Desktop Sidebar (>= lg) ── */}
      <aside className="hidden lg:block w-64 bg-surface/90 border border-border-subtle rounded-2xl p-4 space-y-5 backdrop-blur-xl shrink-0">
        <div className="flex items-center space-x-3 px-2 pb-3 border-b border-border-subtle/50">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">Admin Console</h3>
            <span className="text-[10px] text-purple-400 font-mono font-semibold uppercase tracking-wider">
              Governance Mode
            </span>
          </div>
        </div>

        <nav className="space-y-4">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
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
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/50',
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
          <p className="text-[10px] text-muted-foreground leading-normal">
            State-mutating actions require an authorized governance key signature.
          </p>
        </div>
      </aside>
    </>
  );
}
