'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '../common/Navbar';
import { Footer } from '../common/Footer';
import { GlobalAlertBanner } from '../common/GlobalAlertBanner';
import { LivePriceTicker } from '../common/LivePriceTicker';
import { MobileBottomNav } from '../common/MobileBottomNav';
import { AdminHeader } from './AdminHeader';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell conditionally renders the appropriate application chrome
 * based on the current route.
 *
 * ── Admin routes (/admin/*) ──────────────────────────────────
 * Served from v2.unifyvault.xyz (via middleware rewrite).
 * Renders the AdminHeader with the admin sidebar/nav — no public
 * Navbar, Footer, or MobileBottomNav.
 *
 * ── Public routes (everything else) ──────────────────────────
 * Served from app.unifyvault.xyz.
 * Renders the full public chrome: Navbar, Footer, MobileBottomNav.
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <>
        <GlobalAlertBanner />
        <AdminHeader />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <GlobalAlertBanner />
      <LivePriceTicker />
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
        {children}
      </main>
      <MobileBottomNav />
      <div className="hidden lg:block">
        <Footer />
      </div>
    </>
  );
}
