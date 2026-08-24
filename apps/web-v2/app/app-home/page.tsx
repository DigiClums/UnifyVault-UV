'use client';

import { useAccount } from 'wagmi';
import { useDashboard } from '../../hooks/useDashboard';
import { WalletHomeDashboard } from '../../components/dashboard/WalletHomeDashboard';
import { getDefaultChainId } from '../../constants';
import { base } from 'viem/chains';

export default function AppHomePage() {
  const metrics = useDashboard();
  return <WalletHomeDashboard metrics={metrics} networkName="Base Mainnet" />;
}
