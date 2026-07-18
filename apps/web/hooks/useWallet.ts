import { useAccount, useDisconnect, type Connector } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export interface UseWalletResult {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectorName: string;
  connector: Connector | undefined;
  connect: (() => void) | undefined;
  disconnect: () => void;
}

export function useWallet(): UseWalletResult {
  const { address, isConnected, isConnecting, isReconnecting, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isReconnecting,
    isReconnecting,
    connectorName: connector?.name || '',
    connector,
    connect: openConnectModal,
    disconnect,
  };
}
