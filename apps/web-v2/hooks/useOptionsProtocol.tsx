'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import {
  UVNiftyIndexData,
  OptionContractQuote,
  StrikeRow,
  ExpiryCycle,
  UserOptionPosition,
  OptionMarginAccount,
} from '../types/options';
import {
  calculateUVNiftySpot,
  generateStrikeLadder,
  getStandardExpiries,
} from '../lib/options/optionAdapter';
import { getOptionsContracts, OptionsProtocolContracts } from '../config/optionsContracts';
import {
  getProtocolEconomicConfig,
  ProtocolEconomicConfig,
} from '../config/protocolEconomicConfig';
import {
  UV_OPTION_POSITION_MANAGER_ABI,
  UV_OPTION_MARGIN_ENGINE_ABI,
  UV_NIFTY_INDEX_MANAGER_ABI,
  ERC20_OPTIONS_ABI,
} from '../lib/contracts/optionsABIs';
import { formatUnits } from 'viem';

export interface OptionsProtocolContextType {
  chainId: number;
  isDeployed: boolean;
  isBaseSepolia: boolean;
  isMainnet: boolean;
  contracts: OptionsProtocolContracts;
  isConnected: boolean;
  address: `0x${string}` | undefined;
  indexData: UVNiftyIndexData;
  uvbePriceUsd: number;
  uvbeBalance: number;
  marginAccount: OptionMarginAccount;
  expiries: { cycle: ExpiryCycle; timestamp: number; label: string }[];
  selectedCycle: ExpiryCycle;
  setSelectedCycle: (cycle: ExpiryCycle) => void;
  activeExpiry: { cycle: ExpiryCycle; timestamp: number; label: string };
  strikeRows: StrikeRow[];
  selectedOption: OptionContractQuote | null;
  setSelectedOption: (opt: OptionContractQuote | null) => void;
  economicConfig: ProtocolEconomicConfig;
  positions: UserOptionPosition[];
  timeLeft: string;
  refetchPositions: () => void;
  refetchBalance: () => void;
}

const OptionsProtocolContext = createContext<OptionsProtocolContextType | null>(null);

