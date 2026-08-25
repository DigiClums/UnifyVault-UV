'use client';

import React from 'react';
import { Navbar } from '../common/Navbar';
import { Footer } from '../common/Footer';
import { GlobalAlertBanner } from '../common/GlobalAlertBanner';
import { LivePriceTicker } from '../common/LivePriceTicker';
import { MobileBottomNav } from '../common/MobileBottomNav';
import { AdminHeader } from './AdminHeader';
import { LandingHeader } from '../landing/LandingHeader';
import { LandingFooter } from '../landing/LandingFooter';

import { DocsLayout } from '../docs/DocsLayout';

interface AppShellProps {
  children: React.ReactNode;
  shellMode: 'landing' | 'app' | 'admin' | 'docs';
}

/**
 * AppShell conditionally renders the appropriate application chrome
 * based on the host-determined shellMode passed from the root layout.
 *
 * ── docs ──────────────────────────────────────────────────────
 * docs.unifyvault.xyz protocol documentation.
 * Renders DocsLayout with left navigation sidebar and table of contents.
 *
 * ── landing ───────────────────────────────────────────────────
 * unifyvault.xyz marketing hero site.
 * Renders LandingHeader + LandingFooter.
 * No LivePriceTicker, Navbar, MobileBottomNav, or app Footer.
 *
 * ── admin ─────────────────────────────────────────────────────
 * v2.unifyvault.xyz admin application.
 * Renders the AdminHeader with admin sidebar.
 * No public Navbar, Footer, or MobileBottomNav.
 *
 * ── app ───────────────────────────────────────────────────────
 * app.unifyvault.xyz DeFi application.
 * Renders the full public chrome: Navbar, Footer, MobileBottomNav.
 */
export function AppShell({ children, shellMode }: AppShellProps) {
  if (shellMode === 'docs') {
    return (
      <>
        <GlobalAlertBanner />
        <DocsLayout>{children}</DocsLayout>
      </>
    );
  }

  if (shellMode === 'admin') {
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

  if (shellMode === 'landing') {
    return (
      <>
        <GlobalAlertBanner />
        <LandingHeader />
        <main className="flex-1">{children}</main>
        <LandingFooter />
      </>
    );
  }

  // shellMode === 'app'
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
