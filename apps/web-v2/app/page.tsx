'use client';

import React from 'react';
import { HeroSection } from '../components/landing/HeroSection';
import { ProductPreview } from '../components/landing/ProductPreview';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { StrategySection } from '../components/landing/StrategySection';
import { TreasurySection } from '../components/landing/TreasurySection';
import { AppCTASection } from '../components/landing/AppCTASection';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ProductPreview />
      <FeaturesSection />
      <StrategySection />
      <TreasurySection />
      <AppCTASection />
    </div>
  );
}
