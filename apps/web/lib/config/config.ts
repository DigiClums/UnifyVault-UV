import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rabbyWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { SUPPORTED_CHAINS } from './chains';
import { env } from './env';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Supported Wallets',
      wallets: [metaMaskWallet, rabbyWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'UnifyVault',
    projectId: env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: SUPPORTED_CHAINS,
  ssr: true,
  transports: {
    [SUPPORTED_CHAINS[0].id]: http(env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET),
    [SUPPORTED_CHAINS[1].id]: http(env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA),
  },
});
