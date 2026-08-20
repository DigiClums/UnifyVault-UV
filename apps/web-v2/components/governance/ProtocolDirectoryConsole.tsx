'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { FULL_PROTOCOL_DIRECTORY_ABI } from '../../lib/contracts/governance';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { GovernanceConfirmationModal } from './GovernanceConfirmationModal';
import { StatusBadge } from '../ui/StatusBadge';
import {
  FolderLock,
  PlusCircle,
  RefreshCw,
  Trash2,
  Lock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { ModuleEntryState } from '../../hooks/useGovernanceConsole';

export interface ProtocolDirectoryConsoleProps {
  directoryAddress: `0x${string}`;
  isDirectoryFrozen: boolean;
  modules: ModuleEntryState[];
  isGovAdmin: boolean;
  explorerBaseUrl: string;
  onRefresh: () => void;
}

export function ProtocolDirectoryConsole({
  directoryAddress,
  isDirectoryFrozen,
  modules,
  isGovAdmin,
  explorerBaseUrl,
  onRefresh,
}: ProtocolDirectoryConsoleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State
  const [modalType, setModalType] = useState<'register' | 'update' | 'remove' | 'freeze' | null>(
    null,
  );
  const [selectedModule, setSelectedModule] = useState<ModuleEntryState | null>(null);
  const [targetInput, setTargetInput] = useState('');
  const [customIdInput, setCustomIdInput] = useState('');

  // Write Contract Hooks
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
      onRefresh();
    }
  }, [isTxSuccess, onRefresh]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenRegister = (mod?: ModuleEntryState) => {
    resetWrite();
    if (mod) {
      setSelectedModule(mod);
      setCustomIdInput(mod.id);
      setTargetInput(mod.targetAddress || '');
    } else {
      setSelectedModule(null);
      setCustomIdInput('');
      setTargetInput('');
    }
    setModalType('register');
  };

  const handleOpenUpdate = (mod: ModuleEntryState) => {
    resetWrite();
    setSelectedModule(mod);
    setCustomIdInput(mod.id);
    setTargetInput(mod.targetAddress || '');
    setModalType('update');
  };

  const handleOpenRemove = (mod: ModuleEntryState) => {
    resetWrite();
    setSelectedModule(mod);
    setCustomIdInput(mod.id);
    setModalType('remove');
  };

  const handleOpenFreeze = () => {
    resetWrite();
    setModalType('freeze');
  };

  const executeAction = () => {
    if (!isGovAdmin || (isDirectoryFrozen && modalType !== null)) return;

    if (modalType === 'register') {
      const id = (selectedModule?.id || customIdInput) as `0x${string}`;
      if (!id || !isAddress(targetInput)) return;
      writeContract({
        address: directoryAddress,
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'registerAddress',
        args: [id, targetInput as `0x${string}`],
      });
    } else if (modalType === 'update') {
      if (!selectedModule || !isAddress(targetInput)) return;
      writeContract({
        address: directoryAddress,
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'updateAddress',
        args: [selectedModule.id, targetInput as `0x${string}`],
      });
    } else if (modalType === 'remove') {
      if (!selectedModule) return;
      writeContract({
        address: directoryAddress,
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'removeAddress',
        args: [selectedModule.id],
      });
    } else if (modalType === 'freeze') {
      writeContract({
        address: directoryAddress,
        abi: FULL_PROTOCOL_DIRECTORY_ABI,
        functionName: 'freeze',
      });
    }
  };

  const filteredModules = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.targetAddress && m.targetAddress.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const decodedError = writeError ? decodeTransactionError(writeError) : null;

  return (
    <div className="space-y-6">
      {/* Directory Status Header Banner */}
      <div className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div
            className={`p-3 rounded-xl border ${
              isDirectoryFrozen
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <FolderLock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                Canonical Protocol Directory
              </h2>
              <StatusBadge
                status={isDirectoryFrozen ? 'Paused' : 'Active'}
                label={isDirectoryFrozen ? 'PERMANENTLY FROZEN' : 'ACTIVE / MUTABLE'}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contract Address:{' '}
              <code className="font-mono text-purple-400 text-[11px]">{directoryAddress}</code>
            </p>
          </div>
        </div>

        {/* Global Directory Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => handleOpenRegister()}
            disabled={!isGovAdmin || isDirectoryFrozen}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-xs font-bold text-white shadow-glow transition-all min-h-[38px]"
            title={
              !isGovAdmin
                ? 'Requires GOVERNANCE_ROLE on ProtocolDirectory'
                : isDirectoryFrozen
                  ? 'Directory is permanently frozen'
                  : 'Register a new module identifier'
            }
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Custom Module</span>
          </button>

          {!isDirectoryFrozen && (
            <button
              type="button"
              onClick={handleOpenFreeze}
              disabled={!isGovAdmin}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 disabled:opacity-40 text-rose-300 text-xs font-semibold transition-all min-h-[38px]"
              title={
                !isGovAdmin
                  ? 'Requires GOVERNANCE_ROLE on ProtocolDirectory'
                  : 'Permanently freeze the registry'
              }
            >
              <Lock className="w-4 h-4 text-rose-400" />
              <span>Freeze Registry</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Transaction Feedback */}
      {isTxWaiting && txHash && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>Governance mutation broadcasted. Confirming on Base Sepolia...</span>
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
            <span>Protocol Directory successfully updated on-chain!</span>
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

      {/* Directory Search & Table */}
      <div className="rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border-subtle/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-foreground font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Registered Protocol Modules ({modules.length})</span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search module name, ID, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-card border border-border-subtle text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Module Name</th>
                <th className="py-3 px-4">Module Identifier (bytes32)</th>
                <th className="py-3 px-4">Target Contract Address</th>
                <th className="py-3 px-4">Registry State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground font-sans">
                    No matching protocol modules found.
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-card/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span>{mod.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          {mod.description}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 text-muted-foreground">
                        <span>{`${mod.id.slice(0, 10)}...${mod.id.slice(-8)}`}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(mod.id, `id-${mod.id}`)}
                          className="p-1 rounded hover:bg-card hover:text-foreground text-muted-foreground transition-colors"
                          title="Copy bytes32 ID"
                        >
                          {copiedKey === `id-${mod.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {mod.targetAddress ? (
                        <div className="flex items-center space-x-1.5">
                          <a
                            href={`${explorerBaseUrl}/address/${mod.targetAddress}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-400 hover:text-purple-300 underline"
                          >
                            {`${mod.targetAddress.slice(0, 6)}...${mod.targetAddress.slice(-4)}`}
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(mod.targetAddress!, `addr-${mod.targetAddress}`)
                            }
                            className="p-1 rounded hover:bg-card hover:text-foreground text-muted-foreground transition-colors"
                            title="Copy Address"
                          >
                            {copiedKey === `addr-${mod.targetAddress}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unregistered</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {mod.isRegistered ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          REGISTERED
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          UNREGISTERED (FALLBACK)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end space-x-1.5">
                        {mod.isRegistered ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenUpdate(mod)}
                              disabled={!isGovAdmin || isDirectoryFrozen}
                              className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border-subtle text-foreground hover:text-purple-400 transition-colors disabled:opacity-40"
                              title={
                                !isGovAdmin
                                  ? 'Requires GOVERNANCE_ROLE'
                                  : isDirectoryFrozen
                                    ? 'Directory is frozen'
                                    : 'Update registered address'
                              }
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRemove(mod)}
                              disabled={!isGovAdmin || isDirectoryFrozen}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors disabled:opacity-40"
                              title={
                                !isGovAdmin
                                  ? 'Requires GOVERNANCE_ROLE'
                                  : isDirectoryFrozen
                                    ? 'Directory is frozen'
                                    : 'Remove registered address'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenRegister(mod)}
                            disabled={!isGovAdmin || isDirectoryFrozen}
                            className="px-2.5 py-1 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[11px] font-semibold transition-colors disabled:opacity-40"
                            title={
                              !isGovAdmin
                                ? 'Requires GOVERNANCE_ROLE'
                                : isDirectoryFrozen
                                  ? 'Directory is frozen'
                                  : 'Register address in on-chain directory'
                            }
                          >
                            Register
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation & Action Modal */}
      <GovernanceConfirmationModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        onConfirm={executeAction}
        isPending={isWritePending || isTxWaiting}
        title={
          modalType === 'register'
            ? 'Register Module Address'
            : modalType === 'update'
              ? 'Update Module Address'
              : modalType === 'remove'
                ? 'Remove Module Address'
                : 'Freeze Protocol Directory'
        }
        description={
          modalType === 'freeze'
            ? 'Freezing the directory is a one-way immutable operation.'
            : 'Authorize on-chain Protocol Directory mutation.'
        }
        actionLabel={
          modalType === 'register'
            ? 'Register Address'
            : modalType === 'update'
              ? 'Update Address'
              : modalType === 'remove'
                ? 'Remove Entry'
                : 'Freeze Permanently'
        }
        actionColor={modalType === 'freeze' || modalType === 'remove' ? 'rose' : 'purple'}
        warningMessage={
          modalType === 'freeze'
            ? 'WARNING: Freezing will permanently disable registerAddress, updateAddress, and removeAddress. No new addresses can ever be registered.'
            : undefined
        }
        details={[
          {
            label: 'Action Type',
            value: (
              <span className="uppercase font-bold text-purple-400">{modalType || 'None'}</span>
            ),
          },
          {
            label: 'Module Name',
            value: selectedModule?.name || 'Custom Module',
          },
          {
            label: 'Module ID (bytes32)',
            value: (selectedModule?.id || customIdInput || '0x0') as `0x${string}`,
          },
          ...(modalType === 'register' || modalType === 'update'
            ? [
                {
                  label: 'Target Address',
                  value: (
                    <input
                      type="text"
                      placeholder="0x..."
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  ),
                },
              ]
            : []),
          ...(modalType === 'register' && !selectedModule
            ? [
                {
                  label: 'Custom Module ID (bytes32)',
                  value: (
                    <input
                      type="text"
                      placeholder="0x..."
                      value={customIdInput}
                      onChange={(e) => setCustomIdInput(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
