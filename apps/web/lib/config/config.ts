import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  safepalWallet,
  rainbowWallet,
  trustWallet,
  rabbyWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { http } from 'wagmi';
import { SUPPORTED_CHAINS } from './chains';
import { env } from './env';

export const wagmiConfig = getDefaultConfig({
  appName: 'UnifyVault',
  appDescription: 'UnifyVault | Multi-Asset L2 Yield Protocol',
  appUrl: 'https://app.unifyvault.xyz',
  appIcon: 'https://app.unifyvault.xyz/favicon.ico',
  projectId: env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains: SUPPORTED_CHAINS,
  wallets: [
    {
      groupName: 'Supported Wallets',
      wallets: [
        metaMaskWallet,
        safepalWallet,
        rainbowWallet,
        trustWallet,
        rabbyWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  ssr: true,
  transports: {
    [SUPPORTED_CHAINS[0].id]: http(env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET),
    [SUPPORTED_CHAINS[1].id]: http(env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA),
  },
});

export const config = wagmiConfig;
