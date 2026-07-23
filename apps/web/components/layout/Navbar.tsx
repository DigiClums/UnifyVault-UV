'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbowme/rainbowkit';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/deposit', label: 'Deposit' },
    { href: '/redeem', label: 'Redeem' },
    { href: '/portfolio', label: 'Portfolio' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-[#090d16]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30">
            <span className="font-extrabold text-white text-xl">UV</span>
          </div>
          <span className="font-bold text-white text-xl tracking-tight">
            UnifyVault{' '}
            <span className="text-blue-500 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              V2
            </span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet Connection Trigger */}
        <div className="flex items-center gap-3">
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
