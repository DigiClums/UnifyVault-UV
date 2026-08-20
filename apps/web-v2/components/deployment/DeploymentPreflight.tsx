'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Smartphone } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface DeploymentPreflightProps {
  isConnected: boolean;
  isCorrectNetwork: boolean;
  address?: `0x${string}`;
  balance: string;
  onSwitchNetwork: () => void;
}

export function DeploymentPreflight({
  isConnected,
  isCorrectNetwork,
  address,
  balance,
  onSwitchNetwork,
}: DeploymentPreflightProps) {
  const ethBalance = parseFloat(balance) || 0;
  const isBalanceSufficient = ethBalance >= 0.01;
  const isBalanceRecommended = ethBalance >= 0.05;

  const [isSafePalDetected, setIsSafePalDetected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.safepalProvider || win.ethereum?.isSafePal) {
        setIsSafePalDetected(true);
      }
    }
  }, []);

  return (
    <div className="rounded-2xl border-2 border-black dark:border-white/10 bg-card p-5 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#BFFF00] text-black border border-black shadow-[1px_1px_0_#000]">
              Pre-Flight Security Checklist
            </span>
            <span className="text-xs text-muted-foreground font-mono">Chain ID: 84532</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-foreground">
            Base Sepolia Browser Deployment Runner
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Zero Private Key Exposure</span>
          </div>
        </div>
      </div>

      {isSafePalDetected && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border-2 border-amber-500/40 text-amber-300 text-xs space-y-1.5">
          <div className="flex items-center space-x-2 font-bold text-amber-200">
            <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
            <span>SafePal Injected Provider Notice:</span>
          </div>
          <p className="leading-relaxed">
            SafePal's internal DApp browser proxy enforces strict payload size limits on contract
            creations, causing an internal 403 error on large contracts like UVBEV2.
            <strong> For smooth deployment:</strong> Connect via <strong>WalletConnect</strong>{' '}
            inside SafePal or open this page in <strong>MetaMask</strong>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Wallet Connection */}
        <div
          className={`p-3.5 rounded-xl border-2 transition-all ${
            isConnected
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Signer Wallet
            </span>
            {isConnected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xs truncate max-w-[150px]">
              {isConnected && address ? address : 'Not Connected'}
            </span>
            {!isConnected && (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="px-2 py-1 bg-[#BFFF00] text-black rounded-lg text-[11px] font-bold hover:bg-[#d0ff66] cursor-pointer"
                  >
                    Connect
                  </button>
                )}
              </ConnectButton.Custom>
            )}
          </div>
        </div>

        {/* Network Verification */}
        <div
          className={`p-3.5 rounded-xl border-2 transition-all ${
            isCorrectNetwork
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Target Network
            </span>
            {isCorrectNetwork ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-bold text-xs">
              {isCorrectNetwork ? 'Base Sepolia (84532)' : 'Wrong Network'}
            </span>
            {!isCorrectNetwork && (
              <button
                onClick={onSwitchNetwork}
                className="px-2 py-1 bg-rose-500 text-white rounded-lg text-[11px] font-bold hover:bg-rose-600 cursor-pointer"
              >
                Switch
              </button>
            )}
          </div>
        </div>

        {/* Gas Balance */}
        <div
          className={`p-3.5 rounded-xl border-2 transition-all ${
            isBalanceSufficient
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Deployer Gas Balance
            </span>
            {isBalanceSufficient ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xs font-bold">{balance} ETH</span>
            <span className="text-[10px] text-muted-foreground">
              {isBalanceRecommended ? 'Recommended >= 0.05' : 'Min 0.01 ETH'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#BFFF00] shrink-0" />
        <span>
          <strong>Direct Browser Signing Flow:</strong> All 53 transactions are reconstructed with
          exact Foundry dry-run parameters and submitted one-by-one for your manual signature in
          MetaMask. No private keys are ever requested or stored.
        </span>
      </div>
    </div>
  );
}
