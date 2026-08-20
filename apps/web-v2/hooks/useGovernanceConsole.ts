'use client';

import { useAccount, useReadContracts, usePublicClient } from 'wagmi';
import {
  DEPLOYED_CONTRACTS_SEPOLIA,
  getDefaultChainId,
  getExplorerBaseUrl,
  getProtocolDirectoryAddress,
} from '../constants';
import {
  DEFAULT_ADMIN_ROLE_HASH,
  GOVERNANCE_ROLE_HASH,
  GUARDIAN_ROLE_HASH,
  BOT_ROLE_HASH,
  PROPOSER_ROLE_HASH,
  EXECUTOR_ROLE_HASH,
  CANCELLER_ROLE_HASH,
  FULL_PROTOCOL_DIRECTORY_ABI,
  UNIFY_VAULT_TIMELOCK_ABI,
  EMERGENCY_PAUSABLE_ABI,
  DIRECTORY_MODULE_DEFINITIONS,
  DEPLOYED_ACCESS_CONTROL_CONTRACTS,
} from '../lib/contracts/governance';

export interface ModuleEntryState {
  id: `0x${string}`;
  name: string;
  canonicalKey: string;
  description: string;
  targetAddress?: `0x${string}`;
  isRegistered: boolean;
}

export interface PausableModuleState {
  name: string;
  address: `0x${string}`;
  isPaused: boolean;
  pauseFunction: 'pause' | 'emergencyPause';
  unpauseFunction: 'unpause' | 'resume';
  pauserRole: `0x${string}`;
  unpauserRole: `0x${string}`;
  userCanPause: boolean;
  userCanUnpause: boolean;
}