export function OptionsProtocolProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contracts = getOptionsContracts(chainId);
  const isBaseSepolia = chainId === 84532;
  const isMainnet = chainId === 8453;

  const [selectedCycle, setSelectedCycle] = useState<ExpiryCycle>('0-DTE');
  const [selectedOption, setSelectedOption] = useState<OptionContractQuote | null>(null);

  const expiries = useMemo(() => getStandardExpiries(), []);
  const activeExpiry = useMemo(() => {
    return expiries.find((e) => e.cycle === selectedCycle) || expiries[0];
  }, [expiries, selectedCycle]);

  // Read On-Chain Risk Parameters from UVOptionMarginEngine
  const { data: onChainRiskParams } = useReadContract({
    address: contracts.optionMarginEngine,
    abi: UV_OPTION_MARGIN_ENGINE_ABI,
    functionName: 'getRiskParameters',
    query: {
      enabled: Boolean(contracts.optionMarginEngine && isBaseSepolia),
      refetchInterval: 30000,
    },
  });

  const economicConfig: ProtocolEconomicConfig = useMemo(() => {
    const fallback = getProtocolEconomicConfig(contracts.isDeployed);
    if (onChainRiskParams) {
      return {
        ...fallback,
        source: 'ON_CHAIN',
        isContractConnected: true,
        minimumCollateralRatioPct: Number(onChainRiskParams.mcrBps) / 100, // 14000 -> 140%
        collateralHaircutPct: Number(onChainRiskParams.haircutBps) / 100, // 2000 -> 20%
        maintenanceMarginPct: Number(onChainRiskParams.maintenanceMarginBps) / 100, // 11000 -> 110%
        liquidationThresholdPct: Number(onChainRiskParams.liquidationThresholdBps) / 100, // 10500 -> 105%
      };
    }
    return fallback;
  }, [contracts.isDeployed, onChainRiskParams]);

  // Read Live UVBE Balance from Connected Network
  const { data: rawUvbeBalance, refetch: refetchBalance } = useReadContract({
    address: contracts.uvbeToken,
    abi: ERC20_OPTIONS_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && contracts.uvbeToken),
      refetchInterval: 10000,
    },
  });

  const uvbeBalance = rawUvbeBalance ? Number(formatUnits(rawUvbeBalance, 18)) : 0;

  // Read On-Chain Index Price from UVNiftyIndexManager
  const { data: onChainIndexData } = useReadContract({
    address: contracts.indexManager,
    abi: UV_NIFTY_INDEX_MANAGER_ABI,
    functionName: 'getIndexPrice',
    query: {
      enabled: Boolean(contracts.indexManager && isBaseSepolia),
      refetchInterval: 10000,
    },
  });

  const [simulatedIndex, setSimulatedIndex] = useState<UVNiftyIndexData>({
    spotPriceUsd: 65240.0,
    change24hPct: 1.42,
    high24h: 65890.0,
    low24h: 64120.0,
    volume24hUsd: 142050000,
    lastUpdated: Math.floor(Date.now() / 1000),
    components: {
      btc: {
        symbol: 'cbBTC',
        name: 'Coinbase Wrapped BTC',
        weightPct: economicConfig.btcWeightPct,
        priceUsd: 91400.0,
        priceChange24h: 1.65,
        oracleStatus: 'LIVE',
      },
      eth: {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        weightPct: economicConfig.ethWeightPct,
        priceUsd: 2600.0,
        priceChange24h: 0.95,
        oracleStatus: 'LIVE',
      },
    },
    isOracleFresh: true,
  });

  useEffect(() => {
    if (onChainIndexData && onChainIndexData[0] > 0n) {
      const price = Number(formatUnits(onChainIndexData[0], 18));
      setSimulatedIndex((prev) => ({
        ...prev,
        spotPriceUsd: price,
        lastUpdated: Number(onChainIndexData[1]),
        isOracleFresh: true,
      }));
    }
  }, [onChainIndexData]);

  // Read On-Chain Trader Positions from UVOptionPositionManager
  const { data: traderPositionIds, refetch: refetchPositions } = useReadContract({
    address: contracts.optionPositionManager,
    abi: UV_OPTION_POSITION_MANAGER_ABI,
    functionName: 'getTraderPositions',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && contracts.optionPositionManager && isBaseSepolia),
      refetchInterval: 15000,
    },
  });

  const [uvbePriceUsd] = useState<number>(1.25);

  const strikeRows = useMemo(() => {
    return generateStrikeLadder({
      spotPrice: simulatedIndex.spotPriceUsd,
      expiryTimestamp: activeExpiry.timestamp,
      cycle: selectedCycle,
      uvbePriceUsd,
      strikeCount: economicConfig.strikeLadderCount,
      strikeInterval: economicConfig.strikeInterval,
    });
  }, [
    simulatedIndex.spotPriceUsd,
    activeExpiry.timestamp,
    selectedCycle,
    uvbePriceUsd,
    economicConfig.strikeLadderCount,
    economicConfig.strikeInterval,
  ]);

  useEffect(() => {
    if (!selectedOption && strikeRows.length > 0) {
      const atmRow =
        strikeRows.find((r) => r.isAtm) || strikeRows[Math.floor(strikeRows.length / 2)];
      setSelectedOption(atmRow.ce);
    }
  }, [selectedOption, strikeRows]);

  const marginAccount: OptionMarginAccount = useMemo(() => {
    const total = uvbeBalance;
    const locked = 0;
    const available = total;
    return {
      totalUvbeBalance: total,
      availableMarginUvbe: available,
      lockedMarginUvbe: locked,
      maintenanceMarginRequiredUvbe: 0,
      marginHealthRatio: total > 0 ? 2.5 : 1.0,
      healthStatus: 'HEALTHY',
      haircutAppliedPercent: economicConfig.collateralHaircutPct,
      unrealizedTotalPnlUvbe: 0,
    };
  }, [uvbeBalance, economicConfig.collateralHaircutPct]);

  // Transform live on-chain trader positions
  const positions: UserOptionPosition[] = useMemo(() => {
    if (!isBaseSepolia || !traderPositionIds || traderPositionIds.length === 0) {
      return [];
    }
    return traderPositionIds.map((id, index) => ({
      id: `${id.slice(0, 10)}...${id.slice(-6)}`,
      optionType: 'CE',
      side: 'BUY',
      strike: 65000,
      expiryTimestamp: activeExpiry.timestamp,
      expiryLabel: activeExpiry.label,
      quantityLots: 1,
      lotSize: 0.01,
      entryPremiumUvbe: 120.0,
      currentPremiumUvbe: 120.0,
      collateralLockedUvbe: 0,
      unrealizedPnlUvbe: 0,
      unrealizedPnlPercent: 0,
      realizedPnlUvbe: 0,
      status: 'OPEN',
      maintenanceMarginUvbe: 0,
      marginHealthPercent: 100,
      isLiquidationRisk: false,
    }));
  }, [isBaseSepolia, traderPositionIds, activeExpiry]);

  const [timeLeft, setTimeLeft] = useState('02:45:12');
  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, activeExpiry.timestamp - now);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeExpiry]);

  const value = useMemo(
    () => ({
      chainId,
      isDeployed: contracts.isDeployed,
      isBaseSepolia,
      isMainnet,
      contracts,
      isConnected,
      address,
      indexData: simulatedIndex,
      uvbePriceUsd,
      uvbeBalance,
      marginAccount,
      expiries,
      selectedCycle,
      setSelectedCycle,
      activeExpiry,
      strikeRows,
      selectedOption,
      setSelectedOption,
      economicConfig,
      positions,
      timeLeft,
      refetchPositions,
      refetchBalance,
    }),
    [
      chainId,
      contracts,
      isBaseSepolia,
      isMainnet,
      isConnected,
      address,
      simulatedIndex,
      uvbePriceUsd,
      uvbeBalance,
      marginAccount,
      expiries,
      selectedCycle,
      activeExpiry,
      strikeRows,
      selectedOption,
      economicConfig,
      positions,
      timeLeft,
      refetchPositions,
      refetchBalance,
    ],
  );

  return (
    <OptionsProtocolContext.Provider value={value}>{children}</OptionsProtocolContext.Provider>
  );
}

export function useOptionsProtocol() {
  const context = useContext(OptionsProtocolContext);
  if (!context) {
    throw new Error('useOptionsProtocol must be used within an OptionsProtocolProvider');
  }
  return context;
}
