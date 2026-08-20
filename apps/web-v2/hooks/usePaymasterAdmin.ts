'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useReadContracts, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import {
  UNIFY_VAULT_PAYMASTER_ABI,
  GAS_TREASURY_ABI,
  ENTRYPOINT_V07_ABI,
  KNOWN_SPONSORSHIP_TARGETS,
  KnownTargetDefinition,
} from '../lib/contracts/paymaster';
import { DEPLOYED_CONTRACTS_SEPOLIA, getExplorerBaseUrl, getDefaultChainId } from '../constants';

export type PaymasterHealthStatus = 'Healthy' | 'Warning' | 'Critical' | 'Paused' | 'Unknown';

export interface TargetSelectorStatus {
  name: string;
  selector: `0x${string}`;
  signature: string;
  isApproved: boolean;
}

export interface TargetStatus {
  name: string;
  address: `0x${string}`;
  category: 'Token' | 'Core' | 'Escrow' | 'Staking' | 'Treasury';
  isApproved: boolean;
  selectors: TargetSelectorStatus[];
}

export interface PaymasterAdminState {
  // Connected User & Chain
  address?: `0x${string}`;
  isConnected: boolean;
  chainId: number;
  isBaseSepolia: boolean;
  explorerBaseUrl: string;

  // Contract Addresses
  paymasterAddress: `0x${string}`;
  gasTreasuryAddress: `0x${string}`;
  entryPointAddress: `0x${string}`;

  // Paymaster Live State
  paymasterOwner?: `0x${string}`;
  verifyingSigner?: `0x${string}`;
  maxCostPerUserOp: bigint;
  maxFeePerGasCap: bigint;
  userOpCooldown: bigint;
  requireSigner: boolean;
  isPaymasterPaused: boolean;
  entryPointDeposit: bigint;
  paymasterEthBalance: bigint;

  // Gas Treasury Live State
  gasTreasuryOwner?: `0x${string}`;
  refillOperator?: `0x${string}`;
  gasTreasuryPaymaster?: `0x${string}`;
  maxRefillPerTx: bigint;
  dailyRefillLimit: bigint;
  currentDayRefillTotal: bigint;
  currentDayWindowStart: bigint;
  isGasTreasuryPaused: boolean;
  gasTreasuryEthBalance: bigint;
  remainingDailyLimit: bigint;

  // Target Policies Matrix
  targets: TargetStatus[];

  // Authorization Flags
  isPaymasterOwner: boolean;
  isGasTreasuryOwner: boolean;
  isPaymasterOwnedByTimelock: boolean;
  isGasTreasuryOwnedByTimelock: boolean;
  isRefillOperator: boolean;
  canRefill: boolean;
  canConfigurePaymaster: boolean;
  canConfigureGasTreasury: boolean;
  canEmergencyPausePaymaster: boolean;
  canEmergencyPauseTreasury: boolean;

  // Overall Health
  healthStatus: PaymasterHealthStatus;
  isLowBalance: boolean;

