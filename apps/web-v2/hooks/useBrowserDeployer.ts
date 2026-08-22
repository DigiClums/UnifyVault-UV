'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient, useBalance, useSwitchChain } from 'wagmi';
import { encodeDeployData, encodeFunctionData, formatEther } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import {
  FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS,
  BASE_SEPOLIA_CHAIN_ID,
} from '../lib/deployment/freshBaseSepoliaSequence';
import { runGenesisVerification } from '../lib/deployment/genesisVerification';
import type {
  DeployedContractsMap,
  DeploymentSessionState,
  DeploymentContext,
  StepExecutionRecord,
  GenesisVerificationCheck,
} from '../lib/deployment/types';
import type { ServerDeploymentManifest } from '../lib/deployment/manifestStore';

export const CANONICAL_DEPLOYER_ADDRESS =
  '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`;

const STEP_TO_CONTRACT: Record<number, keyof DeployedContractsMap> = {
  1: 'ProtocolDirectory',
  2: 'OracleManager',
  3: 'ChainlinkOracleProvider',
  4: 'Treasury',
  5: 'FeeManager',
  6: 'CustodyVault',
  7: 'LiquidityManager',
  8: 'UVBEV2',
  9: 'SwapAdapter',
  10: 'StrategyManager',
  11: 'PortfolioManager',
  12: 'UnifyVaultController',
  13: 'CostBasisManagerV2',
  14: 'P2PEscrowV2',
  15: 'PerformanceManager',
  54: 'Marketplace',
};

