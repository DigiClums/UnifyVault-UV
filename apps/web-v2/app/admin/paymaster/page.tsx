'use client';

import React, { useState } from 'react';
import { usePaymasterAdmin } from '../../../hooks/usePaymasterAdmin';
import { PaymasterHealthSection } from '../../../components/paymaster/PaymasterHealthSection';
import { GasTreasurySection } from '../../../components/paymaster/GasTreasurySection';
import { PaymasterPolicySection } from '../../../components/paymaster/PaymasterPolicySection';
import { ApprovedTargetsSection } from '../../../components/paymaster/ApprovedTargetsSection';
import { PaymasterEmergencySection } from '../../../components/paymaster/PaymasterEmergencySection';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Fuel, Vault, Sliders, ShieldCheck, ShieldAlert, RefreshCw, Activity } from 'lucide-react';

export default function PaymasterAdminPage() {
  const [currentTab, setCurrentTab] = useState<
    'health' | 'treasury' | 'policy' | 'targets' | 'emergency'
  >('health');

  const state = usePaymasterAdmin();

  const getStatusBadgeProps = (status: typeof state.healthStatus) => {
    switch (status) {
      case 'Healthy':
        return { status: 'Healthy' as const, label: 'SYSTEM HEALTHY' };
      case 'Warning':
        return { status: 'Warning' as const, label: 'LOW GAS DEPOSIT' };
      case 'Critical':
        return { status: 'Error' as const, label: 'CRITICAL GAS BALANCE' };
      case 'Paused':
        return { status: 'Paused' as const, label: 'CIRCUIT BREAKER PAUSED' };
      default:
        return { status: 'Unknown' as const, label: 'CONNECTING TELEMETRY' };
    }
  };

  const badgeProps = getStatusBadgeProps(state.healthStatus);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Paymaster & Gas Treasury Console
            </h1>
            <StatusBadge status={badgeProps.status} label={badgeProps.label} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            ERC-4337 Account Abstraction gas sponsorship policy, EntryPoint v0.7 reserve monitoring,
            and Gas Treasury automation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => state.refetch()}
            disabled={state.isLoading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-all disabled:opacity-50 min-h-[38px]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${state.isLoading ? 'animate-spin text-purple-400' : ''}`}
            />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar border-b border-border-subtle/60 pb-1">
        <button
          type="button"
          onClick={() => setCurrentTab('health')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'health'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>Paymaster Health</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('treasury')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'treasury'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Vault className="w-4 h-4" />
          <span>Gas Treasury</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('policy')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'policy'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Sponsorship Policy</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('targets')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'targets'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Approved Targets</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('emergency')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'emergency'
              ? 'bg-rose-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Emergency Controls</span>
        </button>
      </div>

      {/* Tab Panels */}
      {currentTab === 'health' && <PaymasterHealthSection state={state} />}

      {currentTab === 'treasury' && <GasTreasurySection state={state} onRefresh={state.refetch} />}

      {currentTab === 'policy' && (
        <PaymasterPolicySection state={state} onRefresh={state.refetch} />
      )}

      {currentTab === 'targets' && (
        <ApprovedTargetsSection state={state} onRefresh={state.refetch} />
      )}

      {currentTab === 'emergency' && (
        <PaymasterEmergencySection state={state} onRefresh={state.refetch} />
      )}
    </div>
  );
}
