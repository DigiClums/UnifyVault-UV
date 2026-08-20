'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient, useBalance, useSwitchChain } from 'wagmi';
import { encodeDeployData, encodeFunctionData, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
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

const STORAGE_KEY = 'unifyvault_deployment_base_sepolia_session_v1';

const KNOWN_CONFIRMED_CONTRACTS: DeployedContractsMap = {
  ProtocolDirectory: '0xd2715141a0f5998b707baa963990bfc2e94cf145',
  OracleManager: '0x5b6067982c6cce2dc760eb4731c1b40136776d4a',
  ChainlinkOracleProvider: '0x4f7f99653d9d7acd462429fffc0c4b6c8cf4354a',
  Treasury: '0x66182f56bd5e523c655f6890290ab519f528e83f',
  FeeManager: '0x0721465b01b586b7aadf957a4a884ace46cfbec9',
  CustodyVault: '0x27b5c6dea90678b78856b0b10dba37a789fde97e',
  LiquidityManager: '0xa938aacea64be8f41c90960aff232da4df7fc329',
};

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
};

function rebuildDeployedContracts(
  existing: DeployedContractsMap,
  records: Record<number, StepExecutionRecord>,
): DeployedContractsMap {
  const merged: DeployedContractsMap = { ...KNOWN_CONFIRMED_CONTRACTS, ...existing };
  for (const [stepNumStr, rec] of Object.entries(records)) {
    const stepNum = Number(stepNumStr);
    const contractName = STEP_TO_CONTRACT[stepNum];
    if (contractName && rec?.deployedAddress && rec.status === 'confirmed') {
      merged[contractName] = rec.deployedAddress;
    }
  }
  return merged;
}

