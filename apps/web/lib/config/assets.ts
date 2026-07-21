export interface Asset {
  symbol: string;
  name: string;
  decimals: number;
  address: `0x${string}`;
  iconUrl?: string;
}

export const SUPPORTED_ASSETS: Record<number, Asset[]> = {
  8453: [
    // Base Mainnet
    {
      symbol: 'cbBTC',
      name: 'Coinbase Wrapped BTC',
      decimals: 8,
      address: '0xcbB7C66D6425AFE9A8804f7a6621967e50c6020' as const,
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      address: '0x4200000000000000000000000000000000000006' as const,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
    },
  ],
  84532: [
    // Base Sepolia
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
    },
  ],
};
