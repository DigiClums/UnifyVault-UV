'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import {
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { isAddress, encodeDeployData, parseAbi, type Address } from 'viem';
import { DEPLOYMENT_ARTIFACTS } from '../../lib/deployment/generatedArtifacts';
import { getExplorerBaseUrl } from '../../constants';

const BASE_MAINNET_UNISWAP_V3_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481' as const;
const PROTOCOL_DIRECTORY_MAINNET = '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e' as const;
const SWAP_ADAPTER_MODULE_ID =
  '0xb38cc8783565eb75ee1b8d4c76a41d2179385de2efafcf6315528396e14ed8f2' as const;
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const CBBTC_BASE = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as const;
const WETH_BASE = '0x4200000000000000000000000000000000000006' as const;

export function SwapAdapterUpgradeCard({ chainId }: { chainId: number }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [deployedSwapAdapter, setDeployedSwapAdapter] = useState<Address | null>(null);
  const [customInput, setCustomInput] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [txHashes, setTxHashes] = useState<{
    deploy?: string;
    cbbtc?: string;
    weth?: string;
    dir?: string;
  }>({});

  const [statuses, setStatuses] = useState<{
    cbbtc: boolean;
    weth: boolean;
    dir: boolean;
  }>({
    cbbtc: false,
    weth: false,
    dir: false,
  });

  const explorerUrl = getExplorerBaseUrl(chainId || 8453);
  const activeSwapAdapter =
    deployedSwapAdapter || (isAddress(customInput) ? (customInput as Address) : null);

  const refreshStatuses = useCallback(async () => {
    if (!publicClient || !activeSwapAdapter) return;
    try {
      const saAbi = parseAbi([
        'function getPoolFee(address tokenA, address tokenB) view returns (uint24)',
      ]);
      const dirAbi = parseAbi(['function getAddress(bytes32 id) view returns (address)']);

      const [cbbtcFee, wethFee, registeredSa] = await Promise.all([
        publicClient
          .readContract({
            address: activeSwapAdapter,
            abi: saAbi,
            functionName: 'getPoolFee',
            args: [USDC_BASE, CBBTC_BASE],
          })
          .catch(() => 0),
        publicClient
          .readContract({
            address: activeSwapAdapter,
            abi: saAbi,
            functionName: 'getPoolFee',
            args: [USDC_BASE, WETH_BASE],
          })
          .catch(() => 0),
        publicClient
          .readContract({
            address: PROTOCOL_DIRECTORY_MAINNET,
            abi: dirAbi,
            functionName: 'getAddress',
            args: [SWAP_ADAPTER_MODULE_ID],
          })
          .catch(() => null),
      ]);

      setStatuses({
        cbbtc: cbbtcFee === 500,
        weth: wethFee === 500,
        dir: !!registeredSa && registeredSa.toLowerCase() === activeSwapAdapter.toLowerCase(),
      });
    } catch (e) {
      console.warn('Error refreshing statuses:', e);
    }
  }, [publicClient, activeSwapAdapter]);

  useEffect(() => {
    refreshStatuses();
    const timer = setInterval(refreshStatuses, 6000);
    return () => clearInterval(timer);
  }, [refreshStatuses]);

  const handleDeploy = async () => {
    if (!walletClient || !publicClient || !address) {
      setErrorMessage('Please connect your governance wallet (0x441d...) in MetaMask.');
      return;
    }
    setIsDeploying(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const deployData = encodeDeployData({
        abi: DEPLOYMENT_ARTIFACTS.SwapAdapter.abi,
        bytecode: DEPLOYMENT_ARTIFACTS.SwapAdapter.bytecode,
        args: [address, BASE_MAINNET_UNISWAP_V3_ROUTER],
      });

      const hash = await walletClient.sendTransaction({
        account: address,
        data: deployData,
      });

      setTxHashes((prev) => ({ ...prev, deploy: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status !== 'success' || !receipt.contractAddress) {
        throw new Error(`Deployment failed or reverted on-chain. Tx: ${hash}`);
      }

      const newAddr = receipt.contractAddress as Address;
      setDeployedSwapAdapter(newAddr);
      setSuccessMessage(`🎉 SwapAdapter deployed successfully at ${newAddr}`);
    } catch (e: any) {
      console.error('Deploy error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Failed to deploy SwapAdapter.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAction = async (actionId: 'cbbtc' | 'weth' | 'dir') => {
    if (!walletClient || !publicClient || !address || !activeSwapAdapter) {
      setErrorMessage('Please connect your wallet and deploy/specify the SwapAdapter address.');
      return;
    }
    setActiveActionId(actionId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let hash: `0x${string}`;

      if (actionId === 'cbbtc') {
        const saAbi = parseAbi([
          'function setPoolFee(address tokenA, address tokenB, uint24 fee) external',
        ]);
        hash = await walletClient.writeContract({
          account: address,
          address: activeSwapAdapter,
          abi: saAbi,
          functionName: 'setPoolFee',
          args: [USDC_BASE, CBBTC_BASE, 500],
        });
      } else if (actionId === 'weth') {
        const saAbi = parseAbi([
          'function setPoolFee(address tokenA, address tokenB, uint24 fee) external',
        ]);
        hash = await walletClient.writeContract({
          account: address,
          address: activeSwapAdapter,
          abi: saAbi,
          functionName: 'setPoolFee',
          args: [USDC_BASE, WETH_BASE, 500],
        });
      } else {
        const dirAbi = parseAbi(['function updateAddress(bytes32 id, address target) external']);
        hash = await walletClient.writeContract({
          account: address,
          address: PROTOCOL_DIRECTORY_MAINNET,
          abi: dirAbi,
          functionName: 'updateAddress',
          args: [SWAP_ADAPTER_MODULE_ID, activeSwapAdapter],
        });
      }

      setTxHashes((prev) => ({ ...prev, [actionId]: hash }));
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status !== 'success') {
        throw new Error(`Transaction failed on-chain: ${hash}`);
      }

      setSuccessMessage(`🎉 Transaction confirmed successfully! Tx: ${hash.slice(0, 14)}...`);
      await refreshStatuses();
    } catch (e: any) {
      console.error('Action error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Transaction execution failed.');
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl border-2 border-black dark:border-white/10 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#BFFF00] text-black">
              Phase D Upgrade
            </span>
            <span className="text-xs font-mono text-purple-300">Base Mainnet (8453)</span>
          </div>
          <h2 className="text-xl font-black mt-1">SwapAdapter Deployment & Registry Cutover</h2>
          <p className="text-xs text-white/70 mt-0.5">
            Deploys new SwapAdapter with canonical Uniswap V3 Router (0x2626...481), sets 500 pool
            fees, and binds to ProtocolDirectory.
          </p>
        </div>
        <button
          onClick={refreshStatuses}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#BFFF00]" />
          <span>Refresh On-Chain State</span>
        </button>
      </div>

      {/* Transaction 1: Deployment */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-[#BFFF00] text-black font-black text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Deploy New SwapAdapter Contract
            </h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Router: <code>0x2626...481</code>
          </span>
        </div>

        {deployedSwapAdapter ? (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-400 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>SwapAdapter Successfully Deployed On-Chain</span>
            </div>
            <div className="flex items-center justify-between font-mono text-xs bg-black/50 p-2.5 rounded-lg border border-border">
              <span className="text-foreground">{deployedSwapAdapter}</span>
              <a
                href={`${explorerUrl}/address/${deployedSwapAdapter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#BFFF00] underline flex items-center gap-1"
              >
                View on Basescan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleDeploy}
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
                  <Sparkles className="w-4 h-4" />
                  <span>Deploy SwapAdapter (Transaction 1)</span>
                </>
              )}
            </button>

            {txHashes.deploy && (
              <div className="text-xs font-mono text-muted-foreground flex items-center space-x-1 pt-1">
                <span>Deploy Tx:</span>
                <a
                  href={`${explorerUrl}/tx/${txHashes.deploy}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#BFFF00] underline flex items-center gap-1"
                >
                  {txHashes.deploy.slice(0, 18)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="pt-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Or Attach Already Deployed SwapAdapter Address:
              </label>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value.trim())}
                placeholder="0x... (If already deployed via external script)"
                className="w-full mt-1 p-2.5 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:border-[#BFFF00]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions 2, 3, 4: Configuration & Registry */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white font-black text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Configure Pool Fees & Update ProtocolDirectory
            </h3>
          </div>
          <span className="text-xs font-mono text-purple-400">
            Signer: <code>0x441d...</code>
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {/* Step 2: cbBTC */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-foreground">
                Transaction 2: Set USDC / cbBTC Fee to 500
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                SwapAdapter.setPoolFee(USDC, cbBTC, 500)
              </div>
            </div>
            {statuses.cbbtc ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fee = 500 Active
              </span>
            ) : (
              <button
                onClick={() => handleAction('cbbtc')}
                disabled={!activeSwapAdapter || activeActionId === 'cbbtc'}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40 shrink-0"
              >
                {activeActionId === 'cbbtc' ? 'Setting Fee...' : 'Set cbBTC Fee (500)'}
              </button>
            )}
          </div>

          {/* Step 3: WETH */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-foreground">
                Transaction 3: Set USDC / WETH Fee to 500
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                SwapAdapter.setPoolFee(USDC, WETH, 500)
              </div>
            </div>
            {statuses.weth ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fee = 500 Active
              </span>
            ) : (
              <button
                onClick={() => handleAction('weth')}
                disabled={!activeSwapAdapter || activeActionId === 'weth'}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40 shrink-0"
              >
                {activeActionId === 'weth' ? 'Setting Fee...' : 'Set WETH Fee (500)'}
              </button>
            )}
          </div>

          {/* Step 4: ProtocolDirectory */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-foreground">
                Transaction 4: Update ProtocolDirectory SWAP_ADAPTER
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                ProtocolDirectory.updateAddress(SWAP_ADAPTER, newSwapAdapter)
              </div>
            </div>
            {statuses.dir ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Registered in Directory
              </span>
            ) : (
              <button
                onClick={() => handleAction('dir')}
                disabled={!activeSwapAdapter || activeActionId === 'dir'}
                className="px-4 py-2 rounded-lg bg-[#BFFF00] text-black font-bold text-xs cursor-pointer disabled:opacity-40 shrink-0"
              >
                {activeActionId === 'dir' ? 'Updating Directory...' : 'Update Directory (Tx 4)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="font-mono">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Execution Error:</span>
            <p className="font-mono">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
