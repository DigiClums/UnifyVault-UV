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
} from 'lucide-react';
import { isAddress, encodeFunctionData, parseAbi, type Address } from 'viem';
import { getContractRolesMatrix } from '../../lib/admin/adminRolesMatrix';
import type { ContractRoleMigrationItem, AdminMigrationAuditRecord } from '../../lib/admin/types';
import type { DeployedContractsMap } from '../../lib/deployment/types';
import { getExplorerBaseUrl } from '../../constants';

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
    if (connectedAddress?.toLowerCase() !== currentAdmin.toLowerCase()) {
      setErrorMessage(
        `Please connect the Current Admin account (${currentAdmin.slice(0, 6)}...${currentAdmin.slice(-4)}) to execute role revoke.`,
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
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-500" />
              Role Authority Migration Matrix
            </h4>
            <p className="text-[11px] text-slate-500">
              Each administrative role must be verified on-chain before granting or revoking.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {roleItems.filter((r) => r.status === 'completed').length} / {roleItems.length} Roles
            Migrated
          </span>
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