export function useBrowserDeployer() {
  const { address, chainId: activeChainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const chainId = activeChainId || walletClient?.chain?.id || 8453;
  const isCorrectNetwork = chainId === BASE_SEPOLIA_CHAIN_ID || chainId === 8453;

  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    chainId,
  });
  const { switchChain } = useSwitchChain();

  const [serverManifest, setServerManifest] = useState<ServerDeploymentManifest | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [deployedContracts, setDeployedContracts] = useState<DeployedContractsMap>({});
  const [stepRecords, setStepRecords] = useState<Record<number, StepExecutionRecord>>({});
  const [verificationResults, setVerificationResults] = useState<GenesisVerificationCheck[]>([]);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [activeTxHash, setActiveTxHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [simulationGas, setSimulationGas] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const deployedContractsRef = useRef<DeployedContractsMap>({});
  const stepRecordsRef = useRef<Record<number, StepExecutionRecord>>({});
  const autoAdvanceRef = useRef<boolean>(false);

  autoAdvanceRef.current = autoAdvance;
  deployedContractsRef.current = deployedContracts;
  stepRecordsRef.current = stepRecords;

  // Sync state from server manifest (Source of Truth)
  const syncServerManifest = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/deployment/manifest?chainId=${chainId}`);
      if (!res.ok) throw new Error('Failed to fetch manifest');
      const data = await res.json();
      if (data.success && data.manifest) {
        const m: ServerDeploymentManifest = data.manifest;
        setServerManifest(m);
        setDeployedContracts(m.contracts || {});
        setStepRecords(m.stepRecords || {});
        setCurrentStepIndex(m.currentStepIndex || 0);
        if (m.verificationResults && m.verificationResults.length > 0) {
          setVerificationResults(m.verificationResults);
        }
        deployedContractsRef.current = m.contracts || {};
        stepRecordsRef.current = m.stepRecords || {};
      }
    } catch (err) {
      console.warn('[useBrowserDeployer] Error syncing server manifest:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [chainId]);

  useEffect(() => {
    syncServerManifest();
    const interval = setInterval(syncServerManifest, 8000); // Polling sync across devices
    return () => clearInterval(interval);
  }, [syncServerManifest]);

  const totalSteps = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.length;
  const currentStep = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS[currentStepIndex];
  const isComplete = serverManifest?.isLocked || currentStepIndex >= totalSteps;
  const isCurrentStepLocked =
    serverManifest?.isLocked ||
    (currentStep && stepRecords[currentStep.stepNumber]?.status === 'confirmed');

  // Simulation gas calculation
  const simulateCurrentStep = useCallback(async () => {
    if (!publicClient || !address || !currentStep || !isCorrectNetwork || isCurrentStepLocked) {
      setSimulationGas(null);
      return;
    }
    setIsSimulating(true);
    try {
      const ctx: DeploymentContext = {
        chainId,
        deployerAddress: address,
        deployedContracts: deployedContractsRef.current,
      };

      const execData = currentStep.getExecutionData(ctx);
      if (execData.type === 'DEPLOY') {
        const deployData = encodeDeployData({
          abi: execData.abi,
          bytecode: execData.bytecode,
          args: execData.args as any,
        });
        const est = await publicClient.estimateGas({
          account: address,
          data: deployData,
        });
        setSimulationGas(est.toString());
      } else {
        const callData = encodeFunctionData({
          abi: execData.abi,
          functionName: execData.functionName as any,
          args: execData.args as any,
        });
        const est = await publicClient.estimateGas({
          account: address,
          to: execData.targetAddress,
          data: callData,
        });
        setSimulationGas(est.toString());
      }
    } catch (err) {
      setSimulationGas(null);
    } finally {
      setIsSimulating(false);
    }
  }, [publicClient, address, currentStep, isCorrectNetwork, chainId, isCurrentStepLocked]);

  useEffect(() => {
    simulateCurrentStep();
  }, [simulateCurrentStep]);

  // Execute a single step
  const executeStep = useCallback(
    async (stepIdx: number): Promise<boolean> => {
      if (!walletClient || !publicClient || !address) {
        setErrorMessage('Wallet not connected. Please connect MetaMask to proceed.');
        return false;
      }

      if (!isCorrectNetwork) {
        setErrorMessage(
          'Incorrect network. Please switch to Base Sepolia (84532) or Base Mainnet (8453).',
        );
        return false;
      }

      if (address.toLowerCase() !== CANONICAL_DEPLOYER_ADDRESS.toLowerCase()) {
        setErrorMessage(
          `Unauthorized deployer wallet. Connected: ${address}. Required canonical deployer: ${CANONICAL_DEPLOYER_ADDRESS}. Please switch accounts in your wallet.`,
        );
        return false;
      }

      if (serverManifest?.isLocked) {
        setErrorMessage(
          'Deployment is LOCKED on the server. No further deployment transactions allowed.',
        );
        return false;
      }

      const step = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS[stepIdx];
      if (!step) return false;

      // Idempotency check: Already confirmed
      if (stepRecordsRef.current[step.stepNumber]?.status === 'confirmed') {
        setErrorMessage(`Step #${step.stepNumber} is already confirmed & locked on server.`);
        return false;
      }

      const ctx: DeploymentContext = {
        chainId,
        deployerAddress: address,
        deployedContracts: deployedContractsRef.current,
      };

      setErrorMessage(null);
      setIsDeploying(true);

      const signingRecord: StepExecutionRecord = {
        stepNumber: step.stepNumber,
        stepId: step.id,
        status: 'signing',
        timestamp: Date.now(),
      };
      stepRecordsRef.current[step.stepNumber] = signingRecord;
      setStepRecords((prev) => ({ ...prev, [step.stepNumber]: signingRecord }));

      try {
        const execData = step.getExecutionData(ctx);
        let hash: `0x${string}`;

        console.log(`[DEPLOY RUNNER] Initiating Step #${step.stepNumber} (${step.contractName})`);

        if (execData.type === 'DEPLOY') {
          const deployData = encodeDeployData({
            abi: execData.abi,
            bytecode: execData.bytecode,
            args: execData.args as any,
          });

          hash = await walletClient.sendTransaction({
            account: address,
            chain: chainId === 8453 ? base : baseSepolia,
            data: deployData,
          });
        } else {
          const callData = encodeFunctionData({
            abi: execData.abi,
            functionName: execData.functionName as any,
            args: execData.args as any,
          });

          hash = await walletClient.sendTransaction({
            account: address,
            to: execData.targetAddress,
            chain: chainId === 8453 ? base : baseSepolia,
            data: callData,
          });
        }

        console.log(`[DEPLOY RUNNER] Tx submitted. Hash: ${hash}`);
        setActiveTxHash(hash);

        const confirmingRecord: StepExecutionRecord = {
          stepNumber: step.stepNumber,
          stepId: step.id,
          txHash: hash,
          status: 'confirming',
          timestamp: Date.now(),
        };
        stepRecordsRef.current[step.stepNumber] = confirmingRecord;
        setStepRecords((prev) => ({ ...prev, [step.stepNumber]: confirmingRecord }));

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status !== 'success') {
          throw new Error(`Transaction reverted on-chain. Hash: ${hash}`);
        }

        const deployedAddr =
          execData.type === 'DEPLOY' ? (receipt.contractAddress as `0x${string}`) : undefined;

        // Allow 1.5s for L2 state propagation across RPC nodes
        await new Promise((r) => setTimeout(r, 1500));

        // Post confirmation to Server Manifest Store
        const confirmRes = await fetch('/api/deployment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId,
            stepNumber: step.stepNumber,
            contractName: step.contractName,
            deployedAddress: deployedAddr,
            txHash: hash,
            expectedVersion: undefined, // Always accept latest valid on-chain confirmation
          }),
        });

        const confirmData = await confirmRes.json();
        if (!confirmData.success) {
          throw new Error(confirmData.error || 'Failed to confirm step on server manifest store');
        }

        if (confirmData.manifest) {
          setServerManifest(confirmData.manifest);
          setDeployedContracts(confirmData.manifest.contracts);
          setStepRecords(confirmData.manifest.stepRecords);
        }

        const nextIdx = stepIdx + 1;
        setCurrentStepIndex(nextIdx);
        refetchBalance();

        return true;
      } catch (err: any) {
        console.error(`Step ${step.stepNumber} failed:`, err);
        const isUserRejected =
          err?.name === 'UserRejectedRequestError' ||
          err?.code === 4001 ||
          err?.message?.includes('User rejected') ||
          err?.message?.includes('rejected');

        const errMsg = isUserRejected
          ? 'Transaction rejected in wallet. You can safely retry when ready.'
          : err?.cause?.shortMessage ||
            err?.cause?.message ||
            err?.details ||
            err?.data?.message ||
            err?.shortMessage ||
            err?.message ||
            'Transaction failed.';

        setErrorMessage(errMsg);

        const failedRecord: StepExecutionRecord = {
          stepNumber: step.stepNumber,
          stepId: step.id,
          status: isUserRejected ? 'rejected' : 'failed',
          error: errMsg,
          timestamp: Date.now(),
        };
        stepRecordsRef.current[step.stepNumber] = failedRecord;
        setStepRecords((prev) => ({ ...prev, [step.stepNumber]: failedRecord }));

        return false;
      } finally {
        setIsDeploying(false);
        setActiveTxHash(null);
      }
    },
    [
      walletClient,
      publicClient,
      address,
      isCorrectNetwork,
      chainId,
      serverManifest,
      refetchBalance,
    ],
  );

  const executeCurrentStep = useCallback(async () => {
    await executeStep(currentStepIndex);
  }, [executeStep, currentStepIndex]);

  const executeAllRemaining = useCallback(async () => {
    setAutoAdvance(true);
    autoAdvanceRef.current = true;
    let idx = currentStepIndex;

    while (idx < FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.length) {
      if (!autoAdvanceRef.current) break;
      const success = await executeStep(idx);
      if (!success) {
        setAutoAdvance(false);
        autoAdvanceRef.current = false;
        break;
      }
      idx++;
      await new Promise((r) => setTimeout(r, 1000));
    }
    setAutoAdvance(false);
    autoAdvanceRef.current = false;
  }, [currentStepIndex, executeStep]);

  const stopAutoAdvance = useCallback(() => {
    setAutoAdvance(false);
  }, []);

  const executeVerification = useCallback(async () => {
    if (!publicClient) return;
    setIsVerifying(true);
    try {
      const deployer = address || CANONICAL_DEPLOYER_ADDRESS;
      const results = await runGenesisVerification(
        publicClient,
        deployedContractsRef.current,
        deployer,
      );
      setVerificationResults(results);
    } catch (err: any) {
      setErrorMessage(`Verification error: ${err?.message}`);
    } finally {
      setIsVerifying(false);
    }
  }, [publicClient, address]);

  const lockDeploymentOnServer = useCallback(async () => {
    try {
      const res = await fetch('/api/deployment/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId,
          expectedVersion: serverManifest?.manifestVersion,
        }),
      });
      const data = await res.json();
      if (data.success && data.manifest) {
        setServerManifest(data.manifest);
      }
    } catch (err) {
      console.error('[lockDeploymentOnServer] Error:', err);
    }
  }, [chainId, serverManifest]);

  const handleSwitchNetwork = useCallback(() => {
    if (switchChain) {
      switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
    }
  }, [switchChain]);

  const exportManifestJson = useCallback(() => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(serverManifest || deployedContracts, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute(
      'download',
      `unifyvault-deployment-${chainId === 8453 ? 'mainnet' : 'sepolia'}-${Date.now()}.json`,
    );
    dlAnchorElem.click();
  }, [serverManifest, deployedContracts, chainId]);

  const exportEnvFormat = useCallback(() => {
    const lines = Object.entries(deployedContracts)
      .map(([k, v]) => `NEXT_PUBLIC_${k.toUpperCase()}_ADDRESS="${v}"`)
      .join('\n');
    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(lines);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `unifyvault-contracts-${chainId}.env`);
    dlAnchorElem.click();
  }, [deployedContracts, chainId]);

  const goToStep = useCallback((stepNumber: number) => {
    const idx = stepNumber - 1;
    if (idx >= 0 && idx < FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.length) {
      setCurrentStepIndex(idx);
    }
  }, []);

  const [isBinding, setIsBinding] = useState<boolean>(false);

  const bindContractsToFrontend = useCallback(async () => {
    if (
      !window.confirm(
        'Are you sure you want to BIND all deployed contracts to frontend constants and active environment?',
      )
    ) {
      return;
    }

    try {
      setIsBinding(true);
      setErrorMessage(null);
      const res = await fetch(`/api/deployment/bind?chainId=${chainId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to bind contracts.');
      }
      alert('SUCCESS: All deployed contracts are now bound to frontend constants and .env.local!');
      await syncServerManifest();
    } catch (err: any) {
      console.error('Failed to bind contracts:', err);
      setErrorMessage(err?.message || 'Failed to bind contracts to frontend.');
    } finally {
      setIsBinding(false);
    }
  }, [chainId, syncServerManifest]);

  const resetSession = useCallback(async () => {
    if (
      !window.confirm(
        'Are you sure you want to RESET the deployment session? This will clear the server manifest and start fresh from Step 1 on all devices.',
      )
    ) {
      return;
    }

    try {
      setIsSyncing(true);
      const res = await fetch(`/api/deployment/manifest?chainId=${chainId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && data.manifest) {
        setServerManifest(data.manifest);
        setDeployedContracts({});
        setStepRecords({});
        setVerificationResults([]);
        setCurrentStepIndex(0);
        setAutoAdvance(false);
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error('Failed to reset deployment session:', err);
      setErrorMessage(err?.message || 'Failed to reset deployment session.');
    } finally {
      setIsSyncing(false);
    }
  }, [chainId]);

  return {
    address,
    chainId,
    isConnected,
    isCorrectNetwork,
    balance: balanceData
      ? `${parseFloat(formatEther(balanceData.value)).toFixed(4)} ${balanceData.symbol}`
      : '0.00 ETH',
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
  };
}
