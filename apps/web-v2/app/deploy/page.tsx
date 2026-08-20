'use client';

import React, { useState } from 'react';
import { useBrowserDeployer } from '../../hooks/useBrowserDeployer';
import { DeploymentPreflight } from '../../components/deployment/DeploymentPreflight';
import { ActiveStepCard } from '../../components/deployment/ActiveStepCard';
import { TransactionPipelineTable } from '../../components/deployment/TransactionPipelineTable';
import { DeployedManifestView } from '../../components/deployment/DeployedManifestView';
import { GenesisVerificationCard } from '../../components/deployment/GenesisVerificationCard';
import { Layers, FileCheck2, FileCode2, Shield, Activity, Terminal, Cpu } from 'lucide-react';

export default function DeployPage() {
  const [activeTab, setActiveTab] = useState<'deploy' | 'pipeline' | 'manifest' | 'verification'>(
    'deploy',
  );

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
    resetSession,
    handleSwitchNetwork,
    exportManifestJson,
    exportEnvFormat,
    goToStep,
    goToStepIndex,
  } = useBrowserDeployer();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Page Title & Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#BFFF00] text-black border border-black shadow-[1px_1px_0_#000]">
              Base Sepolia (84532)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Foundry Dry-Run Replay
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mt-1.5">
            UnifyVault Protocol Deployment Runner
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Browser-signed deployment flow. Approve transactions securely in MetaMask without
            exposing private keys.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-black dark:bg-[#151515] border-2 border-black dark:border-white/10 shrink-0 self-start md:self-auto overflow-x-auto">
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
            <span>Pipeline (53)</span>
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
            <span>Manifest (15)</span>
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'verification'
                ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Verification</span>
          </button>
        </div>
      </div>

      {/* Pre-Flight Checklist Card */}
      <DeploymentPreflight
        isConnected={isConnected}
        isCorrectNetwork={isCorrectNetwork}
        address={address}
        balance={balance}
        onSwitchNetwork={handleSwitchNetwork}
      />

      {/* Tab Content */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          <ActiveStepCard
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            isDeploying={isDeploying}
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
            onReset={resetSession}
            onGoToStep={goToStep}
          />

          <DeployedManifestView
            deployedContracts={deployedContracts}
            onExportJson={exportManifestJson}
            onExportEnv={exportEnvFormat}
          />

          <GenesisVerificationCard
            results={verificationResults}
            isVerifying={isVerifying}
            isComplete={isComplete}
            onRunVerification={executeVerification}
          />
        </div>
      )}

      {activeTab === 'pipeline' && (
        <TransactionPipelineTable
          currentStepIndex={currentStepIndex}
          stepRecords={stepRecords}
          deployedContracts={deployedContracts}
          onSelectStep={(idx) => {
            goToStepIndex(idx);
            setActiveTab('deploy');
          }}
        />
      )}

      {activeTab === 'manifest' && (
        <DeployedManifestView
          deployedContracts={deployedContracts}
          onExportJson={exportManifestJson}
          onExportEnv={exportEnvFormat}
        />
      )}

      {activeTab === 'verification' && (
        <GenesisVerificationCard
          results={verificationResults}
          isVerifying={isVerifying}
          isComplete={isComplete}
          onRunVerification={executeVerification}
        />
      )}
    </div>
  );
}
