import { useAccount, useReadContracts } from 'wagmi';
import { ORACLE_MANAGER_ABI } from '../lib/contracts';
import { getChainTokens } from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import { formatUnits, formatUSD } from '../lib/math';
import { OracleFeedStatus } from '../types';

export interface OraclePricesResult {
  btcPriceUSD: string;
  ethPriceUSD: string;
  usdcPriceUSD: string;
  btcPriceNum: number | null;
  ethPriceNum: number | null;
  usdcPriceNum: number | null;
  btcPrice18: bigint | null;
  ethPrice18: bigint | null;
  usdcPrice18: bigint | null;
  btcStatus: OracleFeedStatus;
  ethStatus: OracleFeedStatus;
  usdcStatus: OracleFeedStatus;
  isBtcFresh: boolean;
  isEthFresh: boolean;
  isUsdcFresh: boolean;
  isAllFresh: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

function deriveOracleStatus(
  readItem: { status?: 'success' | 'failure'; result?: unknown; error?: Error } | undefined,
  freshItem: { status?: 'success' | 'failure'; result?: unknown } | undefined,
): { status: OracleFeedStatus; price18: bigint | null; isFresh: boolean } {
  if (!readItem) {
    return { status: 'UNAVAILABLE', price18: null, isFresh: false };
  }

  if (readItem.status === 'failure' || readItem.error) {
    return { status: 'REVERTED', price18: null, isFresh: false };
  }

  const rawResult = readItem.result as bigint | undefined;
  if (rawResult === undefined || rawResult === 0n) {
    return { status: 'UNAVAILABLE', price18: null, isFresh: false };
  }

  const isFresh = Boolean(freshItem?.result ?? true);
  if (!isFresh) {
    return { status: 'STALE', price18: rawResult, isFresh: false };
  }

  return { status: 'LIVE', price18: rawResult, isFresh: true };
}

/**
 * Production-grade Live Price Layer Hook (0 gas).
 * Direct RPC view calls to OracleManager on-chain with explicit staleness and error state handling.
 */
export function useOraclePrices(): OraclePricesResult {
  const { chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const { oracle } = useProtocolDirectory();

  const {
    data,
    isLoading,
    isError,
    refetch: contractsRefetch,
  } = useReadContracts({
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
      refetchInterval: 15_000,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60 * 1000,
    },
  });

  const btcParsed = deriveOracleStatus(data?.[0], data?.[3]);
  const ethParsed = deriveOracleStatus(data?.[1], data?.[4]);
  const usdcParsed = deriveOracleStatus(data?.[2], data?.[5]);

  const btcPriceNum =
    btcParsed.price18 !== null ? Number(formatUnits(btcParsed.price18, 18)) : null;
  const ethPriceNum =
    ethParsed.price18 !== null ? Number(formatUnits(ethParsed.price18, 18)) : null;
  const usdcPriceNum =
    usdcParsed.price18 !== null ? Number(formatUnits(usdcParsed.price18, 18)) : null;

  const btcPriceUSD =
    btcParsed.status === 'LIVE' && btcPriceNum !== null
      ? formatUSD(btcPriceNum)
      : 'Price unavailable';
  const ethPriceUSD =
    ethParsed.status === 'LIVE' && ethPriceNum !== null
      ? formatUSD(ethPriceNum)
      : 'Price unavailable';
  const usdcPriceUSD =
    usdcParsed.status === 'LIVE' && usdcPriceNum !== null
      ? formatUSD(usdcPriceNum)
      : 'Price unavailable';

  const refetch = async () => {
    await contractsRefetch();
  };

  return {
    btcPriceUSD,
    ethPriceUSD,
    usdcPriceUSD,
    btcPriceNum,
    ethPriceNum,
    usdcPriceNum,
    btcPrice18: btcParsed.price18,
    ethPrice18: ethParsed.price18,
    usdcPrice18: usdcParsed.price18,
    btcStatus: btcParsed.status,
    ethStatus: ethParsed.status,
    usdcStatus: usdcParsed.status,
    isBtcFresh: btcParsed.isFresh,
    isEthFresh: ethParsed.isFresh,
    isUsdcFresh: usdcParsed.isFresh,
    isAllFresh: btcParsed.isFresh && ethParsed.isFresh && usdcParsed.isFresh,
    isLoading,
    isError,
    refetch,
  };
}
