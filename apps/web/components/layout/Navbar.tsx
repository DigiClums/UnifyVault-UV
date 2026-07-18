'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Landmark } from 'lucide-react';
import { Container } from './Container';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils/cn';
import dynamic from 'next/dynamic';

const WalletButton = dynamic(() => import('../web3/WalletButton').then((mod) => mod.WalletButton), {
  ssr: false,
  loading: () => <div className="w-32 h-10 rounded-lg bg-secondary animate-pulse" />,
});

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Deposit', href: '/deposit' },
  { label: 'Redeem', href: '/redeem' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Settings', href: '/settings' },
];

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/75 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-foreground hover:opacity-90 transition-opacity"
          >
            <Landmark className="w-5 h-5 text-primary" />
            <span>UnifyVault</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-foreground',
                  pathname === item.href
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <WalletButton />
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg bg-secondary hover:bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Toggle Mobile Menu"
            >
              {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-accent',
                    pathname === item.href
                      ? 'bg-secondary text-foreground font-semibold'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Connect Wallet</span>
              <WalletButton />
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
