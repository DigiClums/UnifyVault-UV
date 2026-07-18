import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProvider } from '../providers/AppProvider';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { WrongNetworkBanner } from '../components/web3/WrongNetworkBanner';
import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UnifyVault | Multi-Asset L2 Yield Protocol',
  description:
    'Secure, optimized multi-asset yield optimization protocol on Base Mainnet. Deposit crypto collateral to earn blended yields.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground antialiased`}
      >
        <AppProvider>
          <Navbar />
          <WrongNetworkBanner />
          <div className="flex-1 flex flex-col">{children}</div>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
