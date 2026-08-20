'use client';

import React from 'react';
import { formatEther } from 'viem';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import { TableCard } from '../ui/TableCard';
import {
  Fuel,
  Vault,
  ShieldCheck,
  Activity,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { PaymasterAdminState } from '../../hooks/usePaymasterAdmin';

export interface PaymasterHealthSectionProps {
  state: PaymasterAdminState;
}

export function PaymasterHealthSection({ state }: PaymasterHealthSectionProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const depositEth = formatEther(state.entryPointDeposit);
  const treasuryEth = formatEther(state.gasTreasuryEthBalance);
  const paymasterDirectEth = formatEther(state.paymasterEthBalance);

  const getStatusBadgeProps = (status: PaymasterAdminState['healthStatus']) => {
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
      {/* Low Balance or Paused Alert Banner */}
      {state.isPaymasterPaused && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-start space-x-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-rose-200">Paymaster Gas Sponsorship Paused</h4>
            <p className="text-xs text-rose-300/90 leading-relaxed">
              Account Abstraction UserOperations cannot be sponsored while the Paymaster is paused.
              Authorized owner can unpause in the Emergency Controls section.
            </p>
          </div>
        </div>
      )}

      {!state.isPaymasterPaused && state.isLowBalance && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-start space-x-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-amber-200">Low Gas Sponsorship Deposit Warning</h4>
            <p className="text-xs text-amber-300/90 leading-relaxed">
              EntryPoint gas deposit is below the recommended 0.01 ETH operational buffer (
              {depositEth} ETH remaining). Refill the Paymaster deposit using the Gas Treasury
              controls below.
            </p>
          </div>
        </div>
      )}

      {/* Health Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="EntryPoint Gas Deposit"
          value={`${Number(depositEth).toFixed(4)} ETH`}
          subtitle={`${state.entryPointDeposit.toString()} wei`}
          icon={Fuel}
          glowColor={state.healthStatus === 'Healthy' ? 'emerald' : 'amber'}
        />

        <StatCard
          title="Gas Treasury Reserve"
          value={`${Number(treasuryEth).toFixed(4)} ETH`}
          subtitle={`Native reserve on Base`}
          icon={Vault}
          glowColor="blue"
        />

        <StatCard
          title="Paymaster Status"
          value={state.isPaymasterPaused ? 'PAUSED' : 'ACTIVE'}
          subtitle={state.isPaymasterPaused ? 'Sponsorship disabled' : 'Verifying & Policy Active'}
          icon={ShieldCheck}
          glowColor={state.isPaymasterPaused ? 'amber' : 'emerald'}
        />

        <StatCard
          title="Gas Treasury Status"
          value={state.isGasTreasuryPaused ? 'PAUSED' : 'ACTIVE'}
          subtitle={state.isGasTreasuryPaused ? 'Refills locked' : 'Automated Refills Active'}
          icon={Activity}
          glowColor={state.isGasTreasuryPaused ? 'amber' : 'cyan'}
        />
      </div>

      {/* Contract Telemetry & Authorities Table */}
      <TableCard
        title="Live Contract & Infrastructure Telemetry"
        subtitle="On-chain contract instances, authorities, and state variables for Account Abstraction"
        icon={Fuel}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Component / Subsystem</th>
                <th className="py-3 px-4">Contract Address</th>
                <th className="py-3 px-4">Operational Status</th>
                <th className="py-3 px-4">Authority / Signer</th>
                <th className="py-3 px-4 text-right">Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {/* Paymaster */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  <div className="flex items-center space-x-2">
                    <Fuel className="w-4 h-4 text-purple-400" />
                    <span>UnifyVaultPaymaster</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-foreground">{state.paymasterAddress}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(state.paymasterAddress, 'paymaster')}
                      className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Address"
                    >
                      {copiedKey === 'paymaster' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-sans">
                  <StatusBadge
                    status={state.isPaymasterPaused ? 'Paused' : 'Active'}
                    label={state.isPaymasterPaused ? 'PAUSED' : 'LIVE SPONSORING'}
                  />
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  <div className="space-y-0.5 text-[11px]">
                    <div>
                      <span className="font-semibold text-foreground/80">Owner:</span>{' '}
                      <code className="text-purple-400 font-mono text-[10px]">
                        {state.paymasterOwner
                          ? `${state.paymasterOwner.slice(0, 6)}...${state.paymasterOwner.slice(-4)}`
                          : 'Loading...'}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground/80">Signer:</span>{' '}
                      <code className="text-cyan-400 font-mono text-[10px]">
                        {state.verifyingSigner &&
                        state.verifyingSigner !== '0x0000000000000000000000000000000000000000'
                          ? `${state.verifyingSigner.slice(0, 6)}...${state.verifyingSigner.slice(-4)}`
                          : 'None (Pure On-Chain)'}
                      </code>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-sans">
                  <a
                    href={`${state.explorerBaseUrl}/address/${state.paymasterAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 underline"
                  >
                    <span>BaseScan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>

              {/* EntryPoint */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>EntryPoint v0.7</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-foreground">{state.entryPointAddress}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(state.entryPointAddress, 'entrypoint')}
                      className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Address"
                    >
                      {copiedKey === 'entrypoint' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-sans">
                  <StatusBadge status="Healthy" label="CANONICAL V0.7" />
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  <span className="text-[11px]">Deposit: </span>
                  <span className="font-mono font-bold text-foreground">{depositEth} ETH</span>
                </td>
                <td className="py-3.5 px-4 text-right font-sans">
                  <a
                    href={`${state.explorerBaseUrl}/address/${state.entryPointAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 underline"
                  >
                    <span>BaseScan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>

              {/* Gas Treasury */}
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                  <div className="flex items-center space-x-2">
                    <Vault className="w-4 h-4 text-accent-blue" />
                    <span>GasTreasury Reserve</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-foreground">{state.gasTreasuryAddress}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(state.gasTreasuryAddress, 'treasury')}
                      className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Address"
                    >
                      {copiedKey === 'treasury' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-sans">
                  <StatusBadge
                    status={state.isGasTreasuryPaused ? 'Paused' : 'Active'}
                    label={state.isGasTreasuryPaused ? 'PAUSED' : 'ACTIVE'}
                  />
                </td>
                <td className="py-3.5 px-4 font-sans text-muted-foreground">
                  <div className="space-y-0.5 text-[11px]">
                    <div>
                      <span className="font-semibold text-foreground/80">Owner:</span>{' '}
                      <code className="text-purple-400 font-mono text-[10px]">
                        {state.gasTreasuryOwner
                          ? `${state.gasTreasuryOwner.slice(0, 6)}...${state.gasTreasuryOwner.slice(-4)}`
                          : 'Loading...'}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground/80">Operator:</span>{' '}
                      <code className="text-amber-400 font-mono text-[10px]">
                        {state.refillOperator
                          ? `${state.refillOperator.slice(0, 6)}...${state.refillOperator.slice(-4)}`
                          : 'Loading...'}
                      </code>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-sans">
                  <a
                    href={`${state.explorerBaseUrl}/address/${state.gasTreasuryAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 underline"
                  >
                    <span>BaseScan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </TableCard>
    </div>
  );
}
