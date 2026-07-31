'use client';

import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { TREASURY_ABI } from '../../lib/contracts';
import { FALLBACK_ADDRESSES, ADMIN_ADDRESS } from '../../constants';
import { ShieldAlert, Lock, Wallet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Default Admin / Deployer Role hash
const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

interface AdminAccessGateProps {
  children: React.ReactNode;
}

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const { address, isConnected } = useAccount();

  // Read admin role from Treasury AccessControl
  const { data: isAdminRole, isLoading } = useReadContract({
    address: FALLBACK_ADDRESSES.TREASURY,
    abi: [
      {
        inputs: [
          { name: 'role', type: 'bytes32' },
          { name: 'account', type: 'address' },
        ],
        name: 'hasRole',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Check optional env override or rely on on-chain AccessControl role
  const envAdmin = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || ADMIN_ADDRESS).toLowerCase();
  const isEnvAdmin = !!(address && envAdmin && address.toLowerCase() === envAdmin);
  const isAdmin = (isAdminRole as boolean) || isEnvAdmin;

  if (!isConnected) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <Wallet className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Connect Admin Wallet</h2>
        <p className="text-xs text-slate-400 max-w-md mt-2 mb-6">
          Please connect your Web3 wallet containing{' '}
          <code className="text-purple-400 font-mono">GOVERNANCE_ROLE</code> or{' '}
          <code className="text-purple-400 font-mono">DEFAULT_ADMIN_ROLE</code> permissions to
          access protocol governance controls.
        </p>
        <ConnectButton />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mb-4" />
        <p className="text-xs text-slate-400">Verifying on-chain governance permissions...</p>
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
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Access Denied</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Connected account <code className="text-rose-400 font-mono">{address}</code> does not
            possess <code className="text-purple-400 font-mono">DEFAULT_ADMIN_ROLE</code> or{' '}
            <code className="text-purple-400 font-mono">GOVERNANCE_ROLE</code> on the protocol
            contract suite.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-subtle text-left max-w-md w-full space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Role Requirement Checklist:</span>
          </div>
          <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
            <li>Treasury Admin Role (0x0000...0000)</li>
            <li>Controller Governance Role</li>
            <li>Oracle Manager Governance Role</li>
          </ul>
        </div>

        <div className="pt-2 flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
