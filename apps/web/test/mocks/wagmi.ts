export const mockAccount = {
  address: '0x1234567890123456789012345678901234567890' as const,
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  status: 'connected' as const,
};

export const mockChain = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
  },
};
