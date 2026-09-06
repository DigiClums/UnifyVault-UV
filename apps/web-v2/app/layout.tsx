import React from 'react';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../providers/ThemeProvider';
import { Web3Provider } from '../providers/Web3Provider';
import { AppShell } from '../components/layout/AppShell';
import { UpdateCheckerModal } from '../components/common/UpdateCheckerModal';
import { AppExitModal } from '../components/common/AppExitModal';
import { NotificationRouteHandler } from '../components/common/NotificationRouteHandler';
import { GlobalReferralCapture } from '../components/common/GlobalReferralCapture';
import { FantasyProvider } from '../lib/fantasy/fantasyStore';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6EE' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

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
  manifest: '/branding/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/branding/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/branding/favicon.svg',
    apple: '/branding/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/branding/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/branding/apple-touch-icon.png" />
      </head>
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200 antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
          <Web3Provider>
            <FantasyProvider>
              <GlobalReferralCapture />
              <NotificationRouteHandler />
              <UpdateCheckerModal />
              <AppExitModal />
              <AppShell>{children}</AppShell>
            </FantasyProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
