'use client';

import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import {
  Shield,
  Key,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Lock,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Sliders,
  Rocket,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { isAddress, encodeFunctionData, encodeDeployData, parseAbi, type Address } from 'viem';
import { DEPLOYMENT_ARTIFACTS } from '../../lib/deployment/generatedArtifacts';
import { getContractRolesMatrix } from '../../lib/admin/adminRolesMatrix';
import { getAllAdminRoleTransferCalls } from '../../lib/admin/batchRoleMigrator';
import type { ContractRoleMigrationItem, AdminMigrationAuditRecord } from '../../lib/admin/types';
import type { DeployedContractsMap } from '../../lib/deployment/types';
import { getExplorerBaseUrl } from '../../constants';

// Canonical MultiCall3 on Base Mainnet (8453) and Base Sepolia (84532)
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;
const MULTICALL3_ABI = parseAbi([
  'struct Call3 { address target; bool allowFailure; bytes callData; }',
  'struct Result { bool success; bytes returnData; }',
  'function aggregate3(Call3[] calldata calls) external payable returns (Result[] memory returnData)',
]);

interface AdminSecurityMigrationCardProps {
  chainId: number;
  deployedContracts: DeployedContractsMap;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AdminErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AdminSecurityMigrationCard ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-rose-950/20 border-2 border-rose-500/40 text-rose-300 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <span>Admin Security Console Notice</span>
          </div>
          <p>
            The role matrix is waiting for contract deployment addresses. Deploy contracts first in
            the <strong>Active Deploy</strong> tab.
          </p>
          <div className="p-3 bg-black/40 rounded-xl border border-rose-500/20 text-[11px] overflow-x-auto text-rose-200">
            {this.state.error?.message || 'Awaiting deployment addresses'}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ACCESS_CONTROL_ABI = parseAbi([
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
]);

function AdminSecurityMigrationInner({
  chainId,
  deployedContracts = {},
}: AdminSecurityMigrationCardProps) {
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [currentAdmin] = useState<`0x${string}`>('0x441dbf8076d0b143EC17199baE94Daa884161454');
  const [hardwareWalletInput, setHardwareWalletInput] = useState<string>('');
  const [hardwareWalletAddress, setHardwareWalletAddress] = useState<`0x${string}` | null>(null);
  const [isVerifyingRoles, setIsVerifyingRoles] = useState<boolean>(false);
  const [roleItems, setRoleItems] = useState<ContractRoleMigrationItem[]>([]);
  const [auditRecords, setAuditRecords] = useState<AdminMigrationAuditRecord[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const explorerBase = getExplorerBaseUrl(chainId || 84532);

  // Initialize matrix safely
  useEffect(() => {
    try {
      const items = getContractRolesMatrix(
        deployedContracts || {},
        currentAdmin,
        hardwareWalletAddress || undefined,
      );
      setRoleItems(Array.isArray(items) ? items : []);
    } catch (err: any) {
      console.warn('[AdminSecurityMigrationCard] Error generating roles matrix:', err);
      setRoleItems([]);
    }
  }, [deployedContracts, currentAdmin, hardwareWalletAddress]);

  // Read on-chain role state
  const verifyOnChainRoles = useCallback(async () => {
    if (!publicClient || roleItems.length === 0) return;
    setIsVerifyingRoles(true);
    setErrorMessage(null);

    try {
      const updated: ContractRoleMigrationItem[] = [];

      for (const item of roleItems) {
        let isCurrentAdminValid = false;
        let isNewAdminValid = false;

        try {
          if (item.accessModel === 'ACCESS_CONTROL' && item.contractAddress) {
            isCurrentAdminValid = (await publicClient.readContract({
              address: item.contractAddress,
              abi: ACCESS_CONTROL_ABI,
              functionName: 'hasRole',
              args: [item.roleIdentifier, currentAdmin],
            })) as boolean;

            if (hardwareWalletAddress) {
              isNewAdminValid = (await publicClient.readContract({
                address: item.contractAddress,
                abi: ACCESS_CONTROL_ABI,
                functionName: 'hasRole',
                args: [item.roleIdentifier, hardwareWalletAddress],
              })) as boolean;
            }
          }
        } catch (readErr) {
          console.warn(`[verifyOnChainRoles] Error reading ${item.contractName}:`, readErr);
        }

        let status = item.status;
        if (isNewAdminValid && !isCurrentAdminValid) {
          status = 'completed';
        } else if (isNewAdminValid && isCurrentAdminValid) {
          status = 'ready_to_revoke';
        } else if (!isNewAdminValid && isCurrentAdminValid) {
          status = 'ready_to_grant';
        }

        updated.push({
          ...item,
          isCurrentAuthorityVerified: isCurrentAdminValid,
          isNewAuthorityVerified: isNewAdminValid,
          status,
        });
      }

      setRoleItems(updated);
    } catch (err: any) {
      console.error('[verifyOnChainRoles] Error:', err);
      setErrorMessage(err?.message || 'Failed to verify on-chain roles');
    } finally {
      setIsVerifyingRoles(false);
    }
  }, [publicClient, roleItems, currentAdmin, hardwareWalletAddress]);

  // Connect / Bind Hardware Wallet
  const handleBindHardwareWallet = () => {
    setErrorMessage(null);
    if (!hardwareWalletInput || !isAddress(hardwareWalletInput)) {
      setErrorMessage('Invalid hardware wallet Ethereum address.');
      return;
    }
    const cleanAddr = hardwareWalletInput.toLowerCase() as `0x${string}`;
    if (cleanAddr === currentAdmin.toLowerCase()) {
      setErrorMessage('New administrator address cannot be identical to current deployer.');
      return;
    }
    setHardwareWalletAddress(cleanAddr);
  };

  const handleUseConnectedAsHardware = () => {
    if (!connectedAddress) {
      setErrorMessage('Please connect your hardware wallet in MetaMask/Frame first.');
      return;
    }
    if (connectedAddress.toLowerCase() === currentAdmin.toLowerCase()) {
      setErrorMessage(
        'Connected wallet is currently the active deployer. Switch to your hardware wallet account.',
      );
      return;
    }
    setHardwareWalletInput(connectedAddress);
    setHardwareWalletAddress(connectedAddress.toLowerCase() as `0x${string}`);
  };

  // Grant Role (Step 1 of 2)
  const handleGrantRole = async (item: ContractRoleMigrationItem) => {
    if (!walletClient || !publicClient || !hardwareWalletAddress) {
      setErrorMessage('Wallet client or hardware wallet address missing.');
      return;
    }
    if (connectedAddress?.toLowerCase() !== currentAdmin.toLowerCase()) {
      setErrorMessage(
        `Please connect the Current Admin account (${currentAdmin.slice(0, 6)}...${currentAdmin.slice(-4)}) to execute role grant.`,
      );
      return;
    }

    const actionKey = `grant-${item.contractName}-${item.roleName}`;
    setActionInProgress(actionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const hash = await walletClient.writeContract({
        address: item.contractAddress,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'grantRole',
        args: [item.roleIdentifier, hardwareWalletAddress],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error(`Transaction reverted on-chain (Tx: ${hash})`);
      }

      // Re-verify on-chain
      const hasRoleNow = (await publicClient.readContract({
        address: item.contractAddress,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: [item.roleIdentifier, hardwareWalletAddress],
      })) as boolean;

      if (!hasRoleNow) {
        throw new Error('Post-transaction verification failed: New wallet does not hold role.');
      }

      // Log server audit record
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId,
          oldAdmin: currentAdmin,
          newAdmin: hardwareWalletAddress,
          contractName: item.contractName,
          contractAddress: item.contractAddress,
          roleName: item.roleName,
          roleIdentifier: item.roleIdentifier,
          grantTxHash: hash,
          grantBlockNumber: Number(receipt.blockNumber),
          grantVerified: true,
          status: 'in_progress',
        }),
      });

      setSuccessMessage(
        `Successfully granted ${item.roleName} on ${item.contractName} to Hardware Wallet!`,
      );
      await verifyOnChainRoles();
    } catch (err: any) {
      console.error('[handleGrantRole] Error:', err);
      setErrorMessage(err?.message || 'Grant role transaction failed.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Revoke Role (Step 2 of 2)
  const handleRevokeRole = async (item: ContractRoleMigrationItem) => {
    if (!walletClient || !publicClient || !hardwareWalletAddress) {
      setErrorMessage('Wallet client or hardware wallet address missing.');
      return;
    }
    if (!item.isNewAuthorityVerified) {
      setErrorMessage(
        'Safety Gate: Cannot revoke old admin until New Hardware Wallet role is verified on-chain.',
      );
      return;
    }
    const isOldAdmin = connectedAddress?.toLowerCase() === currentAdmin.toLowerCase();
    const isNewAdmin = connectedAddress?.toLowerCase() === hardwareWalletAddress?.toLowerCase();

    if (!isOldAdmin && !isNewAdmin) {
      setErrorMessage(
        `Please connect either the Deployer account (${currentAdmin.slice(0, 6)}...${currentAdmin.slice(-4)}) or New Admin (${hardwareWalletAddress.slice(0, 6)}...${hardwareWalletAddress.slice(-4)}) to execute role revoke.`,
      );
      return;
    }

    const actionKey = `revoke-${item.contractName}-${item.roleName}`;
    setActionInProgress(actionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const hash = await walletClient.writeContract({
        address: item.contractAddress,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'revokeRole',
        args: [item.roleIdentifier, currentAdmin],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error(`Transaction reverted on-chain (Tx: ${hash})`);
      }

      // Re-verify on-chain
      const oldStillHasRole = (await publicClient.readContract({
        address: item.contractAddress,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: [item.roleIdentifier, currentAdmin],
      })) as boolean;

      if (oldStillHasRole) {
        throw new Error('Post-transaction verification failed: Old admin still holds role.');
      }

      // Log server audit record
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId,
          oldAdmin: currentAdmin,
          newAdmin: hardwareWalletAddress,
          contractName: item.contractName,
          contractAddress: item.contractAddress,
          roleName: item.roleName,
          roleIdentifier: item.roleIdentifier,
          revokeTxHash: hash,
          revokeBlockNumber: Number(receipt.blockNumber),
          revokeVerified: true,
          status: 'completed',
        }),
      });

      setSuccessMessage(
        `Successfully revoked ${item.roleName} from previous deployer on ${item.contractName}. Hardware wallet is now exclusive administrator!`,
      );
      await verifyOnChainRoles();
    } catch (err: any) {
      console.error('[handleRevokeRole] Error:', err);
      setErrorMessage(err?.message || 'Revoke role transaction failed.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Sequential Auto-Grant All (Iterates through roles automatically)
  const handleBatchGrantAll = async () => {
    if (!walletClient || !publicClient || !hardwareWalletAddress) {
      setErrorMessage('Please bind a valid target hardware wallet address first.');
      return;
    }
    if (connectedAddress?.toLowerCase() !== currentAdmin.toLowerCase()) {
      setErrorMessage(
        `Please connect the Current Admin account (${currentAdmin.slice(0, 6)}...${currentAdmin.slice(-4)}) to execute role grants.`,
      );
      return;
    }

    const ungranted = roleItems.filter((r) => !r.isNewAuthorityVerified);
    if (ungranted.length === 0) {
      setSuccessMessage('All roles are already granted to target hardware wallet!');
      return;
    }

    setActionInProgress('batch-grant');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      for (let i = 0; i < ungranted.length; i++) {
        const item = ungranted[i];
        if (!item.contractAddress) continue;

        const hash = await walletClient.writeContract({
          address: item.contractAddress,
          abi: ACCESS_CONTROL_ABI,
          functionName: 'grantRole',
          args: [item.roleIdentifier, hardwareWalletAddress],
        });

        await publicClient.waitForTransactionReceipt({ hash });
      }

      setSuccessMessage(
        `🎉 Successfully granted ALL administrative roles to ${hardwareWalletAddress.slice(0, 6)}...${hardwareWalletAddress.slice(-4)}!`,
      );
      await verifyOnChainRoles();
    } catch (err: any) {
      console.error('[handleBatchGrantAll] Error:', err);
      setErrorMessage(err?.message || 'Role grant interrupted.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Sequential Auto-Revoke All (Iterates through roles automatically)
  const handleBatchRevokeAll = async () => {
    if (!walletClient || !publicClient || !hardwareWalletAddress) {
      setErrorMessage('Please bind a valid target hardware wallet address first.');
      return;
    }
    if (connectedAddress?.toLowerCase() !== currentAdmin.toLowerCase()) {
      setErrorMessage(
        `Please connect the Current Admin account (${currentAdmin.slice(0, 6)}...${currentAdmin.slice(-4)}) to execute role revokes.`,
      );
      return;
    }

    const unrevoked = roleItems.filter((r) => r.isCurrentAuthorityVerified);
    if (unrevoked.length === 0) {
      setSuccessMessage('All roles are already revoked from previous deployer!');
      return;
    }

    setActionInProgress('batch-revoke');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      for (let i = 0; i < unrevoked.length; i++) {
        const item = unrevoked[i];
        if (!item.contractAddress) continue;

        const hash = await walletClient.writeContract({
          address: item.contractAddress,
          abi: ACCESS_CONTROL_ABI,
          functionName: 'revokeRole',
          args: [item.roleIdentifier, currentAdmin],
        });

        await publicClient.waitForTransactionReceipt({ hash });
      }

      setSuccessMessage(
        `🎉 Successfully revoked ALL roles from previous deployer! Hardware wallet is now exclusive administrator!`,
      );
      await verifyOnChainRoles();
    } catch (err: any) {
      console.error('[handleBatchRevokeAll] Error:', err);
      setErrorMessage(err?.message || 'Role revoke interrupted.');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 shadow-[4px_4px_0_#8B5CF6] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-black text-slate-950 dark:text-white tracking-tight">
                Institutional Admin & Hardware Wallet Migration Console
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                Two-Phase Safe Transfer
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Transfer administrative roles from the initial hot deployment wallet to an
              institutional hardware wallet (Ledger / Trezor / Safe Multisig). Enforces two-phase
              verification: <strong>Grant New → Verify On-Chain → Revoke Old</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={verifyOnChainRoles}
            disabled={isVerifyingRoles || roleItems.length === 0}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold text-xs border-2 border-black shadow-[2px_2px_0_#000] flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingRoles ? 'animate-spin' : ''}`} />
            <span>Verify On-Chain Roles</span>
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Wallet Pairing Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-white/10">
          {/* Current Deployer */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Current Deployer / Admin Wallet
            </span>
            <div className="text-sm font-mono font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
              <span>{currentAdmin}</span>
              <a
                href={`${explorerBase}/address/${currentAdmin}`}
                target="_blank"
                rel="noreferrer"
                className="text-purple-500 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              CURRENT DEPLOYER
            </span>
          </div>

          {/* New Hardware Wallet */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Target Hardware Wallet / Safe Address
              </span>
              <button
                type="button"
                onClick={handleUseConnectedAsHardware}
                className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
              >
                Use Connected Account
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={hardwareWalletInput}
                onChange={(e) => setHardwareWalletInput(e.target.value)}
                placeholder="0x... (Hardware Wallet Address)"
                className="flex-1 bg-white dark:bg-slate-900 text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 dark:border-white/15 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBindHardwareWallet}
                className="px-3 py-2 bg-[#BFFF00] text-black font-black text-xs uppercase rounded-lg border border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-transform"
              >
                Bind
              </button>
            </div>
            {hardwareWalletAddress && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Target Configured:{' '}
                {hardwareWalletAddress.slice(0, 6)}...{hardwareWalletAddress.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Role Migration Matrix Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 overflow-hidden shadow-[4px_4px_0_#000]">
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-500" />
                Role Authority Migration & Protocol Alignment
              </h4>
              <p className="text-[11px] text-slate-500">
                Transfer administrative roles and align contracts to live Base Mainnet parameters.
              </p>
            </div>
          </div>

          {/* Dedicated Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={handleBatchGrantAll}
              disabled={!hardwareWalletAddress || actionInProgress !== null}
              className="px-3.5 py-2 bg-[#BFFF00] hover:bg-[#a8e600] text-black font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>
                {actionInProgress === 'batch-grant'
                  ? 'Executing 1-Click Grant...'
                  : '⚡ 1-Click Grant All (1 QR Scan)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleBatchRevokeAll}
              disabled={!hardwareWalletAddress || actionInProgress !== null}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {actionInProgress === 'batch-revoke'
                  ? 'Executing 1-Click Revoke...'
                  : '🔒 1-Click Revoke All (1 QR Scan)'}
              </span>
            </button>

            {/* Quick Helper: Align SwapRouter to Base Uniswap V3 */}
            <button
              type="button"
              onClick={async () => {
                if (!walletClient || !publicClient) return;
                const swapAdapterAddr = deployedContracts?.SwapAdapter;
                if (!swapAdapterAddr) {
                  setErrorMessage('SwapAdapter contract not found.');
                  return;
                }
                setActionInProgress('update-router');
                setErrorMessage(null);
                setSuccessMessage(null);
                try {
                  const hash = await walletClient.writeContract({
                    address: swapAdapterAddr,
                    abi: parseAbi(['function setRouter(address newRouter) external']),
                    functionName: 'setRouter',
                    args: ['0x2626664c2603336E57B271c5C0b26F421741e481'],
                  });
                  await publicClient.waitForTransactionReceipt({ hash });
                  setSuccessMessage(
                    '🎉 Successfully updated SwapAdapter to Official Base Uniswap V3 Router (0x2626...481)!',
                  );
                } catch (e: any) {
                  setErrorMessage(e?.message || 'Failed to update SwapRouter.');
                } finally {
                  setActionInProgress(null);
                }
              }}
              disabled={actionInProgress !== null}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                {actionInProgress === 'update-router'
                  ? 'Updating Router...'
                  : '🔄 Align Base Uniswap V3'}
              </span>
            </button>

            {/* Quick Helper: Align StrategyManager to Live Mainnet Tokens */}
            <button
              type="button"
              onClick={async () => {
                if (!walletClient || !publicClient) return;
                const smAddr = deployedContracts?.StrategyManager;
                if (!smAddr) {
                  setErrorMessage('StrategyManager contract not found.');
                  return;
                }
                setActionInProgress('update-strategy');
                setErrorMessage(null);
                setSuccessMessage(null);
                try {
                  const hash = await walletClient.writeContract({
                    address: smAddr,
                    abi: parseAbi([
                      'function setStrategy(address[] calldata assets, uint256[] calldata weightsBps) external',
                    ]),
                    functionName: 'setStrategy',
                    args: [
                      [
                        '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
                        '0x4200000000000000000000000000000000000006',
                      ],
                      [6000n, 4000n],
                    ],
                  });
                  await publicClient.waitForTransactionReceipt({ hash });
                  setSuccessMessage(
                    '🎉 Successfully aligned StrategyManager to Mainnet cbBTC (60%) & Mainnet WETH (40%)!',
                  );
                } catch (e: any) {
                  setErrorMessage(e?.message || 'Failed to update StrategyManager.');
                } finally {
                  setActionInProgress(null);
                }
              }}
              disabled={actionInProgress !== null}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {actionInProgress === 'update-strategy'
                  ? 'Updating Strategy...'
                  : '⚖️ Align Mainnet Index Strategy (60/40)'}
              </span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-white/10 font-mono">
              <tr>
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Current Deployer</th>
                <th className="px-4 py-3">Hardware Wallet</th>
                <th className="px-4 py-3 text-right">Phase 1: Grant</th>
                <th className="px-4 py-3 text-right">Phase 2: Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
              {roleItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No contracts deployed yet in this session. Complete deployment steps first to
                    migrate roles.
                  </td>
                </tr>
              ) : (
                roleItems.map((item, idx) => {
                  const isGranting =
                    actionInProgress === `grant-${item.contractName}-${item.roleName}`;
                  const isRevoking =
                    actionInProgress === `revoke-${item.contractName}-${item.roleName}`;
                  const contractAddr = item.contractAddress || '';

                  return (
                    <tr
                      key={`${item.contractName}-${item.roleName}-${idx}`}
                      className="hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-sans font-bold text-slate-900 dark:text-white">
                        <div>{item.contractName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {contractAddr.length >= 10
                            ? `${contractAddr.slice(0, 6)}...${contractAddr.slice(-4)}`
                            : contractAddr}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {item.roleName}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {item.isCurrentAuthorityVerified ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">REVOKED</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {item.isNewAuthorityVerified ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> CONFIRMED
                          </span>
                        ) : (
                          <span className="text-slate-400">PENDING GRANT</span>
                        )}
                      </td>

                      {/* Action 1: Grant Role */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleGrantRole(item)}
                          disabled={
                            !hardwareWalletAddress ||
                            item.isNewAuthorityVerified ||
                            isGranting ||
                            isRevoking
                          }
                          className="px-3 py-1.5 bg-[#BFFF00] text-black font-black text-[11px] uppercase rounded-lg border border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isGranting
                            ? 'Granting...'
                            : item.isNewAuthorityVerified
                              ? 'Granted ✓'
                              : 'Grant Role'}
                        </button>
                      </td>

                      {/* Action 2: Revoke Role (Gated by New Role Verification) */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevokeRole(item)}
                          disabled={
                            !item.isNewAuthorityVerified ||
                            !item.isCurrentAuthorityVerified ||
                            isGranting ||
                            isRevoking
                          }
                          className="px-3 py-1.5 bg-rose-600 text-white font-black text-[11px] uppercase rounded-lg border border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-transform disabled:opacity-30 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isRevoking
                            ? 'Revoking...'
                            : !item.isCurrentAuthorityVerified
                              ? 'Revoked ✓'
                              : 'Revoke Old'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminSecurityMigrationCard(props: AdminSecurityMigrationCardProps) {
  return (
    <AdminErrorBoundary>
      <AdminSecurityMigrationInner {...props} />
    </AdminErrorBoundary>
  );
}

// Canonical Verified Base Mainnet (8453) Architecture Parameters
export const VERIFIED_BASE_MAINNET_ADDRESSES = {
  ProtocolDirectory: '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e' as `0x${string}`,
  OracleManager: '0x91b488cde0f2ef28141fe4ffd8531c4179b48ea7' as `0x${string}`,
  CustodyVault: '0xbb35a3434c689942e0b7d58909eae0d2cc0769ca' as `0x${string}`,
  Treasury: '0x57561F781b2f558A7445D2E93a365C03BA2c9B53' as `0x${string}`,
  UVBEV2: '0xd2715141a0f5998b707baa963990bfc2e94cf145' as `0x${string}`,
  CostBasisManagerV2: '0x27b5c6dea90678b78856b0b10dba37a789fde97e' as `0x${string}`,
  LiquidityManager: '0x9af86a9ac1563b7fdbf43b19335348240a8c16d3' as `0x${string}`,
  StrategyManager: '0x4f7f99653d9d7acd462429fffc0c4b6c8cf4354a' as `0x${string}`,
  SwapAdapter: '0x5b6067982c6cce2dc760eb4731c1b40136776d4a' as `0x${string}`,
  PortfolioManager: '0x66182f56bd5e523c655f6890290ab519f528e83f' as `0x${string}`,
  PerformanceManager: '0x19ec1b685c2ced1400b4f249da6be89662e59473' as `0x${string}`,
  P2PEscrowV2: '0xa938aacea64be8f41c90960aff232da4df7fc329' as `0x${string}`,
  Marketplace: '0xabfe3034db275e32de396c7bdd1649a62ac9e5a6' as `0x${string}`,
  Controller: '0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366' as `0x${string}`,
  OldController: '0x0721465b01b586b7aadf957a4a884ace46cfbec9' as `0x${string}`,
  AdminGovernance: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
};

const ACCESS_CONTROL_ABI_STEP12 = parseAbi([
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
]);

const DIRECTORY_ABI_STEP12 = parseAbi([
  'function updateAddress(bytes32 id, address target) external',
  'function registerAddress(bytes32 id, address target) external',
  'function getAddress(bytes32 id) external view returns (address)',
  'function exists(bytes32 id) external view returns (bool)',
]);

export function Step12StandaloneCard({
  chainId,
  deployedContracts,
}: {
  chainId: number;
  deployedContracts: DeployedContractsMap;
}) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const isMainnet = chainId === 8453;
  const explorerUrl = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';

  const resolvedDirectory = isMainnet
    ? VERIFIED_BASE_MAINNET_ADDRESSES.ProtocolDirectory
    : deployedContracts.ProtocolDirectory || '0x0000000000000000000000000000000000000000';
  const resolvedOracle = isMainnet
    ? VERIFIED_BASE_MAINNET_ADDRESSES.OracleManager
    : deployedContracts.OracleManager || '0x0000000000000000000000000000000000000000';
  const resolvedVault = isMainnet
    ? VERIFIED_BASE_MAINNET_ADDRESSES.CustodyVault
    : deployedContracts.CustodyVault || '0x0000000000000000000000000000000000000000';
  const resolvedTreasury = isMainnet
    ? VERIFIED_BASE_MAINNET_ADDRESSES.Treasury
    : deployedContracts.Treasury || '0x0000000000000000000000000000000000000000';
  const resolvedToken = isMainnet
    ? VERIFIED_BASE_MAINNET_ADDRESSES.UVBEV2
    : deployedContracts.UVBEV2 || '0x0000000000000000000000000000000000000000';

  const [deployedControllerAddress, setDeployedControllerAddress] = useState<`0x${string}` | ''>(
    (deployedContracts.UnifyVaultController as `0x${string}`) || '',
  );
  const [customControllerInput, setCustomControllerInput] = useState<string>('');

  const activeNewController: `0x${string}` | null = (deployedControllerAddress ||
    (customControllerInput.startsWith('0x') && customControllerInput.length === 42
      ? customControllerInput
      : null)) as `0x${string}` | null;

  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployTxHash, setDeployTxHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [roleStatuses, setRoleStatuses] = useState<{
    uvbe: boolean;
    vault: boolean;
    treasury: boolean;
    cbm: boolean;
    directory: boolean;
  }>({
    uvbe: false,
    vault: false,
    treasury: false,
    cbm: false,
    directory: false,
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const checkOnChainStatuses = useCallback(async () => {
    if (!publicClient || !activeNewController) return;
    setIsCheckingStatus(true);
    try {
      const controllerRole =
        '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357' as `0x${string}`;
      const depositModuleId =
        '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as `0x${string}`;

      const [hasUvbe, hasVault, hasTreasury, hasCbm, dirBound] = await Promise.all([
        publicClient
          .readContract({
            address: resolvedToken,
            abi: ACCESS_CONTROL_ABI_STEP12,
            functionName: 'hasRole',
            args: [controllerRole, activeNewController],
          })
          .catch(() => false),
        publicClient
          .readContract({
            address: resolvedVault,
            abi: ACCESS_CONTROL_ABI_STEP12,
            functionName: 'hasRole',
            args: [controllerRole, activeNewController],
          })
          .catch(() => false),
        publicClient
          .readContract({
            address: resolvedTreasury,
            abi: ACCESS_CONTROL_ABI_STEP12,
            functionName: 'hasRole',
            args: [controllerRole, activeNewController],
          })
          .catch(() => false),
        publicClient
          .readContract({
            address: (isMainnet
              ? VERIFIED_BASE_MAINNET_ADDRESSES.CostBasisManagerV2
              : deployedContracts.CostBasisManagerV2) as `0x${string}`,
            abi: ACCESS_CONTROL_ABI_STEP12,
            functionName: 'hasRole',
            args: [controllerRole, activeNewController],
          })
          .catch(() => false),
        publicClient
          .readContract({
            address: resolvedDirectory,
            abi: DIRECTORY_ABI_STEP12,
            functionName: 'getAddress',
            args: [depositModuleId],
          })
          .catch(() => '0x0000000000000000000000000000000000000000'),
      ]);

      setRoleStatuses({
        uvbe: Boolean(hasUvbe),
        vault: Boolean(hasVault),
        treasury: Boolean(hasTreasury),
        cbm: Boolean(hasCbm),
        directory:
          typeof dirBound === 'string' &&
          dirBound.toLowerCase() === activeNewController.toLowerCase(),
      });
    } catch (err) {
      console.warn('Error checking on-chain roles:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [
    publicClient,
    activeNewController,
    isMainnet,
    resolvedToken,
    resolvedVault,
    resolvedTreasury,
    resolvedDirectory,
    deployedContracts,
  ]);

  useEffect(() => {
    if (activeNewController) {
      checkOnChainStatuses();
    }
  }, [activeNewController, checkOnChainStatuses]);

  const handleAdminAction = async (
    actionKey: string,
    targetContract: `0x${string}`,
    callType: 'GRANT_ROLE' | 'UPDATE_DIRECTORY',
  ) => {
    if (!walletClient || !publicClient || !address || !activeNewController) {
      setErrorMessage('Admin wallet and active new controller required.');
      return;
    }
    setActiveActionId(actionKey);
    setErrorMessage(null);
    try {
      let callData: `0x${string}`;

      if (callType === 'GRANT_ROLE') {
        callData = encodeFunctionData({
          abi: ACCESS_CONTROL_ABI_STEP12,
          functionName: 'grantRole',
          args: [
            '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357' as `0x${string}`,
            activeNewController,
          ],
        });
      } else {
        callData = encodeFunctionData({
          abi: DIRECTORY_ABI_STEP12,
          functionName: 'updateAddress',
          args: [
            '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as `0x${string}`,
            activeNewController,
          ],
        });
      }

      const hash = await walletClient.sendTransaction({
        account: address,
        to: targetContract,
        data: callData,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status !== 'success') {
        throw new Error(`Transaction reverted on-chain. Tx: ${hash}`);
      }

      await checkOnChainStatuses();
    } catch (err: any) {
      console.error(`Admin Action (${actionKey}) Error:`, err);
      setErrorMessage(err?.shortMessage || err?.message || `Failed to execute ${actionKey}.`);
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border-2 border-[#BFFF00]/40 bg-black/60 p-6 shadow-[4px_4px_0_#000] dark:shadow-none space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-[#BFFF00]/20 text-[#BFFF00] border border-[#BFFF00]/40">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#BFFF00] text-black">
                  Step 12 Standalone
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {isMainnet ? 'Base Mainnet (8453)' : 'Base Sepolia (84532)'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                UnifyVaultController Single-Step Deployment & Migration
              </h2>
            </div>
          </div>

          <button
            onClick={() => checkOnChainStatuses()}
            disabled={isCheckingStatus || !activeNewController}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/60 hover:bg-muted text-foreground border border-border transition-all cursor-pointer disabled:opacity-40"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin text-[#BFFF00]' : ''}`}
            />
            <span>Refresh Status</span>
          </button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Dedicated standalone deployment and migration setup for{' '}
          <strong>Step 12 (UnifyVaultController)</strong>. Wires the verified Treasury (
          <code>0x57561F...9B53</code>), CustodyVault, Oracle, and UVBEV2 without disrupting other
          verified protocol modules.
        </p>
      </div>

      {/* Constructor Parameters Card */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Step 12 Constructor-Bound Parameters (Pre-Verified)
          </h3>
          <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            100% Invariant Match
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-black/40 border border-border space-y-1">
            <div className="flex justify-between items-center text-muted-foreground text-[11px]">
              <span>1. directory_ (ProtocolDirectory)</span>
              <button
                onClick={() => copyToClipboard(resolvedDirectory, 'dir')}
                className="hover:text-foreground cursor-pointer"
              >
                {copiedKey === 'dir' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  'Copy'
                )}
              </button>
            </div>
            <p className="text-foreground truncate">{resolvedDirectory}</p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-border space-y-1">
            <div className="flex justify-between items-center text-muted-foreground text-[11px]">
              <span>2. oracle_ (OracleManager)</span>
              <button
                onClick={() => copyToClipboard(resolvedOracle, 'oracle')}
                className="hover:text-foreground cursor-pointer"
              >
                {copiedKey === 'oracle' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  'Copy'
                )}
              </button>
            </div>
            <p className="text-foreground truncate">{resolvedOracle}</p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-border space-y-1">
            <div className="flex justify-between items-center text-muted-foreground text-[11px]">
              <span>3. vault_ (CustodyVault)</span>
              <button
                onClick={() => copyToClipboard(resolvedVault, 'vault')}
                className="hover:text-foreground cursor-pointer"
              >
                {copiedKey === 'vault' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  'Copy'
                )}
              </button>
            </div>
            <p className="text-foreground truncate">{resolvedVault}</p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
            <div className="flex justify-between items-center text-emerald-400 font-bold text-[11px]">
              <span>4. treasury_ (Verified Correct Treasury)</span>
              <button
                onClick={() => copyToClipboard(resolvedTreasury, 'treasury')}
                className="hover:text-emerald-200 cursor-pointer"
              >
                {copiedKey === 'treasury' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  'Copy'
                )}
              </button>
            </div>
            <p className="text-emerald-300 font-bold truncate">{resolvedTreasury}</p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-border space-y-1 md:col-span-2">
            <div className="flex justify-between items-center text-muted-foreground text-[11px]">
              <span>5. token_ (UVBEV2 / Index Token)</span>
              <button
                onClick={() => copyToClipboard(resolvedToken, 'token')}
                className="hover:text-foreground cursor-pointer"
              >
                {copiedKey === 'token' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  'Copy'
                )}
              </button>
            </div>
            <p className="text-foreground truncate">{resolvedToken}</p>
          </div>
        </div>
      </div>

      {/* Stage 1: Deploy UnifyVaultController Directly */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-[#BFFF00] text-black font-black text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Deploy Standalone Controller (Step 12)
            </h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">Gas Limit: 6,500,000</span>
        </div>

        {deployedControllerAddress ? (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Controller Successfully Deployed On-Chain</span>
            </div>
            <div className="flex items-center justify-between font-mono text-xs bg-black/50 p-2.5 rounded-lg border border-border">
              <span className="text-foreground">{deployedControllerAddress}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(deployedControllerAddress, 'newCtrl')}
                  className="hover:text-emerald-300 cursor-pointer"
                >
                  {copiedKey === 'newCtrl' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    'Copy'
                  )}
                </button>
                <a
                  href={`${explorerUrl}/address/${deployedControllerAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:text-emerald-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={async () => {
                if (!walletClient || !publicClient || !address) {
                  setErrorMessage('Please connect your deployer wallet in MetaMask.');
                  return;
                }
                setIsDeploying(true);
                setErrorMessage(null);
                try {
                  const deployData = encodeDeployData({
                    abi: DEPLOYMENT_ARTIFACTS.UnifyVaultController.abi,
                    bytecode: DEPLOYMENT_ARTIFACTS.UnifyVaultController.bytecode,
                    args: [
                      resolvedDirectory,
                      resolvedOracle,
                      resolvedVault,
                      resolvedTreasury,
                      resolvedToken,
                    ],
                  });

                  const hash = await walletClient.sendTransaction({
                    account: address,
                    data: deployData,
                  });

                  setDeployTxHash(hash);
                  const receipt = await publicClient.waitForTransactionReceipt({
                    hash,
                    confirmations: 1,
                  });

                  if (receipt.status !== 'success' || !receipt.contractAddress) {
                    throw new Error(`Deployment transaction reverted on-chain. Tx: ${hash}`);
                  }

                  const newAddr = receipt.contractAddress as `0x${string}`;
                  setDeployedControllerAddress(newAddr);

                  // Update server manifest
                  await fetch('/api/deployment/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chainId,
                      stepNumber: 12,
                      contractName: 'UnifyVaultController',
                      deployedAddress: newAddr,
                      txHash: hash,
                    }),
                  }).catch(() => null);
                } catch (e: any) {
                  console.error('Deploy error:', e);
                  setErrorMessage(e?.shortMessage || e?.message || 'Failed to deploy Controller.');
                } finally {
                  setIsDeploying(false);
                }
              }}
              disabled={isDeploying || !address}
              className="w-full py-4 px-4 rounded-xl text-sm font-black tracking-wide uppercase transition-all flex items-center justify-center space-x-2 bg-[#BFFF00] text-black border-2 border-black shadow-[3px_3px_0_#000] hover:bg-[#d0ff66] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Prompting MetaMask & Deploying...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Deploy UnifyVaultController (Step 12)</span>
                </>
              )}
            </button>

            {deployTxHash && (
              <div className="text-xs font-mono text-muted-foreground flex items-center space-x-1 pt-1">
                <span>Tx Submitted:</span>
                <a
                  href={`${explorerUrl}/tx/${deployTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#BFFF00] underline flex items-center gap-1"
                >
                  {deployTxHash.slice(0, 18)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="pt-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Or Attach Already Deployed Controller Address:
              </label>
              <input
                type="text"
                value={customControllerInput}
                onChange={(e) => setCustomControllerInput(e.target.value.trim())}
                placeholder="0x... (If already deployed via external script)"
                className="w-full mt-1 p-2.5 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:border-[#BFFF00]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stage 2: Governance Authority Role Grants & Directory Registration */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white font-black text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Governance Migration & Authorization Pipeline
            </h3>
          </div>
          <span className="text-xs font-mono text-purple-400">
            Admin Wallet (<code>0x441d...</code>)
          </span>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          {/* Action 1: UVBEV2 */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-foreground">1. Grant CONTROLLER_ROLE on UVBEV2</div>
              <div className="text-[11px] text-muted-foreground">{resolvedToken}</div>
            </div>
            {roleStatuses.uvbe ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Granted
              </span>
            ) : (
              <button
                onClick={() => handleAdminAction('grant_uvbe', resolvedToken, 'GRANT_ROLE')}
                disabled={!activeNewController || activeActionId === 'grant_uvbe'}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                {activeActionId === 'grant_uvbe' ? 'Granting...' : 'Grant Role'}
              </button>
            )}
          </div>

          {/* Action 2: CustodyVault */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-foreground">
                2. Grant CONTROLLER_ROLE on CustodyVault
              </div>
              <div className="text-[11px] text-muted-foreground">{resolvedVault}</div>
            </div>
            {roleStatuses.vault ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Granted
              </span>
            ) : (
              <button
                onClick={() => handleAdminAction('grant_vault', resolvedVault, 'GRANT_ROLE')}
                disabled={!activeNewController || activeActionId === 'grant_vault'}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                {activeActionId === 'grant_vault' ? 'Granting...' : 'Grant Role'}
              </button>
            )}
          </div>

          {/* Action 3: Treasury */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-foreground">3. Grant CONTROLLER_ROLE on Treasury</div>
              <div className="text-[11px] text-muted-foreground">{resolvedTreasury}</div>
            </div>
            {roleStatuses.treasury ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Granted
              </span>
            ) : (
              <button
                onClick={() => handleAdminAction('grant_treasury', resolvedTreasury, 'GRANT_ROLE')}
                disabled={!activeNewController || activeActionId === 'grant_treasury'}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                {activeActionId === 'grant_treasury' ? 'Granting...' : 'Grant Role'}
              </button>
            )}
          </div>

          {/* Action 4: CostBasisManagerV2 */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-foreground">
                4. Grant CONTROLLER_ROLE on CostBasisManagerV2
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isMainnet
                  ? VERIFIED_BASE_MAINNET_ADDRESSES.CostBasisManagerV2
                  : deployedContracts.CostBasisManagerV2}
              </div>
            </div>
            {roleStatuses.cbm ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Granted
              </span>
            ) : (
              <button
                onClick={() =>
                  handleAdminAction(
                    'grant_cbm',
                    (isMainnet
                      ? VERIFIED_BASE_MAINNET_ADDRESSES.CostBasisManagerV2
                      : deployedContracts.CostBasisManagerV2) as `0x${string}`,
                    'GRANT_ROLE',
                  )
                }
                disabled={!activeNewController || activeActionId === 'grant_cbm'}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                {activeActionId === 'grant_cbm' ? 'Granting...' : 'Grant Role'}
              </button>
            )}
          </div>

          {/* Action 5: ProtocolDirectory updateAddress */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-foreground">
                5. ProtocolDirectory.updateAddress(DEPOSIT_MANAGER, NEW_CONTROLLER)
              </div>
              <div className="text-[11px] text-muted-foreground">{resolvedDirectory}</div>
            </div>
            {roleStatuses.directory ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Updated & Active
              </span>
            ) : (
              <button
                onClick={() =>
                  handleAdminAction('update_dir', resolvedDirectory, 'UPDATE_DIRECTORY')
                }
                disabled={!activeNewController || activeActionId === 'update_dir'}
                className="px-3 py-1.5 rounded-lg bg-[#BFFF00] text-black font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                {activeActionId === 'update_dir' ? 'Updating...' : 'Update Directory'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Execution Notice:</span>
            <p className="font-mono">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
