'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ThemeToggle } from './ThemeToggle';
import {
  Menu,
  X,
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  History,
  LineChart,
  ShieldCheck,
  HeartPulse,
  Settings,
  BookOpen,
  ShieldAlert,
  ChevronDown,
  Globe,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/deposit', label: 'Deposit', icon: ArrowDownLeft },
    { href: '/redeem', label: 'Redeem', icon: ArrowUpRight },
    { href: '/portfolio', label: 'Portfolio', icon: PieChart },
    { href: '/analytics', label: 'Analytics', icon: LineChart },
    { href: '/history', label: 'History', icon: History },
    { href: '/admin', label: 'Admin', icon: ShieldAlert },
  ];

  const secondaryNavLinks = [
    { href: '/governance', label: 'Governance', icon: ShieldCheck },
    { href: '/health', label: 'Health', icon: HeartPulse },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: 'https://docs.unifyvault.xyz', label: 'Documentation', icon: BookOpen, external: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/90 dark:bg-[#090d16]/95 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2 sm:gap-3 shrink min-w-0"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 shrink-0">
            <span className="font-extrabold text-primary-foreground text-base sm:text-xl">UV</span>
          </div>
          <span className="font-bold text-foreground text-base sm:text-xl tracking-tight truncate">
            UnifyVault{' '}
            <span className="text-primary text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              V2
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              pathname &&
              (pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 min-h-[44px] inline-flex items-center rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet Connection Trigger, Theme Toggle & Mobile Menu Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <ThemeToggle />

          <div className="scale-90 sm:scale-100 origin-right min-h-[44px] flex items-center shrink">
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
                    className="flex items-center gap-2"
                  >
                    {/* Network Select Button */}
                    <button
                      onClick={openChainModal}
                      type="button"
                      aria-label="Select Network"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/80 hover:bg-accent text-xs font-semibold text-foreground transition-all shrink-0 cursor-pointer shadow-sm"
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
                        <Globe className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>{chain?.name || 'Select Network'}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>

                    {/* Connect / Account Button */}
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all cursor-pointer"
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
                            className="px-3.5 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold transition-all cursor-pointer"
                          >
                            Wrong Network
                          </button>
                        );
                      }

                      return (
                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/80 hover:bg-accent text-xs font-semibold text-foreground transition-all cursor-pointer shadow-sm"
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
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            className="md:hidden flex items-center justify-center p-2.5 min-h-[44px] min-w-[44px] shrink-0 rounded-xl border border-border bg-secondary/80 text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Inline Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 dark:bg-[#090d16]/98 backdrop-blur-xl px-4 py-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
            {/* Primary Mobile Navigation */}
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-2 mb-2">
                Primary Navigation
              </div>
              <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
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
                      className={`flex items-center gap-3 px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary/20 text-primary border border-primary/40 font-semibold shadow-sm'
                          : 'text-foreground hover:bg-accent/60'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Secondary Protocol Tools */}
            <div className="border-t border-border pt-3">
              <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-2 mb-2">
                Protocol Tools
              </div>
              <div className="flex flex-col gap-1">
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
                        className="flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
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
                      className={`flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span>{link.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="border-t border-border pt-3 flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground font-medium">Theme Mode</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
