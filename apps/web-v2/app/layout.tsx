import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '../providers/Web3Provider';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { GlobalAlertBanner } from '../components/common/GlobalAlertBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://app.unifyvault.xyz'),
  title: 'UnifyVault V2 — Decentralized BTC-ETH Index Protocol',
  description:
    'UnifyVault V2: Multi-Asset Index Strategy, Atomic Swaps, and Dynamic Cost-Basis Portfolio Accounting.',
  alternates: {
    canonical: 'https://app.unifyvault.xyz',
  },
  openGraph: {
    title: 'UnifyVault V2 — Multi-Asset Index Protocol',
    description:
      'Decentralized BTC-ETH Index Strategy with Dynamic Cost-Basis Portfolio Accounting.',
    url: 'https://app.unifyvault.xyz',
    siteName: 'UnifyVault V2',
    images: [
      {
        url: 'https://app.unifyvault.xyz/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-slate-100">
        <Web3Provider>
          <GlobalAlertBanner />
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
