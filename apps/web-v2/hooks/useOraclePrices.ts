import { useAccount, useReadContracts } from 'wagmi';
import { ORACLE_MANAGER_ABI } from '../lib/contracts';
import { getChainTokens } from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import { formatUnits, formatUSD } from '../lib/math';

export interface OraclePricesResult {
  btcPriceUSD: string;
  ethPriceUSD: string;
  usdcPriceUSD: string;
  btcPriceNum: number;
  ethPriceNum: number;
  usdcPriceNum: number;
  btcPrice18: bigint;
  ethPrice18: bigint;
  usdcPrice18: bigint;
  isBtcFresh: boolean;
  isEthFresh: boolean;
  isUsdcFresh: boolean;
  isAllFresh: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Production-grade Live Price Layer Hook (0 gas).
 * Direct RPC view calls to OracleManager on-chain.
 */
export function useOraclePrices(): OraclePricesResult {
  const { chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const { oracle } = useProtocolDirectory();

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.cbBTC],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.WETH],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.USDC],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.cbBTC],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.WETH],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.USDC],
      },
    ],
    query: {
      enabled: !!oracle,
      staleTime: 15_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  const btcPrice18 = (data?.[0]?.result as bigint) || 0n;
  const ethPrice18 = (data?.[1]?.result as bigint) || 0n;
  const usdcPrice18 = (data?.[2]?.result as bigint) || 0n;

  const isBtcFresh = (data?.[3]?.result as boolean) ?? true;
  const isEthFresh = (data?.[4]?.result as boolean) ?? true;
  const isUsdcFresh = (data?.[5]?.result as boolean) ?? true;

  const btcPriceNum = Number(formatUnits(btcPrice18, 18));
  const ethPriceNum = Number(formatUnits(ethPrice18, 18));
  const usdcPriceNum = Number(formatUnits(usdcPrice18, 18));

  return {
    btcPriceUSD: formatUSD(btcPriceNum),
    ethPriceUSD: formatUSD(ethPriceNum),
    usdcPriceUSD: formatUSD(usdcPriceNum),
    btcPriceNum,
    ethPriceNum,
    usdcPriceNum,
    btcPrice18,
    ethPrice18,
    usdcPrice18,
    isBtcFresh,
    isEthFresh,
    isUsdcFresh,
    isAllFresh: isBtcFresh && isEthFresh && isUsdcFresh,
    isLoading,
    isError,
    refetch,
  };
}

