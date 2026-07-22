export const mockConnectedWalletState = {
  address: '0x1234567890123456789012345678901234567890' as const,
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  status: 'connected' as const,
  chain: {
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
};

export const mockDisconnectedWalletState = {
  address: undefined,
  isConnected: false,
  isConnecting: false,
  isDisconnected: true,
  status: 'disconnected' as const,
  chain: undefined,
};

export const mockWrongNetworkState = {
  address: '0x1234567890123456789012345678901234567890' as const,
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  status: 'connected' as const,
  chain: {
    id: 1,
    name: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
};
