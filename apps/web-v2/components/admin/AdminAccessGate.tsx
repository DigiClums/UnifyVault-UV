'use client';

import React from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { ACCESS_CONTROL_ABI } from '../../lib/contracts/directory';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { DEFAULT_ADMIN_ROLE, GUARDIAN_ROLE, TIMELOCK_ROLE } from '../../constants';
import { ShieldAlert, Lock, Wallet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface AdminAccessGateProps {
  children: React.ReactNode;
}

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const { address, isConnected } = useAccount();
  const { treasury, controller } = useProtocolDirectory();

  // Production AccessControl Role Checks directly from on-chain contracts
  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: treasury,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
      },
      {
        address: treasury,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [TIMELOCK_ROLE, address] : undefined,
      },
      {
        address: treasury,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [GUARDIAN_ROLE, address] : undefined,
      },
      {
        address: controller,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'isAdmin',
        args: address ? [address] : undefined,
      },
    ],
    query: {
      enabled: !!address && (!!treasury || !!controller),
    },
  });

  const isAdminRole = Boolean(data?.[0]?.result);
  const isTimelockRole = Boolean(data?.[1]?.result);
  const isGuardianRole = Boolean(data?.[2]?.result);
  const isControllerAdmin = Boolean(data?.[3]?.result);

  // Pure on-chain role verification
  const isAuthorized = isAdminRole || isTimelockRole || isGuardianRole || isControllerAdmin;

  if (!isConnected) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <Wallet className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Connect Admin Wallet</h2>
        <p className="text-xs text-slate-400 max-w-md mt-2 mb-6">
          Please connect an authorized Web3 wallet holding an on-chain AccessControl role (Admin,
          Timelock, or Guardian) to access protocol administration controls.
        </p>
        <ConnectButton />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mb-4" />
        <p className="text-xs text-slate-400">Verifying on-chain AccessControl roles...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-glow">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Access Denied</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Connected wallet <code className="text-rose-400 font-mono">{address}</code> does not
            hold an active AccessControl role on the Protocol Directory or Treasury.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-subtle text-left max-w-md w-full space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>On-Chain Role Verification Status:</span>
          </div>
          <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
            <li>DEFAULT_ADMIN_ROLE: {isAdminRole ? '✅ Granted' : '❌ Not Granted'}</li>
            <li>TIMELOCK_ROLE: {isTimelockRole ? '✅ Granted' : '❌ Not Granted'}</li>
            <li>GUARDIAN_ROLE: {isGuardianRole ? '✅ Granted' : '❌ Not Granted'}</li>
          </ul>
        </div>

        <div className="pt-2 flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white text-xs font-semibold"
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
