'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAccount, useReconnect, useSwitchChain, useChainId } from 'wagmi';
import { baseSepolia } from 'viem/chains';

export function useMobileWalletResume() {
  const { address, isConnected, isConnecting, isReconnecting, chain } = useAccount();
  const currentChainId = useChainId();
  const { reconnect } = useReconnect();
  const { switchChain } = useSwitchChain();

  const [isMobile, setIsMobile] = useState(false);
  const [walletOpened, setWalletOpened] = useState(false);
  const [lastFocusTime, setLastFocusTime] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mobileCheck = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
      setIsMobile(mobileCheck);
    }
  }, []);

  // Function to force re-check and rehydrate wagmi wallet connection
  const checkConnection = useCallback(async () => {
    try {
      if (reconnect) {
        await reconnect();
      }
    } catch {
      // Ignore background rehydration errors
    }
  }, [reconnect]);

  // Handle visibility change and window focus when mobile user returns from wallet app
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResume = () => {
      const now = Date.now();
      setLastFocusTime(now);

      // Re-trigger wagmi reconnect on mobile tab resume if disconnected or connecting
      if (!isConnected || isConnecting || isReconnecting) {
        checkConnection();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [isConnected, isConnecting, isReconnecting, checkConnection]);

  // Detect wrong network
  const isWrongNetwork = isConnected && currentChainId !== baseSepolia.id;

  const switchToBaseSepolia = useCallback(async () => {
    if (switchChain) {
      try {
        await switchChain({ chainId: baseSepolia.id });
      } catch {
        // Fallback for wallet refusal
      }
    }
  }, [switchChain]);

  return {
    isMobile,
    address,
    isConnected,
    isConnecting: isConnecting || isReconnecting,
    chainId: currentChainId,
    chainName: chain?.name || (currentChainId === baseSepolia.id ? 'Base Sepolia' : 'Unknown'),
    isWrongNetwork,
    walletOpened,
    setWalletOpened,
    lastFocusTime,
    checkConnection,
    switchToBaseSepolia,
  };
}
