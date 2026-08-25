import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../providers/ThemeProvider';
import { Web3Provider } from '../providers/Web3Provider';
import { AppShell } from '../components/layout/AppShell';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

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

async function getShellMode(): Promise<'landing' | 'app' | 'admin' | 'docs'> {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const hostname = host.split(':')[0] || '';

    if (hostname === 'docs.unifyvault.xyz') return 'docs';
    if (hostname === 'v2.unifyvault.xyz') return 'admin';
    if (hostname === 'unifyvault.xyz' || hostname === 'www.unifyvault.xyz') return 'landing';
    // app.unifyvault.xyz and localhost both default to app mode
    return 'app';
  } catch {
    // headers() throws during build/static generation — default to app
    return 'app';
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shellMode = await getShellMode();

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
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Web3Provider>
            <AppShell shellMode={shellMode}>{children}</AppShell>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