  // Controls & Loading
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function usePaymasterAdmin(): PaymasterAdminState {
  const { address, isConnected, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const isBaseSepolia = chainId === 84532;
  const explorerBaseUrl = getExplorerBaseUrl(chainId);
  const publicClient = usePublicClient({ chainId });

  const paymasterAddress = DEPLOYED_CONTRACTS_SEPOLIA.Paymaster;
  const gasTreasuryAddress = DEPLOYED_CONTRACTS_SEPOLIA.GasTreasury;
  const entryPointAddress = DEPLOYED_CONTRACTS_SEPOLIA.EntryPoint;

  // Native ETH Balances
  const [paymasterEthBalance, setPaymasterEthBalance] = useState<bigint>(0n);
  const [gasTreasuryEthBalance, setGasTreasuryEthBalance] = useState<bigint>(0n);

  // Build reads array for paymaster, gas treasury, and known targets & selectors
  const contractReads = useMemo(() => {
    const reads: any[] = [
      // 0: Paymaster owner
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'owner',
      },
      // 1: Paymaster entryPoint
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'entryPoint',
      },
      // 2: Paymaster verifyingSigner
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'verifyingSigner',
      },
      // 3: Paymaster maxCostPerUserOp
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'maxCostPerUserOp',
      },
      // 4: Paymaster maxFeePerGasCap
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'maxFeePerGasCap',
      },
      // 5: Paymaster userOpCooldown
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'userOpCooldown',
      },
      // 6: Paymaster requireSigner
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'requireSigner',
      },
      // 7: Paymaster isPaused
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'isPaused',
      },
      // 8: Paymaster getDeposit
      {
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'getDeposit',
      },
      // 9: Gas Treasury owner
      {
        address: gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'owner',
      },
      // 10: Gas Treasury refillOperator
      {
        address: gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'refillOperator',
      },
      // 11: Gas Treasury paymaster
      {
        address: gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'paymaster',
      },
      // 12: Gas Treasury maxRefillPerTx
      {
        address: gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'maxRefillPerTx',
      },
      // 13: Gas Treasury dailyRefillLimit
      {
        address: gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'dailyRefillLimit',
      },
      // 14: Gas Treasury currentDayRefillTotal
      {
        address: gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'currentDayRefillTotal',
      },
      // 15: Gas Treasury currentDayWindowStart
      {
        address: gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'currentDayWindowStart',
      },
      // 16: Gas Treasury isPaused
      {
        address: gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'isPaused',
      },
    ];

    // Append target approval queries
    for (const target of KNOWN_SPONSORSHIP_TARGETS) {
      reads.push({
        address: paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'approvedTargets',
        args: [target.address],
      });

      for (const sel of target.knownSelectors) {
        reads.push({
          address: paymasterAddress,
          abi: UNIFY_VAULT_PAYMASTER_ABI,
          functionName: 'approvedSelectors',
          args: [target.address, sel.selector],
        });
      }
    }

    return reads;
  }, [paymasterAddress, gasTreasuryAddress]);

  const {
    data: contractData,
    isLoading: isContractLoading,
    refetch: refetchContracts,
  } = useReadContracts({
    contracts: contractReads,
    query: {
      enabled: !!paymasterAddress && !!gasTreasuryAddress,
      staleTime: 10_000,
      gcTime: 30_000,
    },
  });

  const fetchBalances = useCallback(async () => {
    if (!publicClient) return;
    try {
      if (paymasterAddress) {
        const pBal = await publicClient.getBalance({ address: paymasterAddress });
        setPaymasterEthBalance(pBal);
      }
      if (gasTreasuryAddress) {
        const tBal = await publicClient.getBalance({ address: gasTreasuryAddress });
        setGasTreasuryEthBalance(tBal);
      }
    } catch (err) {
      console.warn('Failed to fetch native ETH balances:', err);
    }
  }, [publicClient, paymasterAddress, gasTreasuryAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchContracts(), fetchBalances()]);
  }, [refetchContracts, fetchBalances]);

  // Extract Paymaster Values
  const paymasterOwner = contractData?.[0]?.result as `0x${string}` | undefined;
  const verifyingSigner = contractData?.[2]?.result as `0x${string}` | undefined;
  const maxCostPerUserOp = (contractData?.[3]?.result as bigint) || 0n;
  const maxFeePerGasCap = (contractData?.[4]?.result as bigint) || 0n;
  const userOpCooldown = (contractData?.[5]?.result as bigint) || 0n;
  const requireSigner = Boolean(contractData?.[6]?.result);
  const isPaymasterPaused = Boolean(contractData?.[7]?.result);
  const entryPointDeposit = (contractData?.[8]?.result as bigint) || 0n;

  // Extract Gas Treasury Values
  const gasTreasuryOwner = contractData?.[9]?.result as `0x${string}` | undefined;
  const refillOperator = contractData?.[10]?.result as `0x${string}` | undefined;
  const gasTreasuryPaymaster = contractData?.[11]?.result as `0x${string}` | undefined;
  const maxRefillPerTx = (contractData?.[12]?.result as bigint) || 0n;
  const dailyRefillLimit = (contractData?.[13]?.result as bigint) || 0n;
  const currentDayRefillTotal = (contractData?.[14]?.result as bigint) || 0n;
  const currentDayWindowStart = (contractData?.[15]?.result as bigint) || 0n;
  const isGasTreasuryPaused = Boolean(contractData?.[16]?.result);

  const remainingDailyLimit =
    dailyRefillLimit > currentDayRefillTotal ? dailyRefillLimit - currentDayRefillTotal : 0n;

  // Extract Target Matrix
  const targets: TargetStatus[] = useMemo(() => {
    let readIdx = 17;
    return KNOWN_SPONSORSHIP_TARGETS.map((target) => {
      const isTargetApproved = Boolean(contractData?.[readIdx]?.result);
      readIdx++;

      const selectors: TargetSelectorStatus[] = target.knownSelectors.map((sel) => {
        const isSelectorApproved = Boolean(contractData?.[readIdx]?.result);
        readIdx++;
        return {
          name: sel.name,
          selector: sel.selector,
          signature: sel.signature,
          isApproved: isSelectorApproved,
        };
      });

      return {
        name: target.name,
        address: target.address,
        category: target.category,
        isApproved: isTargetApproved,
        selectors,
      };
    });
  }, [contractData]);

  // Authorization Flags
  const isPaymasterOwner = Boolean(
    address && paymasterOwner && address.toLowerCase() === paymasterOwner.toLowerCase(),
  );
  const isGasTreasuryOwner = Boolean(
    address && gasTreasuryOwner && address.toLowerCase() === gasTreasuryOwner.toLowerCase(),
  );
  const isRefillOperator = Boolean(
    address && refillOperator && address.toLowerCase() === refillOperator.toLowerCase(),
  );

  const timelockAddr = DEPLOYED_CONTRACTS_SEPOLIA.TimelockController.toLowerCase();
  const unifyTimelockAddr = DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultTimelock.toLowerCase();

  const isPaymasterOwnedByTimelock = Boolean(
    paymasterOwner &&
    (paymasterOwner.toLowerCase() === timelockAddr ||
      paymasterOwner.toLowerCase() === unifyTimelockAddr),
  );
  const isGasTreasuryOwnedByTimelock = Boolean(
    gasTreasuryOwner &&
    (gasTreasuryOwner.toLowerCase() === timelockAddr ||
      gasTreasuryOwner.toLowerCase() === unifyTimelockAddr),
  );

  const canRefill = isGasTreasuryOwner || isRefillOperator;
  const canConfigurePaymaster = isPaymasterOwner && !isPaymasterOwnedByTimelock;
  const canConfigureGasTreasury = isGasTreasuryOwner && !isGasTreasuryOwnedByTimelock;
  const canEmergencyPausePaymaster = isPaymasterOwner;
  const canEmergencyPauseTreasury = isGasTreasuryOwner;

  // Low balance threshold: < 0.005 ETH is critical, < 0.01 ETH is warning
  const isLowBalance = entryPointDeposit < 10000000000000000n; // 0.01 ETH

  const healthStatus: PaymasterHealthStatus = useMemo(() => {
    if (isContractLoading) return 'Unknown';
    if (isPaymasterPaused || isGasTreasuryPaused) return 'Paused';
    if (entryPointDeposit < 2000000000000000n) return 'Critical'; // < 0.002 ETH
    if (entryPointDeposit < 10000000000000000n) return 'Warning'; // < 0.01 ETH
    return 'Healthy';
  }, [isContractLoading, isPaymasterPaused, isGasTreasuryPaused, entryPointDeposit]);

  return {
    address,
    isConnected,
    chainId,
    isBaseSepolia,
    explorerBaseUrl,
    paymasterAddress,
    gasTreasuryAddress,
    entryPointAddress,
    paymasterOwner,
    verifyingSigner,
    maxCostPerUserOp,
    maxFeePerGasCap,
    userOpCooldown,
    requireSigner,
    isPaymasterPaused,
    entryPointDeposit,
    paymasterEthBalance,
    gasTreasuryOwner,
    refillOperator,
    gasTreasuryPaymaster,
    maxRefillPerTx,
    dailyRefillLimit,
    currentDayRefillTotal,
    currentDayWindowStart,
    isGasTreasuryPaused,
    gasTreasuryEthBalance,
    remainingDailyLimit,
    targets,
    isPaymasterOwner,
    isGasTreasuryOwner,
    isPaymasterOwnedByTimelock,
    isGasTreasuryOwnedByTimelock,
    isRefillOperator,
    canRefill,
    canConfigurePaymaster,
    canConfigureGasTreasury,
    canEmergencyPausePaymaster,
    canEmergencyPauseTreasury,
    healthStatus,
    isLowBalance,
    isLoading: isContractLoading,
    refetch,
  };
}
