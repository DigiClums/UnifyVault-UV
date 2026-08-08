'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { getChainTokens, getExplorerBaseUrl, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';
import { TableCard } from '../../components/ui/TableCard';
import { AddTokenToWallet } from '../../components/common/AddTokenToWallet';
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Coins,
  Search,
} from 'lucide-react';

export default function ContractsPage() {
  const { chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const activeChainName = chain?.name || 'Base Sepolia';
  const tokens = getChainTokens(chain?.id);
  const directory = useProtocolDirectory();

  const [searchFilter, setSearchFilter] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : 'Connecting...';

  const protocolModules = [
    {
      name: 'ProtocolDirectory',
      description: 'Canonical module registry & dynamic address resolver',
      address: directory.directory || DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory,
      category: 'Registry',
      icon: Layers,
      isErc20: false,
    },
    {
      name: 'UnifyVaultController',
      description: 'Primary user deposit/redeem entry point & atomic swap executor',
      address: directory.controller || DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController,
      category: 'Controller',
      icon: Activity,
      isErc20: false,
    },
    {
      name: 'UVBTCETH Token',
      description: 'Multi-asset index share token (ERC-20, 18 Decimals)',
      address: directory.token || DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
      category: 'Token',
      icon: Coins,
      isErc20: true,
      symbol: 'UVBTCETH',
      decimals: 18,
    },
    {
      name: 'PortfolioManager',
      description: 'On-chain portfolio valuation, total asset accounting & NAV calculator',
      address: directory.portfolioManager || DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager,
      category: 'Accounting',
      icon: ShieldCheck,
      isErc20: false,
    },
    {
      name: 'CustodyVault',
      description: 'Stateless multi-asset collateral vault holding cbBTC, WETH & USDC',
      address: directory.vault || DEPLOYED_CONTRACTS_SEPOLIA.CustodyVault,
      category: 'Custody',
      icon: ShieldCheck,
      isErc20: false,
    },
    {
      name: 'OracleManager',
      description: 'Multi-source oracle coordinator with staleness checks & fallback routing',
      address: directory.oracle || DEPLOYED_CONTRACTS_SEPOLIA.OracleManager,
      category: 'Oracle',
      icon: Zap,
      isErc20: false,
    },
    {
      name: 'StrategyManager',
      description: 'Target index ratio manager (60% cbBTC / 40% WETH target weights)',
      address: directory.strategyManager || DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager,
      category: 'Strategy',
      icon: Activity,
      isErc20: false,
    },
    {
      name: 'Treasury',
      description: 'Protocol-owned fee collector for deposit/redeem revenue',
      address: directory.treasury || DEPLOYED_CONTRACTS_SEPOLIA.Treasury,
      category: 'Revenue',
      icon: Coins,
      isErc20: false,
    },
  ];

  const tokenList = [
    {
      name: 'USD Coin (USDC)',
      description: 'Primary deposit collateral & payout asset (6 Decimals)',
      address: tokens.USDC,
      symbol: 'USDC',
      decimals: 6,
      category: 'Asset Token',
      icon: Coins,
      isErc20: true,
    },
    {
      name: 'Coinbase Wrapped BTC (cbBTC)',
      description: 'Custodied Bitcoin strategy asset (8 Decimals)',
      address: tokens.cbBTC,
      symbol: 'cbBTC',
      decimals: 8,
      category: 'Asset Token',
      icon: Coins,
      isErc20: true,
    },
    {
      name: 'Wrapped Ether (WETH)',
      description: 'Custodied Ethereum strategy asset (18 Decimals)',
      address: tokens.WETH,
      symbol: 'WETH',
      decimals: 18,
      category: 'Asset Token',
      icon: Coins,
      isErc20: true,
    },
  ];

  const allContracts = [...protocolModules, ...tokenList];

  const filteredContracts = allContracts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.address.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.category.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <div className="space-y-8 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <FileText className="w-6 h-6 text-accent-blue" />
              <span>Protocol Contracts & On-Chain Addresses</span>
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Canonical smart-contract address directory for UnifyVault V2 deployment on{' '}
            {activeChainName}.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-semibold text-slate-300 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{activeChainName} Deployment</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by contract name, symbol, or address..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue/80 font-mono"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredContracts.length} of {allContracts.length} deployed contracts
        </span>
      </div>

      {/* Main Table Card */}
      <TableCard
        title="Verified Deployed Protocol Contracts"
        subtitle={`Canonical smart contracts registered under ProtocolDirectory (${shortAddr(directory.directory)})`}
        icon={ShieldCheck}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-slate-400 font-semibold">
                <th className="py-3 px-3">Contract Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">On-Chain Address</th>
                <th className="py-3 px-3">Network</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {filteredContracts.map((c) => {
                const Icon = c.icon;
                const isCopied = copiedAddress === c.address;
                const explorerUrl = `${explorerBaseUrl}/address/${c.address}`;

                return (
                  <tr key={c.name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-sans font-bold text-white">
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4 text-accent-blue shrink-0" />
                        <div>
                          <span className="block">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal block font-sans">
                            {c.description}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {c.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        title={`Full Address: ${c.address}`}
                        className="text-slate-200 hover:text-white font-mono cursor-help"
                      >
                        {shortAddr(c.address)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-sans text-slate-400">
                      <span className="inline-flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{activeChainName}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-sans">
                      <div className="flex items-center justify-end space-x-2">
                        {c.isErc20 && (
                          <AddTokenToWallet
                            address={c.address as `0x${string}`}
                            symbol={c.symbol}
                            decimals={c.decimals}
                            compact
                          />
                        )}

                        <button
                          onClick={() => handleCopy(c.address)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-mono flex items-center space-x-1 transition-colors"
                          title={`Copy address: ${c.address}`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-accent-blue text-[11px] font-mono flex items-center space-x-1 transition-colors"
                          title="View contract on BaseScan"
                        >
                          <span>BaseScan</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TableCard>
    </div>
  );
}
