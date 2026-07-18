import { useAccount, useSwitchChain } from 'wagmi';
import { SUPPORTED_CHAINS } from '../lib/config/chains';
import { type Chain } from 'viem';
import { parseWalletError } from '../lib/utils/formatters';

export interface UseNetworkResult {
  chain: Chain | undefined;
  chainId: number | undefined;
  isSupported: boolean;
  supportedChains: readonly Chain[];
  switchChain: (targetChainId: number) => void;
  switchChainPending: boolean;
  switchChainError: Error | null;
  errorMessage: string | null;
}

export function useNetwork(): UseNetworkResult {
  const { chain, chainId } = useAccount();
  const { switchChain, error, isPending } = useSwitchChain();

  const isSupported = chainId ? SUPPORTED_CHAINS.some((c) => c.id === chainId) : false;
  const errorMessage = error ? parseWalletError(error) : null;

  return {
    chain: chain ? (chain as Chain) : undefined,
    chainId,
    isSupported,
    supportedChains: SUPPORTED_CHAINS,
    switchChain: (targetChainId: number) => switchChain({ chainId: targetChainId }),
    switchChainPending: isPending,
    switchChainError: error,
    errorMessage,
  };
}
