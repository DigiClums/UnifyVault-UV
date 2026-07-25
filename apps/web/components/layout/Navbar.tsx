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
  ShieldCheck,
  HeartPulse,
  Settings,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/deposit', label: 'Deposit', icon: ArrowDownLeft },
    { href: '/redeem', label: 'Redeem', icon: ArrowUpRight },
    { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  ];

  const secondaryNavLinks = [
    { href: '/governance', label: 'Governance', icon: ShieldCheck },
    { href: '/health', label: 'Health', icon: HeartPulse },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#090d16]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 sm:gap-3 shrink-0"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30">
            <span className="font-extrabold text-white text-lg sm:text-xl">UV</span>
          </div>
          <span className="font-bold text-white text-lg sm:text-xl tracking-tight">
            UnifyVault{' '}
            <span className="text-blue-400 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              V2
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2.5 min-h-[44px] inline-flex items-center rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet Connection Trigger, Theme Toggle & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <div className="scale-90 sm:scale-100 origin-right min-h-[44px] flex items-center">
            <ConnectButton chainStatus="icon" showBalance={false} />
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            className="md:hidden flex items-center justify-center p-2.5 min-h-[44px] min-w-[44px] rounded-lg border border-gray-800 bg-gray-900/80 text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-blue-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-800/80 bg-[#090d16]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase px-2 pt-1">
            Primary Navigation
          </div>
          <nav aria-label="Mobile Navigation" className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold shadow-md shadow-blue-500/10'
                      : 'bg-gray-900/50 border border-gray-800/60 text-gray-300 hover:text-white hover:bg-gray-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-800/80 pt-3">
            <div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase px-2 mb-2">
              Protocol Tools
            </div>
            <div className="flex flex-col gap-1.5">
              {secondaryNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span>{link.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">→</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
