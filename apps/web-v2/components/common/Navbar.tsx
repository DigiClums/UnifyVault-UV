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
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../../lib/utils/cn';

export function Navbar() {
  const pathname = usePathname();

  interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
  }

  const navLinks: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/p2p', label: 'P2P', icon: ShieldCheck },
    { href: '/deposit', label: 'Deposit', icon: ArrowDownRight },
    { href: '/transfer', label: 'Transfer', icon: Send },
    { href: '/portfolio', label: 'Portfolio', icon: PieChart },
    { href: '/transactions', label: 'Activity', icon: History },
    { href: '/redeem', label: 'Redeem', icon: ArrowUpRight },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/treasury', label: 'Treasury', icon: Vault },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 border-b-2 border-black dark:border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-[150px] sm:w-[175px] group"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#BFFF00] border-2 border-black p-0.5 shadow-[2px_2px_0_#000] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-black dark:text-[#BFFF00]" />
            </div>
          </div>

          <div className="min-w-0 leading-none">
            <div className="text-[15px] sm:text-[17px] font-black tracking-tight text-foreground whitespace-nowrap">
              UnifyVault
            </div>
            <div className="mt-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
              V2 Suite
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden lg:flex items-center space-x-1 bg-black dark:bg-[#151515] p-1 rounded-xl border-2 border-black dark:border-white/10"
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
                  'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-[#BFFF00] text-black shadow-[3px_3px_0_#000] font-bold'
                    : 'text-white/70 hover:text-black dark:hover:text-white hover:bg-[#BFFF00] hover:font-bold',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Connect Button & Theme Toggle */}
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
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-card-hover border-2 border-black dark:border-white/15 text-xs font-semibold text-foreground transition-all shrink-0 cursor-pointer shadow-sm hover:border-[#BFFF00]/40"
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
                        <Globe className="w-3.5 h-3.5 text-black dark:text-[#BFFF00]" />
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
                            className="px-3.5 py-1.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-bold border-2 border-black shadow-[3px_3px_0_#000] transition-all shrink-0 cursor-pointer"
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
                          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-card hover:bg-card-hover border-2 border-black dark:border-white/15 text-xs font-semibold text-foreground transition-all shrink-0 cursor-pointer shadow-sm"
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
        </div>
      </div>
    </header>
  );
}
