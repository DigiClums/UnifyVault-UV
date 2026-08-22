'use client';

import React, { useState } from 'react';
import { useBrowserDeployer } from '../../hooks/useBrowserDeployer';
import { DeploymentPreflight } from '../../components/deployment/DeploymentPreflight';
import { ActiveStepCard } from '../../components/deployment/ActiveStepCard';
import { TransactionPipelineTable } from '../../components/deployment/TransactionPipelineTable';
import { DeployedManifestView } from '../../components/deployment/DeployedManifestView';
import { GenesisVerificationCard } from '../../components/deployment/GenesisVerificationCard';
import { AdminSecurityMigrationCard } from '../../components/deployment/AdminSecurityMigrationCard';
import {
  Layers,
  FileCheck2,
  FileCode2,
  Shield,
  Activity,
  Terminal,
  Cpu,
  Lock,
  RefreshCw,
  RotateCcw,
  Key,
} from 'lucide-react';

export default function DeployPage() {
  const [activeTab, setActiveTab] = useState<
    'deploy' | 'pipeline' | 'manifest' | 'verification' | 'admin'
  >('deploy');

  const {
    address,
    chainId,
    isConnected,
    isCorrectNetwork,
    balance,
    currentStepIndex,
    currentStep,
    totalSteps,
    isComplete,
    isCurrentStepLocked,
    serverManifest,
    isSyncing,
    deployedContracts,
    stepRecords,
    verificationResults,
    isDeploying,
    isVerifying,
    activeTxHash,
    errorMessage,
    autoAdvance,
    simulationGas,
    isSimulating,
    executeCurrentStep,
    executeAllRemaining,
    stopAutoAdvance,
    executeVerification,
    lockDeploymentOnServer,
    handleSwitchNetwork,
    exportManifestJson,
    exportEnvFormat,
    goToStep,
    syncServerManifest,
    resetSession,
    bindContractsToFrontend,
    isBinding,
  } = useBrowserDeployer();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Page Title & Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#BFFF00] text-black border border-black shadow-[1px_1px_0_#000]">
              {chainId === 8453 ? 'Base Mainnet (8453)' : 'Base Sepolia (84532)'}
            </span>
            {serverManifest?.isLocked ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>SERVER LOCKED</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Server Synchronized
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mt-1.5">
            UnifyVault Protocol Deployment & Administration Console
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Idempotent server-synchronized deployment runner and hardware wallet access controller.
          </p>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Server Sync & Reset Controls */}
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-900 border-2 border-black dark:border-white/10 shrink-0">
            <button
              onClick={() => syncServerManifest()}
              disabled={isSyncing}
              title="Sync latest state from server"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#BFFF00] ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>Sync</span>
            </button>

            <button
              onClick={() => resetSession()}
              disabled={isSyncing || serverManifest?.isLocked}
              title="Reset deployment session on server"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Session</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-black dark:bg-[#151515] border-2 border-black dark:border-white/10 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('deploy')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'deploy'
                  ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Active Deploy</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pipeline'
                  ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pipeline ({totalSteps})</span>
            </button>

            <button
              onClick={() => setActiveTab('manifest')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manifest'
                  ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Manifest</span>
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'verification'
                  ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Verify (12)</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin Security</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preflight Checks */}
      <DeploymentPreflight
        address={address}
        balance={balance}
        isConnected={isConnected}
        isCorrectNetwork={isCorrectNetwork}
        onSwitchNetwork={handleSwitchNetwork}
      />

      {/* Tab 1: Active Deploy */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          <ActiveStepCard
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            isDeploying={isDeploying}
            isLocked={serverManifest?.isLocked}
            stepRecord={currentStep ? stepRecords[currentStep.stepNumber] : undefined}
            deployedContracts={deployedContracts}
            deployerAddress={address}
            errorMessage={errorMessage}
            activeTxHash={activeTxHash}
            autoAdvance={autoAdvance}
            simulationGas={simulationGas}
            isSimulating={isSimulating}
            isCorrectNetwork={isCorrectNetwork}
            isConnected={isConnected}
            onExecuteCurrent={executeCurrentStep}
            onExecuteAll={executeAllRemaining}
            onStopAutoAdvance={stopAutoAdvance}
            onGoToStep={goToStep}
          />
        </div>
      )}

      {/* Tab 2: Full Transaction Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <TransactionPipelineTable
            stepRecords={stepRecords}
            deployedContracts={deployedContracts}
            currentStepIndex={currentStepIndex}
            onSelectStep={goToStep}
          />
        </div>
      )}

      {/* Tab 3: Manifest & Exports */}
      {activeTab === 'manifest' && (
        <div className="space-y-6">
          <DeployedManifestView
            deployedContracts={deployedContracts}
            onExportJson={() => {
              exportManifestJson();
              return '';
            }}
            onExportEnv={() => {
              exportEnvFormat();
              return '';
            }}
            onBindContracts={bindContractsToFrontend}
            isBinding={isBinding}
          />
        </div>
      )}

      {/* Tab 4: Genesis Verification */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <GenesisVerificationCard
            results={verificationResults}
            isVerifying={isVerifying}
            isComplete={isComplete}
            onRunVerification={executeVerification}
          />
        </div>
      )}

      {/* Tab 5: Admin Security & Hardware Wallet Migration */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          <AdminSecurityMigrationCard chainId={chainId} deployedContracts={deployedContracts} />
        </div>
      )}
    </div>
  );
}
