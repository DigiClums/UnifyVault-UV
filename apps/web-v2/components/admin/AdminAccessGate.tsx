'use client';

import React from 'react';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { ShieldAlert, Lock, Wallet, ArrowLeft, Rocket } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface AdminAccessGateProps {
  children: React.ReactNode;
}

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const { isAdmin, isLoading, isConnected, address } = useAdminAccess();

  if (!isConnected) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <Wallet className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">403 — Wallet Required</h2>
        <p className="text-xs text-muted-foreground max-w-md mt-2 mb-6">
          Please connect an authorized Web3 wallet holding on-chain DEFAULT_ADMIN_ROLE permissions
          to access protocol administration controls.
        </p>
        <ConnectButton />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mb-4" />
        <p className="text-xs text-muted-foreground">Verifying on-chain AccessControl roles...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-glow">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <div className="space-y-1 max-w-md">
          <div className="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-mono text-xs font-bold mb-2">
            403 Forbidden
          </div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            403 — Unauthorized Access
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connected wallet <code className="text-rose-400 font-mono">{address}</code> does not
            hold an active <code className="text-rose-400 font-mono">DEFAULT_ADMIN_ROLE</code> on
            the Protocol Directory or Controller smart contracts.
          </p>
        </div>

        {/* Quick Route to Deployment Runner */}
        <div className="p-4 rounded-2xl bg-[#BFFF00]/10 border-2 border-[#BFFF00]/30 text-left max-w-md w-full space-y-2">
          <div className="flex items-center space-x-2 text-foreground font-bold text-xs">
            <Rocket className="w-4 h-4 text-[#BFFF00]" />
            <span>Deploying the Protocol?</span>
          </div>
          <p className="text-xs text-muted-foreground">
            If you are currently deploying or replaying transactions on Base Sepolia, access the
            unrestricted browser deployment runner directly:
          </p>
          <div className="pt-1">
            <Link
              href="/deploy"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#BFFF00] text-black font-black text-xs hover:bg-[#d0ff66] transition-all shadow-[2px_2px_0_#000]"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Open Deployment Runner (/deploy)</span>
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-subtle text-left max-w-md w-full space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-foreground font-semibold">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>On-Chain Role Verification Status:</span>
          </div>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
            <li>DEFAULT_ADMIN_ROLE: ❌ Not Granted (Assigned during Phase 7 of deployment)</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface border border-border-subtle text-muted-foreground hover:text-foreground text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to App</span>
          </Link>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
