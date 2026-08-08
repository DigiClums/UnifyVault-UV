'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { DEFAULT_ADMIN_ROLE } from '../../constants';
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
  ChevronDown,
  Globe,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../../lib/utils/cn';
import { useAdminAccess } from '../../hooks/useAdminAccess';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { chain } = useAccount();
  const { isAdmin } = useAdminAccess();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    { href: '/admin', label: 'Admin', icon: ShieldAlert, isAdmin: true },
  ];

  const secondaryNavLinks = [
    { href: '/treasury', label: 'Governance', icon: ShieldCheck },
    { href: 'https://docs.unifyvault.xyz', label: 'Documentation', icon: BookOpen, external: true },
  ];

  const navLinks: NavItem[] = baseNavLinks.filter((link) => !link.isAdmin || isAdmin);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border-subtle/80 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center space-x-2 sm:space-x-2.5 group shrink min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-accent-blue via-indigo-500 to-accent-cyan p-0.5 shadow-sm flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-accent-blue" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 dark:from-white via-slate-700 dark:via-slate-200 to-accent-blue tracking-tight truncate">
                UnifyVault
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shrink-0 font-mono">
                V2 Suite
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden lg:flex items-center space-x-1 bg-slate-900/70 p-1 rounded-xl border border-slate-800/80 backdrop-blur-md"
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
                  'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-accent-blue text-white shadow-xs font-bold'
                    : link.isAdmin
                      ? 'text-purple-400 hover:text-white hover:bg-purple-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
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
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                    className="flex items-center space-x-2"
                  >
                    {/* Network Select Button */}
                    <button
                      onClick={openChainModal}
                      type="button"
                      aria-label="Select Network"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface/80 hover:bg-card border border-border-subtle/80 text-xs font-semibold text-foreground transition-all shrink-0 cursor-pointer shadow-sm hover:border-accent-blue/40"
                    >
                      {chain?.hasIcon ? (
                        <div
                          className="w-4 h-4 rounded-full overflow-hidden shrink-0"
                          style={{ background: chain.iconBackground }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              className="w-4 h-4"
                            />
                          )}
                        </div>
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-accent-blue" />
                      )}
                      <span>{chain?.name || 'Select Network'}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>

                    {/* Connect Wallet / Wallet Account Button */}
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="px-3.5 py-1.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-semibold shadow-glow transition-all shrink-0 cursor-pointer"
                          >
                            Connect Wallet
                          </button>
                        );
                      }

                      if (chain?.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer"
                          >
                            Wrong Network
                          </button>
                        );
                      }

                      return (
                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface/80 hover:bg-card border border-border-subtle/80 text-xs font-semibold text-foreground transition-all shrink-0 cursor-pointer shadow-sm"
                        >
                          <span>{account.displayName}</span>
                        </button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
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
