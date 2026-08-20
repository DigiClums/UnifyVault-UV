'use client';

import React, { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { isAddress } from 'viem';
import {
  DEPLOYED_ACCESS_CONTROL_CONTRACTS,
  FULL_PROTOCOL_DIRECTORY_ABI,
  ContractRoleCatalogEntry,
} from '../../lib/contracts/governance';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { GovernanceConfirmationModal } from './GovernanceConfirmationModal';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Search,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
} from 'lucide-react';

export interface RBACManagerConsoleProps {
  explorerBaseUrl: string;
  onRefresh: () => void;
}

export function RBACManagerConsole({ explorerBaseUrl, onRefresh }: RBACManagerConsoleProps) {
  const { address: connectedAddress } = useAccount();

  // Selected Contract & Inspected Account State
  const [selectedContractIndex, setSelectedContractIndex] = useState<number>(0);
  const [inspectedAccount, setInspectedAccount] = useState<string>('');
  const [targetAccountInput, setTargetAccountInput] = useState<string>('');
  const [selectedRoleHash, setSelectedRoleHash] = useState<`0x${string}` | ''>('');

  // Confirmation Modal State
  const [modalAction, setModalAction] = useState<'grant' | 'revoke' | null>(null);

  const selectedContract: ContractRoleCatalogEntry =
    DEPLOYED_ACCESS_CONTROL_CONTRACTS[selectedContractIndex] ||
    DEPLOYED_ACCESS_CONTROL_CONTRACTS[0];

  const targetInspectAddress =
    inspectedAccount && isAddress(inspectedAccount)
      ? (inspectedAccount as `0x${string}`)
      : (connectedAddress as `0x${string}` | undefined);

  // Read hasRole for each supported role on the selected contract for the inspected account
  // Read getRoleAdmin for each supported role
  // Read hasRole for the administering role for the connected wallet
  const roleCalls = selectedContract.supportedRoles.flatMap((r) => [
    // 0: hasRole(role, targetInspectAddress)
    {
      address: selectedContract.address,
      abi: FULL_PROTOCOL_DIRECTORY_ABI,
      functionName: 'hasRole' as const,
      args: targetInspectAddress ? [r.roleHash, targetInspectAddress] : undefined,
    },
    // 1: getRoleAdmin(role)
    {
      address: selectedContract.address,
      abi: FULL_PROTOCOL_DIRECTORY_ABI,
      functionName: 'getRoleAdmin' as const,
      args: [r.roleHash] as const,
    },
    // 2: hasRole(DEFAULT_ADMIN_ROLE, connectedAddress)
    {
      address: selectedContract.address,
      abi: FULL_PROTOCOL_DIRECTORY_ABI,
      functionName: 'hasRole' as const,
      args: connectedAddress
        ? [
            '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
            connectedAddress,
          ]
        : undefined,
    },
  ]);

  const {
    data: roleData,
    isLoading: isRoleLoading,
    refetch: refetchRoles,
  } = useReadContracts({
    contracts: roleCalls,
    query: {
      enabled: !!selectedContract.address && (!!targetInspectAddress || !!connectedAddress),
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  // Write contract hook
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isTxSuccess) {
      refetchRoles();
      onRefresh();
    }
  }, [isTxSuccess, refetchRoles, onRefresh]);

  const handleOpenGrant = (roleHash: `0x${string}`) => {
    resetWrite();
    setSelectedRoleHash(roleHash);
    setTargetAccountInput(inspectedAccount || connectedAddress || '');
    setModalAction('grant');
  };

  const handleOpenRevoke = (roleHash: `0x${string}`) => {
    resetWrite();
    setSelectedRoleHash(roleHash);
    setTargetAccountInput(inspectedAccount || connectedAddress || '');
    setModalAction('revoke');
  };

  const executeRoleAction = () => {
    if (!selectedRoleHash || !isAddress(targetAccountInput) || !selectedContract.address) return;

    if (modalAction === 'grant') {
      writeContract({
        address: selectedContract.address,
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'grantRole',
        args: [selectedRoleHash, targetAccountInput as `0x${string}`],
      });
    } else if (modalAction === 'revoke') {
      writeContract({
        address: selectedContract.address,
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'revokeRole',
        args: [selectedRoleHash, targetAccountInput as `0x${string}`],
      });
    }
  };

  const decodedError = writeError ? decodeTransactionError(writeError) : null;

  return (
    <div className="space-y-6">
      {/* Top Filter & Target Selector */}
      <div className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                Role-Based Access Control (RBAC) Inspector
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect on-chain role assignments and administer permissions across protocol
              contracts.
            </p>
          </div>

          <a
            href={`${explorerBaseUrl}/address/${selectedContract.address}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-card border border-border-subtle text-xs text-purple-400 hover:text-purple-300 font-mono transition-colors shrink-0"
          >
            <span>{`${selectedContract.address.slice(0, 6)}...${selectedContract.address.slice(-4)}`}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Contract Selector */}
          <div>
            <label className="block text-muted-foreground font-semibold mb-1">
              Select Deployed Smart Contract
            </label>
            <select
              value={selectedContractIndex}
              onChange={(e) => setSelectedContractIndex(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px]"
            >
              {DEPLOYED_ACCESS_CONTROL_CONTRACTS.map((contract, idx) => (
                <option key={contract.address} value={idx}>
                  {contract.name} ({contract.category}) — {contract.address.slice(0, 8)}...
                </option>
              ))}
            </select>
          </div>

          {/* Account Inspector Input */}
          <div>
            <label className="block text-muted-foreground font-semibold mb-1">
              Inspect Target Wallet / Account
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={connectedAddress || '0x... (Defaults to connected wallet)'}
                value={inspectedAccount}
                onChange={(e) => setInspectedAccount(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px]"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Transaction Feedback */}
      {isTxWaiting && txHash && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>Role mutation transaction broadcasted. Confirming on Base Sepolia...</span>
          </div>
          <a
            href={`${explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 underline font-mono text-blue-300 hover:text-blue-200"
          >
            <span>BaseScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {isTxSuccess && txHash && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Role mutation successfully executed on-chain!</span>
          </div>
          <a
            href={`${explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 underline font-mono text-emerald-300 hover:text-emerald-200"
          >
            <span>BaseScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {decodedError && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center space-x-2.5 text-xs font-semibold shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{decodedError.message}</span>
        </div>
      )}

      {/* Role Matrix for Selected Contract */}
      <div className="rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border-subtle/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {selectedContract.name} — Supported Roles Matrix
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Inspecting Address:{' '}
              <code className="text-purple-400 font-mono">
                {targetInspectAddress || 'Not Connected'}
              </code>
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono font-bold">
            {selectedContract.supportedRoles.length} Roles Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Role Identifier</th>
                <th className="py-3 px-4">Role Hash (bytes32)</th>
                <th className="py-3 px-4">Inspected Status</th>
                <th className="py-3 px-4">Admin Authority</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {selectedContract.supportedRoles.map((roleDef, idx) => {
                const baseIdx = idx * 3;
                const hasRoleResult = Boolean(roleData?.[baseIdx]?.result);
                const roleAdminHash = (roleData?.[baseIdx + 1]?.result as `0x${string}`) || '0x0';
                const isWalletAdmin = Boolean(roleData?.[baseIdx + 2]?.result);

                return (
                  <tr key={roleDef.roleHash} className="hover:bg-card/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                      <div className="flex items-center space-x-2">
                        <span>{roleDef.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {roleDef.roleHash ===
                      '0x0000000000000000000000000000000000000000000000000000000000000000'
                        ? '0x00...00 (DEFAULT_ADMIN)'
                        : `${roleDef.roleHash.slice(0, 10)}...${roleDef.roleHash.slice(-8)}`}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {hasRoleResult ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <UserCheck className="w-3 h-3" />
                          <span>GRANTED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                          <UserX className="w-3 h-3" />
                          <span>NOT GRANTED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {isWalletAdmin ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <ShieldCheck className="w-3 h-3" />
                          <span>AUTHORIZED TO ADMIN</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <ShieldAlert className="w-3 h-3" />
                          <span>UNAUTHORIZED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenGrant(roleDef.roleHash)}
                          disabled={!isWalletAdmin}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-colors disabled:opacity-40"
                          title={
                            !isWalletAdmin
                              ? 'Connected wallet lacks administering role on this contract'
                              : 'Grant role to account'
                          }
                        >
                          Grant
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRevoke(roleDef.roleHash)}
                          disabled={!isWalletAdmin}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-colors disabled:opacity-40"
                          title={
                            !isWalletAdmin
                              ? 'Connected wallet lacks administering role on this contract'
                              : 'Revoke role from account'
                          }
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <GovernanceConfirmationModal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        onConfirm={executeRoleAction}
        isPending={isWritePending || isTxWaiting}
        title={modalAction === 'grant' ? 'Grant AccessControl Role' : 'Revoke AccessControl Role'}
        description={`Perform on-chain role administration on ${selectedContract.name}.`}
        actionLabel={modalAction === 'grant' ? 'Confirm Grant Role' : 'Confirm Revoke Role'}
        actionColor={modalAction === 'revoke' ? 'rose' : 'emerald'}
        warningMessage={
          modalAction === 'revoke'
            ? 'WARNING: Revoking a critical role may permanently disable module administration if no other admin account exists.'
            : undefined
        }
        details={[
          { label: 'Target Contract', value: selectedContract.name },
          { label: 'Contract Address', value: selectedContract.address },
          {
            label: 'Role Name',
            value: (
              <span className="font-bold text-purple-400">
                {selectedContract.supportedRoles.find((r) => r.roleHash === selectedRoleHash)
                  ?.name || selectedRoleHash}
              </span>
            ),
          },
          {
            label: 'Role Hash',
            value: selectedRoleHash || '0x0',
          },
          {
            label: 'Target Account',
            value: (
              <input
                type="text"
                placeholder="0x..."
                value={targetAccountInput}
                onChange={(e) => setTargetAccountInput(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            ),
          },
        ]}
      />
    </div>
  );
}
