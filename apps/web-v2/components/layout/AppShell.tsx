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
import { UpdateCheckerModal } from '../common/UpdateCheckerModal';
import { MaintenanceGuard } from '../common/MaintenanceGuard';

interface AppShellProps {
  children: React.ReactNode;
  shellMode?: 'landing' | 'app' | 'admin' | 'docs';
}

export function AppShell({ children, shellMode: initialShellMode }: AppShellProps) {
  const [shellMode, setShellMode] = React.useState<'landing' | 'app' | 'admin' | 'docs'>(
    initialShellMode || 'app',
  );

  React.useEffect(() => {
    if (typeof window !== 'undefined' && !initialShellMode) {
      const hostname = window.location.hostname;
      if (hostname === 'docs.unifyvault.xyz') {
        setShellMode('docs');
      } else if (hostname === 'v2.unifyvault.xyz') {
        setShellMode('admin');
      } else if (hostname === 'unifyvault.xyz' || hostname === 'www.unifyvault.xyz') {
        setShellMode('landing');
      } else {
        setShellMode('app');
      }
    }
  }, [initialShellMode]);

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
        <div className="sticky top-0 z-50 bg-background pt-[env(safe-area-inset-top,0px)]">
          <GlobalAlertBanner />
          <AdminHeader />
        </div>
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
          {children}
        </main>
      </>
    );
  }

  if (shellMode === 'landing') {
    return (
      <>
        <div className="sticky top-0 z-50 bg-black pt-[env(safe-area-inset-top,0px)]">
          <GlobalAlertBanner />
          <LandingHeader />
        </div>
        <main className="flex-1">{children}</main>
        <LandingFooter />
      </>
    );
  }

  // shellMode === 'app'
  return (
    <MaintenanceGuard>
      <UpdateCheckerModal />
      <div className="sticky top-0 z-50 bg-background pt-[env(safe-area-inset-top,0px)]">
        <GlobalAlertBanner />
        <LivePriceTicker />
        <Navbar />
      </div>
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
        {children}
      </main>
      <MobileBottomNav />
      <div className="hidden lg:block">
        <Footer />
      </div>
    </MaintenanceGuard>
  );
}
