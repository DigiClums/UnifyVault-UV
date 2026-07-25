'use client';

import * as React from 'react';
import { ResolvedProtocolAddresses } from '../../contracts/ProtocolDirectory';

interface ContractAddressesTableProps {
  addresses: ResolvedProtocolAddresses;
  loading?: boolean;
}

export function ContractAddressesTable({ addresses, loading }: ContractAddressesTableProps) {
  const [copiedAddress, setCopiedAddress] = React.useState<string | undefined>(undefined);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(undefined), 2000);
  };

  const rows = [
    {
      name: 'UnifyVaultController (DepositManager)',
      address: addresses.controller,
      role: 'Orchestrator & Live Execution Engine',
    },
    {
      name: 'CustodyVault',
      address: addresses.vault,
      role: 'Physical Collateral & Strategy Storage',
    },
    {
      name: 'Treasury',
      address: addresses.treasury,
      role: 'Protocol Fee Revenues Safeguard',
    },
    {
      name: 'UVBTCETHToken (IndexToken)',
      address: addresses.token,
      role: 'Index Ownership ERC20 Token Shares',
    },
    {
      name: 'PortfolioManager',
      address: addresses.portfolioManager,
      role: 'NAV Calculation Engine & Allocation',
    },
    {
      name: 'OracleManager',
      address: addresses.oracleManager,
      role: 'Canonical 18-Decimal Pricing Coordinator',
    },
    {
      name: 'LiquidityManager',
      address: addresses.liquidityManager,
      role: 'Operational & Reserve Buffer Accounting',
    },
    {
      name: 'ProtocolDirectory',
      address: addresses.directory,
      role: 'Canonical Protocol Module Directory Registry',
    },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/60 p-6 backdrop-blur-md animate-pulse">
        <div className="h-6 w-48 rounded bg-muted mb-4" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 rounded bg-muted w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm dark:shadow-none overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            On-Chain Protocol Directory Registry
          </h3>
          <p className="text-xs text-muted-foreground">
            All contract addresses are resolved dynamically from ProtocolDirectory (never
            hardcoded).
          </p>
        </div>
        <span className="text-xs font-mono bg-secondary px-3 py-1 rounded-full border border-border text-muted-foreground self-start sm:self-auto">
          Base Sepolia (84532)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-border/80 text-muted-foreground uppercase text-[10px] tracking-wider">
              <th className="pb-3 pr-4 font-semibold">Contract Module</th>
              <th className="pb-3 px-4 font-semibold">Address</th>
              <th className="pb-3 px-4 font-semibold hidden md:table-cell">Module Purpose</th>
              <th className="pb-3 pl-4 text-right font-semibold">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row) => (
              <tr key={row.name} className="hover:bg-secondary/40 transition-colors">
                <td className="py-3.5 pr-4 font-bold text-foreground">{row.name}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-mono">
                      {row.address && row.address !== '0x0000000000000000000000000000000000000000'
                        ? `${row.address.slice(0, 6)}...${row.address.slice(-4)}`
                        : 'Unresolved'}
                    </span>
                    {row.address &&
                      row.address !== '0x0000000000000000000000000000000000000000' && (
                        <button
                          onClick={() => handleCopy(row.address)}
                          aria-label={`Copy address for ${row.name}`}
                          className="text-[10px] bg-secondary hover:bg-accent border border-border px-2 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedAddress === row.address ? 'Copied' : 'Copy'}
                        </button>
                      )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">
                  {row.role}
                </td>
                <td className="py-3.5 pl-4 text-right">
                  {row.address && row.address !== '0x0000000000000000000000000000000000000000' ? (
                    <a
                      href={`https://sepolia.basescan.org/address/${row.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-bold text-[11px]"
                    >
                      Basescan ↗
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
