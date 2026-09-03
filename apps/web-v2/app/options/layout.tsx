import React from 'react';
import { OptionsProtocolProvider } from '../../hooks/useOptionsProtocol';
import { OptionsHeader } from '../../components/options/OptionsHeader';
import { OptionsMobileNav } from '../../components/options/OptionsMobileNav';

export default function OptionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <OptionsProtocolProvider>
      <div className="max-w-7xl mx-auto space-y-4 px-2 sm:px-4 pb-20 sm:pb-8 pt-2">
        <OptionsHeader />
        {children}
        <OptionsMobileNav />
      </div>
    </OptionsProtocolProvider>
  );
}
