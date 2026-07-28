'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { FALLBACK_ADDRESSES } from '../../constants';
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
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();

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

  const envAdmin = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
  const isEnvAdmin = !!(address && envAdmin && address.toLowerCase() === envAdmin);
  const isAdmin = isConnected && ((isAdminRole as boolean) || isEnvAdmin);

  const baseNavLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/deposit', label: 'Deposit', icon: ArrowDownRight },
    { href: '/redeem', label: 'Redeem', icon: ArrowUpRight },
    { href: '/portfolio', label: 'Portfolio', icon: PieChart },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/treasury', label: 'Treasury', icon: Vault },
    { href: '/transactions', label: 'Activity', icon: History },
  ];

  // Task 5: Only include Admin link if connected wallet possesses admin role
  const navLinks = isAdmin
    ? [...baseNavLinks, { href: '/admin', label: 'Admin', icon: ShieldAlert, isAdmin: true }]
    : baseNavLinks;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border-subtle/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-blue via-indigo-500 to-accent-cyan p-0.5 shadow-glow flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent-blue" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-accent-blue tracking-tight">
                UnifyVault
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                V2 Suite
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
              Base Sepolia
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 bg-surface/60 p-1.5 rounded-xl border border-border-subtle/80 backdrop-blur-md">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 relative',
                  isActive
                    ? 'bg-accent-blue text-white shadow-glow after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:bg-white/80 after:rounded-full'
                    : link.isAdmin
                      ? 'text-purple-400 hover:text-white hover:bg-purple-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-card/60',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Connect Button & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
