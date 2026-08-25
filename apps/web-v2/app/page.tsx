'use client';

import React, { useEffect, useState } from 'react';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { StrategySection } from '../components/landing/StrategySection';
import { TreasurySection } from '../components/landing/TreasurySection';
import { AppCTASection } from '../components/landing/AppCTASection';
import { WalletHomeDashboard } from '../components/dashboard/WalletHomeDashboard';
import { useDashboard } from '../hooks/useDashboard';

export default function RootHomePage() {
  const metrics = useDashboard();
  const [isAppMode, setIsAppMode] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // If user accesses marketing domains unifyvault.xyz / www.unifyvault.xyz, show landing
      if (hostname === 'unifyvault.xyz' || hostname === 'www.unifyvault.xyz') {
        setIsAppMode(false);
      } else {
        // APK / localhost / app.unifyvault.xyz directly renders WalletHomeDashboard
        setIsAppMode(true);
      }
    }
  }, []);

  if (isAppMode) {
    return <WalletHomeDashboard metrics={metrics} networkName="Base Mainnet" />;
  }

  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <StrategySection />
      <TreasurySection />
      <AppCTASection />
    </div>
  );
}