export function useBrowserDeployer() {
  const { address, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    chainId: BASE_SEPOLIA_CHAIN_ID,
  });
  const { switchChain } = useSwitchChain();

  // Default to Step 8 (index 7) since Steps 1-7 are confirmed
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(7);
  const [deployedContracts, setDeployedContracts] =
    useState<DeployedContractsMap>(KNOWN_CONFIRMED_CONTRACTS);
  const [stepRecords, setStepRecords] = useState<Record<number, StepExecutionRecord>>(() => {
    const initialRecords: Record<number, StepExecutionRecord> = {};
    for (let i = 1; i <= 7; i++) {
      const contractName = STEP_TO_CONTRACT[i];
      if (contractName && KNOWN_CONFIRMED_CONTRACTS[contractName]) {
        initialRecords[i] = {
          stepNumber: i,
          stepId: `step_${i}`,
          status: 'confirmed',
          deployedAddress: KNOWN_CONFIRMED_CONTRACTS[contractName],
          timestamp: Date.now(),
        };
      }
    }
    return initialRecords;
  });
  const [verificationResults, setVerificationResults] = useState<GenesisVerificationCheck[]>([]);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [activeTxHash, setActiveTxHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [simulationGas, setSimulationGas] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Guard against overwriting storage on initial load
  const isInitializedRef = useRef<boolean>(false);
  const deployedContractsRef = useRef<DeployedContractsMap>(KNOWN_CONFIRMED_CONTRACTS);
  const stepRecordsRef = useRef<Record<number, StepExecutionRecord>>({});
  const autoAdvanceRef = useRef<boolean>(false);

  autoAdvanceRef.current = autoAdvance;
  deployedContractsRef.current = deployedContracts;
  stepRecordsRef.current = stepRecords;

  // Load session from LocalStorage & reconcile
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: DeploymentSessionState = JSON.parse(saved);
        if (parsed && parsed.chainId === BASE_SEPOLIA_CHAIN_ID) {
          const recs = { ...stepRecordsRef.current, ...(parsed.stepRecords || {}) };
          const recoveredContracts = rebuildDeployedContracts(parsed.deployedContracts || {}, recs);

          deployedContractsRef.current = recoveredContracts;
          stepRecordsRef.current = recs;

          // Find first unconfirmed step
          let targetStepIndex = 7; // Default to step 8
          if (parsed.currentStepIndex !== undefined && parsed.currentStepIndex >= 0) {
            targetStepIndex = parsed.currentStepIndex;
          } else {
            for (let i = 0; i < FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.length; i++) {
              const stepNum = i + 1;
              if (!recs[stepNum] || recs[stepNum].status !== 'confirmed') {
                targetStepIndex = i;
                break;
              }
            }
          }

          setCurrentStepIndex(targetStepIndex);
          setDeployedContracts(recoveredContracts);
          setStepRecords(recs);
          setVerificationResults(parsed.verificationResults || []);
        }
      }
    } catch (e) {
      console.warn('Failed to restore deployment session from localStorage:', e);
    } finally {
      isInitializedRef.current = true;
    }
  }, []);

  // Save session to LocalStorage (only after initialized)
  useEffect(() => {
    if (!isInitializedRef.current || !address) return;
    try {
      const activeContracts = rebuildDeployedContracts(deployedContracts, stepRecords);
      const session: DeploymentSessionState = {
        version: 1,
        chainId: BASE_SEPOLIA_CHAIN_ID,
        deployerAddress: address,
        currentStepIndex,
        deployedContracts: activeContracts,
        stepRecords,
        verificationResults,
        lastUpdated: Date.now(),
        isComplete: currentStepIndex >= FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.length,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to save deployment session to localStorage:', e);
    }
  }, [address, currentStepIndex, deployedContracts, stepRecords, verificationResults]);

  const totalSteps = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.length;
  const isComplete = currentStepIndex >= totalSteps;
  const currentStep = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS[currentStepIndex];

  // Jump to specific step
  const goToStep = useCallback((stepNumOrIndex: number) => {
    const idx = stepNumOrIndex > 53 ? 0 : stepNumOrIndex > 0 ? stepNumOrIndex - 1 : 0;
    setCurrentStepIndex(idx);
    setErrorMessage(null);
  }, []);

  const goToStepIndex = useCallback((idx: number) => {
    if (idx >= 0 && idx < FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.length) {
      setCurrentStepIndex(idx);
      setErrorMessage(null);
    }
  }, []);

  // Simulate / Estimate Gas for Current Step
  const simulateCurrentStep = useCallback(async () => {
    if (!publicClient || !address || !currentStep || chainId !== BASE_SEPOLIA_CHAIN_ID) {
      setSimulationGas(null);
      return;
    }
    setIsSimulating(true);
    try {
      const activeContracts = rebuildDeployedContracts(
        deployedContractsRef.current,
        stepRecordsRef.current,
      );
      const ctx: DeploymentContext = {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        deployerAddress: address,
        deployedContracts: activeContracts,
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
  }, [publicClient, address, currentStep, chainId]);

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

      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        setErrorMessage('Incorrect network. Please switch to Base Sepolia (Chain ID: 84532).');
        return false;
      }

      const step = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS[stepIdx];
      if (!step) {
        return false;
      }

      // Always resolve deployed contracts synchronously from refs & records
      const activeContracts = rebuildDeployedContracts(
        deployedContractsRef.current,
        stepRecordsRef.current,
      );

      const ctx: DeploymentContext = {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        deployerAddress: address,
        deployedContracts: activeContracts,
      };

      setErrorMessage(null);
      setIsDeploying(true);

      // Update record to signing
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

        try {
          if (execData.type === 'DEPLOY') {
            const deployData = encodeDeployData({
              abi: execData.abi,
              bytecode: execData.bytecode,
              args: execData.args as any,
            });

            hash = await walletClient.sendTransaction({
              account: address,
              chain: baseSepolia,
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
              chain: baseSepolia,
              data: callData,
            });
          }
        } catch (primaryErr: any) {
          if (
            primaryErr?.name === 'UserRejectedRequestError' ||
            primaryErr?.code === 4001 ||
            primaryErr?.message?.includes('User rejected') ||
            primaryErr?.message?.includes('rejected')
          ) {
            throw primaryErr;
          }

          console.warn(
            '[DEPLOY RUNNER] Primary walletClient failed, invoking direct window.ethereum fallback...',
            primaryErr,
          );

          const injected =
            typeof window !== 'undefined'
              ? (window as any).ethereum || (window as any).safepalProvider
              : undefined;

          if (injected && typeof injected.request === 'function') {
            if (execData.type === 'DEPLOY') {
              const deployData = encodeDeployData({
                abi: execData.abi,
                bytecode: execData.bytecode,
                args: execData.args as any,
              });

              hash = await injected.request({
                method: 'eth_sendTransaction',
                params: [
                  {
                    from: address,
                    data: deployData,
                  },
                ],
              });
            } else {
              const callData = encodeFunctionData({
                abi: execData.abi,
                functionName: execData.functionName as any,
                args: execData.args as any,
              });

              hash = await injected.request({
                method: 'eth_sendTransaction',
                params: [
                  {
                    from: address,
                    to: execData.targetAddress,
                    data: callData,
                  },
                ],
              });
            }
          } else {
            throw primaryErr;
          }
        }

        console.log(`[DEPLOY RUNNER] Tx submitted on Base Sepolia. Hash: ${hash}`);
        setActiveTxHash(hash);

        // Update record to confirming
        const confirmingRecord: StepExecutionRecord = {
          stepNumber: step.stepNumber,
          stepId: step.id,
          txHash: hash,
          status: 'confirming',
          timestamp: Date.now(),
        };
        stepRecordsRef.current[step.stepNumber] = confirmingRecord;
        setStepRecords((prev) => ({ ...prev, [step.stepNumber]: confirmingRecord }));

        // Wait for receipt
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status !== 'success') {
          throw new Error(`Transaction reverted on-chain. Hash: ${hash}`);
        }

        const deployedAddr =
          execData.type === 'DEPLOY' ? (receipt.contractAddress as `0x${string}`) : undefined;

        // Synchronously update ref immediately so subsequent steps in the loop have it
        if (deployedAddr) {
          deployedContractsRef.current[step.contractName as keyof DeployedContractsMap] =
            deployedAddr;
          setDeployedContracts((prev) => ({
            ...prev,
            [step.contractName]: deployedAddr,
          }));
        }

        // Update step record
        const confirmedRecord: StepExecutionRecord = {
          stepNumber: step.stepNumber,
          stepId: step.id,
          txHash: hash,
          status: 'confirmed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
          deployedAddress: deployedAddr,
          timestamp: Date.now(),
        };
        stepRecordsRef.current[step.stepNumber] = confirmedRecord;
        setStepRecords((prev) => ({ ...prev, [step.stepNumber]: confirmedRecord }));

        // Advance step
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
    [walletClient, publicClient, address, chainId, refetchBalance],
  );

  // Execute Current Step (Manual)
  const executeCurrentStep = useCallback(async () => {
    if (currentStepIndex >= totalSteps) return;
    await executeStep(currentStepIndex);
  }, [currentStepIndex, totalSteps, executeStep]);

  // Execute All Remaining Steps (Sequential with MetaMask prompts)
  const executeAllRemaining = useCallback(async () => {
    setAutoAdvance(true);
    let idx = currentStepIndex;

    while (idx < totalSteps) {
      const success = await executeStep(idx);
      if (!success) {
        setAutoAdvance(false);
        break;
      }
      idx++;
      await new Promise((res) => setTimeout(res, 1200));
    }
  }, [currentStepIndex, totalSteps, executeStep]);

  const stopAutoAdvance = useCallback(() => {
    setAutoAdvance(false);
  }, []);

  // Run On-Chain Genesis Verification Suite
  const executeVerification = useCallback(async () => {
    if (!publicClient || !address) {
      setErrorMessage('Please connect wallet and Base Sepolia RPC to run verification.');
      return;
    }
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const activeContracts = rebuildDeployedContracts(
        deployedContractsRef.current,
        stepRecordsRef.current,
      );
      const results = await runGenesisVerification(publicClient, activeContracts, address);
      setVerificationResults(results);
    } catch (e: any) {
      setErrorMessage(`Verification failed: ${e?.message || String(e)}`);
    } finally {
      setIsVerifying(false);
    }
  }, [publicClient, address]);

  // Reset Session
  const resetSession = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Are you sure you want to reset the deployment session? This will clear local deployed contract state.',
      )
    ) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    deployedContractsRef.current = {};
    stepRecordsRef.current = {};
    setCurrentStepIndex(0);
    setDeployedContracts({});
    setStepRecords({});
    setVerificationResults([]);
    setErrorMessage(null);
    setActiveTxHash(null);
    setAutoAdvance(false);
  }, []);

  // Switch to Base Sepolia
  const handleSwitchNetwork = useCallback(() => {
    if (switchChain) {
      switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
    }
  }, [switchChain]);

  // Export JSON Manifest
  const exportManifestJson = useCallback(() => {
    const activeContracts = rebuildDeployedContracts(
      deployedContractsRef.current,
      stepRecordsRef.current,
    );
    const manifest = {
      network: 'Base Sepolia',
      chainId: BASE_SEPOLIA_CHAIN_ID,
      deployer: address,
      timestamp: new Date().toISOString(),
      contracts: activeContracts,
      stepRecords: stepRecordsRef.current,
      verificationResults,
    };
    return JSON.stringify(manifest, null, 2);
  }, [address, verificationResults]);

  // Export .env format
  const exportEnvFormat = useCallback(() => {
    const activeContracts = rebuildDeployedContracts(
      deployedContractsRef.current,
      stepRecordsRef.current,
    );
    return [
      `# UnifyVault Fresh Base Sepolia Deployment (${new Date().toISOString()})`,
      `NEXT_PUBLIC_ACTIVE_CHAIN=base-sepolia`,
      `NEXT_PUBLIC_CHAIN_ID=84532`,
      `NEXT_PUBLIC_DIRECTORY_ADDRESS=${activeContracts.ProtocolDirectory || ''}`,
      `NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA=${activeContracts.ProtocolDirectory || ''}`,
      `NEXT_PUBLIC_TREASURY_ADDRESS_SEPOLIA=${activeContracts.Treasury || ''}`,
      `NEXT_PUBLIC_VAULT_ADDRESS_SEPOLIA=${activeContracts.CustodyVault || ''}`,
      `NEXT_PUBLIC_ORACLE_MANAGER_ADDRESS_SEPOLIA=${activeContracts.OracleManager || ''}`,
      `NEXT_PUBLIC_CHAINLINK_PROVIDER_ADDRESS_SEPOLIA=${activeContracts.ChainlinkOracleProvider || ''}`,
      `NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS_SEPOLIA=${activeContracts.LiquidityManager || ''}`,
      `NEXT_PUBLIC_UVBE_TOKEN_ADDRESS_SEPOLIA=${activeContracts.UVBEV2 || ''}`,
      `NEXT_PUBLIC_CONTROLLER_ADDRESS_SEPOLIA=${activeContracts.UnifyVaultController || ''}`,
      `NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS_SEPOLIA=${activeContracts.StrategyManager || ''}`,
      `NEXT_PUBLIC_PORTFOLIO_MANAGER_ADDRESS_SEPOLIA=${activeContracts.PortfolioManager || ''}`,
      `NEXT_PUBLIC_SWAP_ADAPTER_ADDRESS_SEPOLIA=${activeContracts.SwapAdapter || ''}`,
      `NEXT_PUBLIC_FEE_MANAGER_ADDRESS_SEPOLIA=${activeContracts.FeeManager || ''}`,
      `NEXT_PUBLIC_COST_BASIS_MANAGER_ADDRESS_SEPOLIA=${activeContracts.CostBasisManagerV2 || ''}`,
      `NEXT_PUBLIC_PERFORMANCE_MANAGER_ADDRESS_SEPOLIA=${activeContracts.PerformanceManager || ''}`,
      `NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA=${activeContracts.P2PEscrowV2 || ''}`,
    ].join('\n');
  }, []);

  const effectiveDeployedContracts = rebuildDeployedContracts(deployedContracts, stepRecords);

  return {
    address,
    chainId,
    isConnected,
    isCorrectNetwork: chainId === BASE_SEPOLIA_CHAIN_ID,
    balance: balanceData ? formatEther(balanceData.value) : '0.00',
    currentStepIndex,
    currentStep,
    totalSteps,
    isComplete,
    deployedContracts: effectiveDeployedContracts,
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
    setCurrentStepIndex,
    goToStep,
    goToStepIndex,
  };
}
