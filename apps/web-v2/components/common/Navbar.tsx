'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { FALLBACK_ADDRESSES, ADMIN_ADDRESS } from '../../constants';
import {
  ShieldCheck,
  LayoutDashboard,
  ArrowDownRight,
  ArrowUpRight,
  PieChart,
  BarChart3,
  Vault,
  History,
  ShieldAlert,
  Menu,
  X,
  BookOpen,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../../lib/utils/cn';

const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Read admin role for Task 5 Role-Based Nav Visibility
  const { data: isAdminRole } = useReadContract({
    address: FALLBACK_ADDRESSES.TREASURY,
    abi: [
      {
        inputs: [
          { name: 'role', type: 'bytes32' },
          { name: 'account', type: 'address' },
        ],
        name: 'hasRole',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const envAdmin = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || ADMIN_ADDRESS).toLowerCase();
  const isEnvAdmin = !!(address && envAdmin && address.toLowerCase() === envAdmin);
  const isAdmin = isConnected && ((isAdminRole as boolean) || isEnvAdmin);

  interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    isAdmin?: boolean;
  }

  const baseNavLinks: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/deposit', label: 'Deposit', icon: ArrowDownRight },
    { href: '/redeem', label: 'Redeem', icon: ArrowUpRight },
    { href: '/portfolio', label: 'Portfolio', icon: PieChart },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/treasury', label: 'Treasury', icon: Vault },
    { href: '/transactions', label: 'Activity', icon: History },
  ];

  const secondaryNavLinks = [
    { href: '/treasury', label: 'Governance', icon: ShieldCheck },
    { href: 'https://docs.unifyvault.xyz', label: 'Documentation', icon: BookOpen, external: true },
  ];

  // Task 5: Only include Admin link if connected wallet possesses admin role
  const navLinks: NavItem[] = isAdmin
    ? [...baseNavLinks, { href: '/admin', label: 'Admin', icon: ShieldAlert, isAdmin: true }]
    : baseNavLinks;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border-subtle/80 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center space-x-2 sm:space-x-3 group shrink min-w-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-accent-blue via-indigo-500 to-accent-cyan p-0.5 shadow-glow flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-accent-blue" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-base sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 dark:from-white via-slate-700 dark:via-slate-200 to-accent-blue tracking-tight truncate">
                UnifyVault
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shrink-0">
                V2 Suite
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono tracking-wider hidden sm:block">
              Base Sepolia
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden lg:flex items-center space-x-1 bg-surface/60 p-1.5 rounded-xl border border-border-subtle/80 backdrop-blur-md"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname &&
              (pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 relative',
                  isActive
                    ? 'bg-accent-blue text-white shadow-glow after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:bg-white/80 after:rounded-full'
                    : link.isAdmin
                      ? 'text-purple-600 dark:text-purple-400 hover:text-foreground hover:bg-purple-500/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/60',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Connect Button, Theme Toggle & Mobile Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <ThemeToggle />

          <div className="scale-90 sm:scale-100 origin-right flex items-center shrink">
            <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="full" />
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface border border-border-subtle text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all shrink-0"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-accent-blue" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Inline Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border-subtle/80 bg-background/95 backdrop-blur-xl px-4 py-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
            {/* Primary Mobile Navigation */}
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-2 mb-2">
                Navigation Menu
              </div>
              <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1.5">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    pathname &&
                    (pathname === link.href ||
                      (link.href !== '/' && pathname.startsWith(link.href)));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px]',
                        isActive
                          ? 'bg-accent-blue text-white shadow-glow'
                          : link.isAdmin
                            ? 'text-purple-600 dark:text-purple-400 hover:text-foreground bg-purple-500/10'
                            : 'text-muted-foreground hover:text-foreground bg-surface/60 hover:bg-card/60',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Secondary Resources & Tools */}
            {secondaryNavLinks && secondaryNavLinks.length > 0 && (
              <div className="border-t border-border-subtle/80 pt-3">
                <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-2 mb-2">
                  Resources & Tools
                </div>
                <div className="flex flex-col space-y-1.5">
                  {secondaryNavLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname && pathname === link.href;
                    if (link.external) {
                      return (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-surface/60 hover:bg-card/60 transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span>{link.label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">↗</span>
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all',
                          isActive
                            ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                            : 'text-muted-foreground hover:text-foreground bg-surface/60 hover:bg-card/60',
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{link.label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">→</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drawer Actions */}
            <div className="border-t border-border-subtle/80 pt-3 flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground font-medium">Theme Mode</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
