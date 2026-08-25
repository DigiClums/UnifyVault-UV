'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ShieldCheck,
  Home,
  ArrowDownRight,
  ArrowUpRight,
  PieChart,
  BarChart3,
  Vault,
  History,
  ChevronDown,
  Globe,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../../lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navLinks: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/predict', label: 'Flash 30s', icon: Zap },
  { href: '/staking', label: 'Staking', icon: Sparkles },
  { href: '/p2p', label: 'P2P', icon: ShieldCheck },
  { href: '/deposit', label: 'Deposit', icon: ArrowDownRight },
  { href: '/transfer', label: 'Transfer', icon: Send },
  { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  { href: '/transactions', label: 'Activity', icon: History },
  { href: '/redeem', label: 'Redeem', icon: ArrowUpRight },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/treasury', label: 'Treasury', icon: Vault },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background/95 border-b-2 border-black dark:border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-1 sm:gap-3">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 group">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-transparent flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 overflow-hidden">
            <img
              src="/branding/uvbe-logo.svg"
              alt="UnifyVault UVBE"
              width={36}
              height={36}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/branding/uvbe-token-logo.png';
              }}
            />
          </div>

          <div className="min-w-0 leading-none">
            <div className="text-[13px] sm:text-[16px] font-black tracking-tight text-foreground whitespace-nowrap">
              UnifyVault
            </div>
            <div className="hidden min-[380px]:block mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
              V2 Suite
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links (Visible on xl+ screens >= 1280px) */}
        <nav
          aria-label="Main Navigation"
          className="hidden xl:flex items-center space-x-0.5 2xl:space-x-1 bg-slate-100 dark:bg-[#151515] p-1 rounded-xl border-2 border-black dark:border-white/10 shrink-0 shadow-[2px_2px_0_rgba(0,0,0,0.85)] dark:shadow-none"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname &&
              (link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center space-x-1 px-1.5 2xl:px-2.5 py-1.5 rounded-lg text-[11px] 2xl:text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000] font-bold border border-black'
                    : 'text-foreground/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-[#BFFF00] hover:text-black hover:font-bold',
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Connect Button & Theme Toggle */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <ThemeToggle />

          <div className="scale-95 sm:scale-100 origin-right flex items-center shrink-0">
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
                    className="flex items-center space-x-1 sm:space-x-1.5"
                  >
                    {/* Network Select Button */}
                    <button
                      onClick={openChainModal}
                      type="button"
                      aria-label="Select Network"
                      className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2.5 py-1 rounded-xl bg-card hover:bg-card-hover border-2 border-black dark:border-white/15 text-xs font-semibold text-foreground transition-all shrink-0 cursor-pointer shadow-sm hover:border-[#BFFF00]/40 min-h-[36px] sm:min-h-[38px]"
                    >
                      {chain?.hasIcon ? (
                        <div
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full overflow-hidden shrink-0"
                          style={{ background: chain.iconBackground }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              className="w-full h-full"
                            />
                          )}
                        </div>
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-black dark:text-[#BFFF00] shrink-0" />
                      )}
                      <span className="hidden md:inline">{chain?.name || 'Select Network'}</span>
                      <span className="hidden min-[380px]:inline md:hidden font-mono text-[10px] sm:text-[11px] max-w-[48px] sm:max-w-[65px] truncate">
                        {chain?.name
                          ? chain.name === 'Base Sepolia'
                            ? 'Base'
                            : chain.name
                          : 'Network'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                    </button>

                    {/* Connect Wallet / Wallet Account Button */}
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="px-2 sm:px-3 py-1 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-bold border-2 border-black shadow-[3px_3px_0_#000] transition-all shrink-0 cursor-pointer min-h-[36px] sm:min-h-[38px] flex items-center justify-center whitespace-nowrap"
                          >
                            <span className="hidden sm:inline">Connect Wallet</span>
                            <span className="sm:hidden">Connect</span>
                          </button>
                        );
                      }

                      if (chain?.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="px-2 sm:px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer min-h-[36px] sm:min-h-[38px]"
                          >
                            Wrong Net
                          </button>
                        );
                      }

                      return (
                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="flex items-center space-x-1.5 px-2 sm:px-3 py-1 rounded-xl bg-card hover:bg-card-hover border-2 border-black dark:border-white/15 text-xs font-semibold text-foreground transition-all shrink-0 cursor-pointer shadow-sm min-h-[36px] sm:min-h-[38px]"
                        >
                          <span className="max-w-[70px] sm:max-w-none truncate">
                            {account.displayName}
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
}
