'use client';

import React, { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import {
  ShieldCheck,
  Rocket,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Clock,
  Coins,
  Flame,
  Users,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { encodeDeployData, parseEther, isAddress, type Address } from 'viem';
import { DEPLOYMENT_ARTIFACTS } from '../../lib/deployment/generatedArtifacts';
import { getExplorerBaseUrl } from '../../constants';

const GOV = '0x441dbf8076d0b143EC17199baE94Daa884161454' as Address;
const UVBE_TOKEN = '0xD2715141a0F5998B707BaA963990bFC2E94cF145' as Address;
const P2P_ESCROW_V2 = '0xa938aaCeA64bE8f41c90960aFF232dA4Df7Fc329' as Address;
const ENTRY_POINT_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as Address;
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;
const CONTROLLER = '0xe6Cd99f3DcF39BD76D91D211Dce7f4BdF801C366' as Address;
const PORTFOLIO_MANAGER = '0x66182F56BD5E523c655f6890290aB519f528e83f' as Address;
const ORACLE_MANAGER = '0x91B488cdE0f2Ef28141FE4ffD8531c4179B48EA7' as Address;
const UNISWAP_V4_POOL_MANAGER = '0x498581fF718922c3f8e6A244956aF099B2652b2b' as Address;

interface DeployedState {
  timelock?: Address;
  stakingVault?: Address;
  referralRegistry?: Address;
  rewardDistributor?: Address;
  p2pReputation?: Address;
  paymaster?: Address;
  gasTreasury?: Address;
  stabilizerVault?: Address;
}

export function PendingContractsDeployCard({ chainId }: { chainId?: number }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [deployed, setDeployed] = useState<DeployedState>({});
  const [txHashes, setTxHashes] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  const explorerUrl = getExplorerBaseUrl(chainId || 8453);

  // 1. Deploy Timelock
  const deployTimelock = async () => {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');
      setError(null);
      setLoadingStep(1);

      const artifact = DEPLOYMENT_ARTIFACTS.UnifyVaultTimelock;
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [
          BigInt(172800), // 48 hours
          [GOV],
          ['0x0000000000000000000000000000000000000000' as Address],
          GOV,
        ],
      });

      const hash = await walletClient.sendTransaction({
        data: deployData,
        chain: walletClient.chain,
        account: walletClient.account,
      });

      setTxHashes((prev) => ({ ...prev, timelock: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) throw new Error('Deployment failed: No contract address');

      setDeployed((prev) => ({ ...prev, timelock: receipt.contractAddress as Address }));
    } catch (err: any) {
      setError(err?.message || 'Timelock deployment failed');
    } finally {
      setLoadingStep(null);
    }
  };

  // 2. Deploy Staking Vault
  const deployStakingVault = async () => {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');
      setError(null);
      setLoadingStep(2);

      const artifact = DEPLOYMENT_ARTIFACTS.UVBEStakingVault;
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [GOV, UVBE_TOKEN],
      });

      const hash = await walletClient.sendTransaction({
        data: deployData,
        chain: walletClient.chain,
        account: walletClient.account,
      });

      setTxHashes((prev) => ({ ...prev, stakingVault: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) throw new Error('Deployment failed: No contract address');

      setDeployed((prev) => ({ ...prev, stakingVault: receipt.contractAddress as Address }));
    } catch (err: any) {
      setError(err?.message || 'StakingVault deployment failed');
    } finally {
      setLoadingStep(null);
    }
  };

  // 3. Deploy Referral Registry
  const deployReferralRegistry = async () => {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');
      setError(null);
      setLoadingStep(3);

      const artifact = DEPLOYMENT_ARTIFACTS.UVBEReferralRegistry;
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [GOV, GOV],
      });

      const hash = await walletClient.sendTransaction({
        data: deployData,
        chain: walletClient.chain,
        account: walletClient.account,
      });

      setTxHashes((prev) => ({ ...prev, referralRegistry: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) throw new Error('Deployment failed: No contract address');

      setDeployed((prev) => ({ ...prev, referralRegistry: receipt.contractAddress as Address }));
    } catch (err: any) {
      setError(err?.message || 'ReferralRegistry deployment failed');
    } finally {
      setLoadingStep(null);
    }
  };

  // 4. Deploy Reward Distributor
  const deployRewardDistributor = async () => {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');
      setError(null);
      setLoadingStep(4);

      const artifact = DEPLOYMENT_ARTIFACTS.UVBERewardDistributor;
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [GOV, UVBE_TOKEN],
      });

      const hash = await walletClient.sendTransaction({
        data: deployData,
        chain: walletClient.chain,
        account: walletClient.account,
      });

      setTxHashes((prev) => ({ ...prev, rewardDistributor: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) throw new Error('Deployment failed: No contract address');

      setDeployed((prev) => ({ ...prev, rewardDistributor: receipt.contractAddress as Address }));
    } catch (err: any) {
      setError(err?.message || 'RewardDistributor deployment failed');
    } finally {
      setLoadingStep(null);
    }
  };

  // 5. Interlink Staking Modules
  const interlinkStakingModules = async () => {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');
      setError(null);
      setLoadingStep(5);

      if (!deployed.stakingVault || !deployed.referralRegistry || !deployed.rewardDistributor) {
        throw new Error('Staking modules not fully deployed');
      }

      // Interlink Vault
      const vArtifact = DEPLOYMENT_ARTIFACTS.UVBEStakingVault;
      const vHash = await walletClient.writeContract({
        address: deployed.stakingVault,
        abi: vArtifact.abi,
        functionName: 'setModules',
        args: [deployed.referralRegistry, deployed.rewardDistributor],
      });
      await publicClient.waitForTransactionReceipt({ hash: vHash });

      // Interlink Registry
      const rArtifact = DEPLOYMENT_ARTIFACTS.UVBEReferralRegistry;
      const rHash = await walletClient.writeContract({
        address: deployed.referralRegistry,
        abi: rArtifact.abi,
        functionName: 'setModules',
        args: [deployed.stakingVault, deployed.rewardDistributor],
      });
      await publicClient.waitForTransactionReceipt({ hash: rHash });

      // Interlink Distributor
      const dArtifact = DEPLOYMENT_ARTIFACTS.UVBERewardDistributor;
      const dHash = await walletClient.writeContract({
        address: deployed.rewardDistributor,
        abi: dArtifact.abi,
        functionName: 'setModules',
        args: [deployed.stakingVault, deployed.referralRegistry],
      });
      await publicClient.waitForTransactionReceipt({ hash: dHash });

      setTxHashes((prev) => ({ ...prev, interlink: dHash }));
    } catch (err: any) {
      setError(err?.message || 'Module interlinking failed');
    } finally {
      setLoadingStep(null);
    }
  };

  // 6. Deploy P2P Reputation
  const deployP2PReputation = async () => {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');
      setError(null);
      setLoadingStep(6);

      const artifact = DEPLOYMENT_ARTIFACTS.P2PReputation;
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [P2P_ESCROW_V2],
      });

      const hash = await walletClient.sendTransaction({
        data: deployData,
        chain: walletClient.chain,
        account: walletClient.account,
      });

      setTxHashes((prev) => ({ ...prev, p2pReputation: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) throw new Error('Deployment failed: No contract address');

      setDeployed((prev) => ({ ...prev, p2pReputation: receipt.contractAddress as Address }));
    } catch (err: any) {
      setError(err?.message || 'P2PReputation deployment failed');
    } finally {
      setLoadingStep(null);
    }
  };

  // 7. Deploy Paymaster & Gas Treasury
  const deployPaymasterAndTreasury = async () => {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');
      setError(null);
      setLoadingStep(7);

      // Deploy Paymaster
      const pArtifact = DEPLOYMENT_ARTIFACTS.UnifyVaultPaymaster;
      const pDeployData = encodeDeployData({
        abi: pArtifact.abi,
        bytecode: pArtifact.bytecode,
        args: [
          ENTRY_POINT_V07,
          GOV,
          '0x0000000000000000000000000000000000000000' as Address,
          parseEther('0.05'),
        ],
      });

      const pHash = await walletClient.sendTransaction({
        data: pDeployData,
        chain: walletClient.chain,
        account: walletClient.account,
      });
      const pReceipt = await publicClient.waitForTransactionReceipt({ hash: pHash });
      const paymasterAddr = pReceipt.contractAddress as Address;

      // Deploy Gas Treasury
      const gtArtifact = DEPLOYMENT_ARTIFACTS.GasTreasury;
      const gtDeployData = encodeDeployData({
        abi: gtArtifact.abi,
        bytecode: gtArtifact.bytecode,
        args: [GOV, GOV, paymasterAddr, parseEther('0.5'), parseEther('2.0')],
      });

      const gtHash = await walletClient.sendTransaction({
        data: gtDeployData,
        chain: walletClient.chain,
        account: walletClient.account,
      });
      const gtReceipt = await publicClient.waitForTransactionReceipt({ hash: gtHash });
      const gasTreasuryAddr = gtReceipt.contractAddress as Address;

      // Whitelist targets
      await await walletClient.writeContract({
        address: paymasterAddr,
        abi: pArtifact.abi,
        functionName: 'setApprovedTarget',
        args: [USDC, true],
      });
      await await walletClient.writeContract({
        address: paymasterAddr,
        abi: pArtifact.abi,
        functionName: 'setApprovedTarget',
        args: [CONTROLLER, true],
      });
      await await walletClient.writeContract({
        address: paymasterAddr,
        abi: pArtifact.abi,
        functionName: 'setApprovedTarget',
        args: [UVBE_TOKEN, true],
      });
      await await walletClient.writeContract({
        address: paymasterAddr,
        abi: pArtifact.abi,
        functionName: 'setApprovedTarget',
        args: [P2P_ESCROW_V2, true],
      });

      setDeployed((prev) => ({
        ...prev,
        paymaster: paymasterAddr,
        gasTreasury: gasTreasuryAddr,
      }));
      setTxHashes((prev) => ({
        ...prev,
        paymaster: pHash,
        gasTreasury: gtHash,
      }));
    } catch (err: any) {
      setError(err?.message || 'Paymaster & Treasury deployment failed');
    } finally {
      setLoadingStep(null);
    }
  };

  // 8. Deploy StabilizerVault (Uniswap V4)
  const deployStabilizerVault = async () => {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');
      setError(null);
      setLoadingStep(8);

      const artifact = DEPLOYMENT_ARTIFACTS.StabilizerVault;
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [
          GOV,
          USDC,
          UVBE_TOKEN,
          PORTFOLIO_MANAGER,
          ORACLE_MANAGER,
          CONTROLLER,
          UNISWAP_V4_POOL_MANAGER,
          75, // 0.0075% fee
          1, // tickSpacing = 1
          '0x0000000000000000000000000000000000000000' as Address, // hooks
        ],
      });

      const hash = await walletClient.sendTransaction({
        data: deployData,
        chain: walletClient.chain,
        account: walletClient.account,
      });

      setTxHashes((prev) => ({ ...prev, stabilizerVault: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress)
        throw new Error('StabilizerVault deployment failed: No contract address');

      setDeployed((prev) => ({ ...prev, stabilizerVault: receipt.contractAddress as Address }));
    } catch (err: any) {
      setError(err?.message || 'StabilizerVault deployment failed');
    } finally {
      setLoadingStep(null);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-black border-2 border-black dark:border-white/10 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#BFFF00] text-black">
              1-Click Web Deployer
            </span>
            <span className="text-xs text-white/50">Base Mainnet (8453)</span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#BFFF00]" />
            <span>Pending Contracts Deployment & Interlinking Suite</span>
          </h2>
          <p className="text-xs text-white/70">
            Deploy Timelock, Staking Ecosystem, P2P Reputation Engine & ERC-4337 Gasless Paymaster
            directly from your connected wallet.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Deployment Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Step 1: Timelock */}
        <div
          className={`p-4 rounded-xl border ${deployed.timelock ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-white/5 border-white/10'} space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#BFFF00]" />
              <span className="font-bold text-sm text-white">1. Governance Timelock</span>
            </div>
            {deployed.timelock && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-white/60">
            48-Hour delay on governance administrative changes.
          </p>
          {deployed.timelock ? (
            <a
              href={`${explorerUrl}/address/${deployed.timelock}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono text-emerald-300 hover:underline break-all bg-black/40 p-2 rounded flex items-center justify-between"
            >
              <span>{deployed.timelock}</span>
              <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
            </a>
          ) : (
            <button
              onClick={deployTimelock}
              disabled={loadingStep !== null || !isConnected}
              className="w-full py-2 rounded-lg text-xs font-black bg-[#BFFF00] text-black hover:bg-[#a6df00] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingStep === 1 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              <span>Deploy Timelock</span>
            </button>
          )}
        </div>

        {/* Step 2: Staking Vault */}
        <div
          className={`p-4 rounded-xl border ${deployed.stakingVault ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-white/5 border-white/10'} space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-[#BFFF00]" />
              <span className="font-bold text-sm text-white">2. Staking Vault</span>
            </div>
            {deployed.stakingVault && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-white/60">Permanent 95% capital lock & treasury custodian.</p>
          {deployed.stakingVault ? (
            <a
              href={`${explorerUrl}/address/${deployed.stakingVault}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono text-emerald-300 hover:underline break-all bg-black/40 p-2 rounded flex items-center justify-between"
            >
              <span>{deployed.stakingVault}</span>
              <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
            </a>
          ) : (
            <button
              onClick={deployStakingVault}
              disabled={loadingStep !== null || !isConnected}
              className="w-full py-2 rounded-lg text-xs font-black bg-[#BFFF00] text-black hover:bg-[#a6df00] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingStep === 2 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              <span>Deploy Staking Vault</span>
            </button>
          )}
        </div>

        {/* Step 3: Referral Registry */}
        <div
          className={`p-4 rounded-xl border ${deployed.referralRegistry ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-white/5 border-white/10'} space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#BFFF00]" />
              <span className="font-bold text-sm text-white">3. Referral Registry</span>
            </div>
            {deployed.referralRegistry && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-white/60">
            10-Tier generation tree and DAO leader rank engine.
          </p>
          {deployed.referralRegistry ? (
            <a
              href={`${explorerUrl}/address/${deployed.referralRegistry}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono text-emerald-300 hover:underline break-all bg-black/40 p-2 rounded flex items-center justify-between"
            >
              <span>{deployed.referralRegistry}</span>
              <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
            </a>
          ) : (
            <button
              onClick={deployReferralRegistry}
              disabled={loadingStep !== null || !isConnected}
              className="w-full py-2 rounded-lg text-xs font-black bg-[#BFFF00] text-black hover:bg-[#a6df00] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingStep === 3 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              <span>Deploy Referral Registry</span>
            </button>
          )}
        </div>

        {/* Step 4: Reward Distributor */}
        <div
          className={`p-4 rounded-xl border ${deployed.rewardDistributor ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-white/5 border-white/10'} space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-[#BFFF00]" />
              <span className="font-bold text-sm text-white">4. Reward Distributor</span>
            </div>
            {deployed.rewardDistributor && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-white/60">Dynamic solvent APY engine & 30-day DAO pool.</p>
          {deployed.rewardDistributor ? (
            <a
              href={`${explorerUrl}/address/${deployed.rewardDistributor}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono text-emerald-300 hover:underline break-all bg-black/40 p-2 rounded flex items-center justify-between"
            >
              <span>{deployed.rewardDistributor}</span>
              <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
            </a>
          ) : (
            <button
              onClick={deployRewardDistributor}
              disabled={loadingStep !== null || !isConnected}
              className="w-full py-2 rounded-lg text-xs font-black bg-[#BFFF00] text-black hover:bg-[#a6df00] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingStep === 4 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              <span>Deploy Distributor</span>
            </button>
          )}
        </div>

        {/* Step 5: Interlink Staking Modules */}
        <div
          className={`p-4 rounded-xl border ${txHashes.interlink ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-white/5 border-white/10'} space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#BFFF00]" />
              <span className="font-bold text-sm text-white">5. Interlink Modules</span>
            </div>
            {txHashes.interlink && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-white/60">
            Calls setModules() across vault, registry & distributor.
          </p>
          {txHashes.interlink ? (
            <div className="text-[11px] font-mono text-emerald-300 break-all bg-black/40 p-2 rounded">
              Interlinked & Frozen!
            </div>
          ) : (
            <button
              onClick={interlinkStakingModules}
              disabled={
                loadingStep !== null ||
                !deployed.stakingVault ||
                !deployed.referralRegistry ||
                !deployed.rewardDistributor
              }
              className="w-full py-2 rounded-lg text-xs font-black bg-[#BFFF00] text-black hover:bg-[#a6df00] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingStep === 5 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>Freeze & Interlink</span>
            </button>
          )}
        </div>

        {/* Step 6: P2P Reputation */}
        <div
          className={`p-4 rounded-xl border ${deployed.p2pReputation ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-white/5 border-white/10'} space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#BFFF00]" />
              <span className="font-bold text-sm text-white">6. P2P Reputation</span>
            </div>
            {deployed.p2pReputation && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-white/60">
            On-chain Bayesian trust scores for UVBE P2P escrow.
          </p>
          {deployed.p2pReputation ? (
            <a
              href={`${explorerUrl}/address/${deployed.p2pReputation}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono text-emerald-300 hover:underline break-all bg-black/40 p-2 rounded flex items-center justify-between"
            >
              <span>{deployed.p2pReputation}</span>
              <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
            </a>
          ) : (
            <button
              onClick={deployP2PReputation}
              disabled={loadingStep !== null || !isConnected}
              className="w-full py-2 rounded-lg text-xs font-black bg-[#BFFF00] text-black hover:bg-[#a6df00] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingStep === 6 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              <span>Deploy P2P Reputation</span>
            </button>
          )}
        </div>

        {/* Step 7: Paymaster & Gas Treasury */}
        <div
          className={`p-4 rounded-xl border md:col-span-2 lg:col-span-3 ${deployed.paymaster ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-white/5 border-white/10'} space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#BFFF00]" />
              <span className="font-bold text-sm text-white">
                7. ERC-4337 Paymaster & Gas Treasury
              </span>
            </div>
            {deployed.paymaster && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-white/60">
            Deploy Gasless Paymaster, Gas Treasury reserve, and whitelist protocol targets (USDC,
            Controller, UVBE, P2PEscrow).
          </p>
          {deployed.paymaster ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <a
                href={`${explorerUrl}/address/${deployed.paymaster}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-300 hover:underline break-all bg-black/40 p-2 rounded flex items-center justify-between"
              >
                <span>Paymaster: {deployed.paymaster}</span>
                <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
              </a>
              <a
                href={`${explorerUrl}/address/${deployed.gasTreasury}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-emerald-300 hover:underline break-all bg-black/40 p-2 rounded flex items-center justify-between"
              >
                <span>Gas Treasury: {deployed.gasTreasury}</span>
                <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
              </a>
            </div>
          ) : (
            <button
              onClick={deployPaymasterAndTreasury}
              disabled={loadingStep !== null || !isConnected}
              className="w-full py-2.5 rounded-lg text-xs font-black bg-[#BFFF00] text-black hover:bg-[#a6df00] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingStep === 7 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              <span>Deploy Paymaster & Gas Treasury</span>
            </button>
          )}
        </div>

        {/* Step 8: StabilizerVault */}
        <div
          className={`p-4 rounded-xl border md:col-span-2 lg:col-span-3 ${deployed.stabilizerVault ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-white/5 border-white/10'} space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#BFFF00]" />
              <span className="font-bold text-sm text-white">
                8. StabilizerVault (Autonomous Uniswap V4 Stabilizer)
              </span>
            </div>
            {deployed.stabilizerVault && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-white/60">
            Dynamic liquidity-aware price stabilization engine between UVBE/USDC Uniswap V4 pool and
            on-chain NAV price.
          </p>
          {deployed.stabilizerVault ? (
            <a
              href={`${explorerUrl}/address/${deployed.stabilizerVault}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono text-emerald-300 hover:underline break-all bg-black/40 p-2 rounded flex items-center justify-between"
            >
              <span>StabilizerVault: {deployed.stabilizerVault}</span>
              <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
            </a>
          ) : (
            <button
              onClick={deployStabilizerVault}
              disabled={loadingStep !== null || !isConnected}
              className="w-full py-2.5 rounded-lg text-xs font-black bg-[#BFFF00] text-black hover:bg-[#a6df00] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingStep === 8 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              <span>Deploy StabilizerVault</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