export function useGovernanceConsole() {
  const { address, chain, isConnected } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const explorerBaseUrl = getExplorerBaseUrl(chainId);
  const publicClient = usePublicClient({ chainId });

  const directoryAddress = getProtocolDirectoryAddress(chainId);
  const timelockAddress = DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultTimelock;
  const controllerAddress = DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController;

  // 1. Directory Reads: isFrozen + getAddress for all defined modules
  const directoryCalls = [
    {
      address: directoryAddress,
      abi: FULL_PROTOCOL_DIRECTORY_ABI,
      functionName: 'isFrozen' as const,
      chainId,
    },
    ...DIRECTORY_MODULE_DEFINITIONS.map((mod) => ({
      address: directoryAddress,
      abi: FULL_PROTOCOL_DIRECTORY_ABI,
      functionName: 'getAddress' as const,
      args: [mod.id] as const,
      chainId,
    })),
  ];

  // 2. Timelock info: minDelay + delay
  const timelockCalls = [
    {
      address: timelockAddress,
      abi: UNIFY_VAULT_TIMELOCK_ABI,
      functionName: 'getMinDelay' as const,
      chainId,
    },
    {
      address: timelockAddress,
      abi: UNIFY_VAULT_TIMELOCK_ABI,
      functionName: 'TIMELOCK_DELAY' as const,
      chainId,
    },
  ];

  // 3. Roles for connected wallet on Directory, Timelock, Controller
  const walletRoleCalls = address
    ? [
        // Directory
        {
          address: directoryAddress,
          abi: FULL_PROTOCOL_DIRECTORY_ABI,
          functionName: 'hasRole' as const,
          args: [DEFAULT_ADMIN_ROLE_HASH, address] as const,
          chainId,
        },
        {
          address: directoryAddress,
          abi: FULL_PROTOCOL_DIRECTORY_ABI,
          functionName: 'hasRole' as const,
          args: [GOVERNANCE_ROLE_HASH, address] as const,
          chainId,
        },
        // Timelock
        {
          address: timelockAddress,
          abi: UNIFY_VAULT_TIMELOCK_ABI,
          functionName: 'hasRole' as const,
          args: [DEFAULT_ADMIN_ROLE_HASH, address] as const,
          chainId,
        },
        {
          address: timelockAddress,
          abi: UNIFY_VAULT_TIMELOCK_ABI,
          functionName: 'hasRole' as const,
          args: [PROPOSER_ROLE_HASH, address] as const,
          chainId,
        },
        {
          address: timelockAddress,
          abi: UNIFY_VAULT_TIMELOCK_ABI,
          functionName: 'hasRole' as const,
          args: [EXECUTOR_ROLE_HASH, address] as const,
          chainId,
        },
        {
          address: timelockAddress,
          abi: UNIFY_VAULT_TIMELOCK_ABI,
          functionName: 'hasRole' as const,
          args: [CANCELLER_ROLE_HASH, address] as const,
          chainId,
        },
        // Controller
        {
          address: controllerAddress,
          abi: EMERGENCY_PAUSABLE_ABI,
          functionName: 'hasRole' as const,
          args: [DEFAULT_ADMIN_ROLE_HASH, address] as const,
          chainId,
        },
        {
          address: controllerAddress,
          abi: EMERGENCY_PAUSABLE_ABI,
          functionName: 'hasRole' as const,
          args: [GOVERNANCE_ROLE_HASH, address] as const,
          chainId,
        },
        {
          address: controllerAddress,
          abi: EMERGENCY_PAUSABLE_ABI,
          functionName: 'hasRole' as const,
          args: [GUARDIAN_ROLE_HASH, address] as const,
          chainId,
        },
        {
          address: controllerAddress,
          abi: EMERGENCY_PAUSABLE_ABI,
          functionName: 'hasRole' as const,
          args: [BOT_ROLE_HASH, address] as const,
          chainId,
        },
      ]
    : [];

  // 4. Pausable modules status
  const pausableContracts = DEPLOYED_ACCESS_CONTROL_CONTRACTS.filter((c) => c.pausable);
  const pauseStateCalls = pausableContracts.map((c) => ({
    address: c.address,
    abi: EMERGENCY_PAUSABLE_ABI,
    functionName: 'paused' as const,
    chainId,
  }));

  const {
    data: readData,
    isLoading: isReadLoading,
    refetch,
  } = useReadContracts({
    contracts: [...directoryCalls, ...timelockCalls, ...walletRoleCalls, ...pauseStateCalls],
    query: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  // Extract Directory data
  const isDirectoryFrozen = Boolean(readData?.[0]?.result);

  const directoryOffset = 1;
  const modules: ModuleEntryState[] = DIRECTORY_MODULE_DEFINITIONS.map((def, idx) => {
    const res = readData?.[directoryOffset + idx];
    let targetAddress: `0x${string}` | undefined;
    let isRegistered = false;

    if (res?.status === 'success' && res.result) {
      const addr = res.result as `0x${string}`;
      if (addr && addr !== '0x0000000000000000000000000000000000000000') {
        targetAddress = addr;
        isRegistered = true;
      }
    }
    if (!targetAddress && def.defaultAddress) {
      targetAddress = def.defaultAddress;
    }

    return {
      id: def.id,
      name: def.name,
      canonicalKey: def.canonicalKey,
      description: def.description,
      targetAddress,
      isRegistered,
    };
  });

  // Extract Timelock data
  const timelockOffset = directoryCalls.length;
  const minDelaySeconds = (readData?.[timelockOffset]?.result as bigint) || 172800n; // 48h default
  const timelockDelayConstant = (readData?.[timelockOffset + 1]?.result as bigint) || 172800n;

  // Extract Wallet Roles data
  const roleOffset = timelockOffset + timelockCalls.length;
  const isDirectoryAdmin = address ? Boolean(readData?.[roleOffset]?.result) : false;
  const isDirectoryGov = address ? Boolean(readData?.[roleOffset + 1]?.result) : false;

  const isTimelockAdmin = address ? Boolean(readData?.[roleOffset + 2]?.result) : false;
  const isTimelockProposer = address ? Boolean(readData?.[roleOffset + 3]?.result) : false;
  const isTimelockExecutor = address ? Boolean(readData?.[roleOffset + 4]?.result) : false;
  const isTimelockCanceller = address ? Boolean(readData?.[roleOffset + 5]?.result) : false;

  const isControllerAdmin = address ? Boolean(readData?.[roleOffset + 6]?.result) : false;
  const isControllerGov = address ? Boolean(readData?.[roleOffset + 7]?.result) : false;
  const isControllerGuardian = address ? Boolean(readData?.[roleOffset + 8]?.result) : false;
  const isControllerBot = address ? Boolean(readData?.[roleOffset + 9]?.result) : false;

  // Extract Pausable modules state
  const pauseOffset = roleOffset + (address ? walletRoleCalls.length : 0);
  const pausableModules: PausableModuleState[] = pausableContracts.map((c, idx) => {
    const res = readData?.[pauseOffset + idx];
    const isPaused = Boolean(res?.result);
    const pauseFunction = c.pauseFunction || 'pause';
    const unpauseFunction = c.unpauseFunction || 'unpause';

    // GUARDIAN_ROLE is required for pause; GOVERNANCE_ROLE is required for unpause
    const userCanPause = Boolean(
      address && (isControllerGuardian || isDirectoryGov || isDirectoryAdmin),
    );
    const userCanUnpause = Boolean(
      address && (isControllerGov || isDirectoryGov || isDirectoryAdmin),
    );

    return {
      name: c.name,
      address: c.address,
      isPaused,
      pauseFunction,
      unpauseFunction,
      pauserRole: GUARDIAN_ROLE_HASH,
      unpauserRole: GOVERNANCE_ROLE_HASH,
      userCanPause,
      userCanUnpause,
    };
  });

  return {
    address,
    isConnected,
    chainId,
    explorerBaseUrl,
    publicClient,
    directoryAddress,
    timelockAddress,
    controllerAddress,
    isDirectoryFrozen,
    modules,
    minDelaySeconds,
    timelockDelayConstant,
    roles: {
      isDirectoryAdmin,
      isDirectoryGov,
      isTimelockAdmin,
      isTimelockProposer,
      isTimelockExecutor,
      isTimelockCanceller,
      isControllerAdmin,
      isControllerGov,
      isControllerGuardian,
      isControllerBot,
    },
    pausableModules,
    isLoading: isReadLoading,
    refetch,
  };
}
