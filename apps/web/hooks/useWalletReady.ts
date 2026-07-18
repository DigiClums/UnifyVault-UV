import { useAccount } from 'wagmi';
import { SUPPORTED_CHAINS } from '../lib/config/chains';

export interface UseWalletReadyResult {
  isReady: boolean;
  isConnected: boolean;
  isSupported: boolean;
}

export function useWalletReady(): UseWalletReadyResult {
  const { isConnected, chainId } = useAccount();
  const isSupported = chainId ? SUPPORTED_CHAINS.some((c) => c.id === chainId) : false;

  return {
    isReady: isConnected && isSupported,
    isConnected,
    isSupported,
  };
}
