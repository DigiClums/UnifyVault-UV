'use client';

import React, { useState } from 'react';
import { useGovernanceConsole } from '../../../hooks/useGovernanceConsole';
import { ProtocolDirectoryConsole } from '../../../components/governance/ProtocolDirectoryConsole';
import { RBACManagerConsole } from '../../../components/governance/RBACManagerConsole';
import { TimelockConsole } from '../../../components/governance/TimelockConsole';
import { EmergencyGovernanceView } from '../../../components/governance/EmergencyGovernanceView';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  FolderLock,
  Key,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Server,
} from 'lucide-react';

export default function GovernanceAdminPage() {
  const [currentTab, setCurrentTab] = useState<'directory' | 'rbac' | 'timelock' | 'emergency'>(
    'directory',
  );

  const {
    address,
    isConnected,
    explorerBaseUrl,
    directoryAddress,
    timelockAddress,
    isDirectoryFrozen,
    modules,
    minDelaySeconds,
    timelockDelayConstant,
    roles,
    pausableModules,
    isLoading,
    refetch,
  } = useGovernanceConsole();

  const isGovAdmin = Boolean(
    roles.isDirectoryGov || roles.isDirectoryAdmin || roles.isControllerGov,
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Governance, RBAC & Timelock Console
            </h1>
            <StatusBadge
              status={isDirectoryFrozen ? 'Paused' : 'Active'}
              label={isDirectoryFrozen ? 'DIRECTORY FROZEN' : 'GOVERNANCE ACTIVE'}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Decentralized registry orchestration, role administration, 48-hour timelock execution,
            and protocol emergency circuit breakers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-all disabled:opacity-50 min-h-[38px]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`}
            />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar border-b border-border-subtle/60 pb-1">
        <button
          type="button"
          onClick={() => setCurrentTab('directory')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'directory'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <FolderLock className="w-4 h-4" />
          <span>Protocol Directory</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('rbac')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'rbac'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>RBAC Manager</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('timelock')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'timelock'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Timelock Operations</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('emergency')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'emergency'
              ? 'bg-rose-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Emergency Controls</span>
        </button>
      </div>

      {/* Tab Panels */}
      {currentTab === 'directory' && (
        <ProtocolDirectoryConsole
          directoryAddress={directoryAddress}
          isDirectoryFrozen={isDirectoryFrozen}
          modules={modules}
          isGovAdmin={isGovAdmin}
          explorerBaseUrl={explorerBaseUrl}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'rbac' && (
        <RBACManagerConsole explorerBaseUrl={explorerBaseUrl} onRefresh={refetch} />
      )}

      {currentTab === 'timelock' && (
        <TimelockConsole
          timelockAddress={timelockAddress}
          minDelaySeconds={minDelaySeconds}
          timelockDelayConstant={timelockDelayConstant}
          isProposer={roles.isTimelockProposer || roles.isTimelockAdmin}
          isExecutor={roles.isTimelockExecutor || roles.isTimelockAdmin}
          isCanceller={roles.isTimelockCanceller || roles.isTimelockAdmin}
          explorerBaseUrl={explorerBaseUrl}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'emergency' && (
        <EmergencyGovernanceView
          pausableModules={pausableModules}
          explorerBaseUrl={explorerBaseUrl}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
