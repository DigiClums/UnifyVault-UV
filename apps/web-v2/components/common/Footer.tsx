'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ShieldCheck, ChevronDown, Copy, Check, ExternalLink, FileText, Lock } from 'lucide-react';
import { getExplorerBaseUrl, DEPLOYED_CONTRACTS_SEPOLIA, getChainTokens } from '../../constants';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { AddTokenToWallet } from './AddTokenToWallet';

export function Footer() {
  const { chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const activeChainName = chain?.name || 'Base Sepolia';
  const directory = useProtocolDirectory();
  const tokens = getChainTokens(chain?.id);

  const [panelOpen, setPanelOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const handleCopy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddr(address);
      setTimeout(() => setCopiedAddr(null), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : 'Connecting...';

  const footerContracts = [
    {
      name: 'UVBTCETH Token',
      address: directory.token || DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
      isErc20: true,
      symbol: 'UVBTCETH',
      decimals: 18,
    },
    {
      name: 'UnifyVaultController',
      address: directory.controller || DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController,
      isErc20: false,
    },
    {
      name: 'PortfolioManager',
      address: directory.portfolioManager || DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager,
      isErc20: false,
    },
    {
      name: 'CustodyVault',
      address: directory.vault || DEPLOYED_CONTRACTS_SEPOLIA.CustodyVault,
      isErc20: false,
    },
    {
      name: 'OracleManager',
      address: directory.oracle || DEPLOYED_CONTRACTS_SEPOLIA.OracleManager,
      isErc20: false,
    },
    {
      name: 'StrategyManager',
      address: directory.strategyManager || DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager,
      isErc20: false,
    },
    {
      name: 'Treasury',
      address: directory.treasury || DEPLOYED_CONTRACTS_SEPOLIA.Treasury,
      isErc20: false,
    },
    {
      name: 'ProtocolDirectory',
      address: directory.directory || DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory,
      isErc20: false,
    },
  ];

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-6 mt-16 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Main Footer Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-accent-blue shrink-0" />
            <span className="font-semibold text-slate-200">UnifyVault V2 Protocol</span>
            <span className="text-slate-500">|</span>
            <span className="text-[11px]">Production Smart Contracts Audited & Verified</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-medium">
            <Link
              href="/contracts"
              className="hover:text-white transition-colors flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5 text-accent-blue" />
              <span>Contracts Directory</span>
            </Link>

            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center space-x-1 hover:text-white transition-colors font-mono text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800"
            >
              <span>On-Chain Addresses</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  panelOpen ? 'rotate-180 text-accent-blue' : ''
                }`}
              />
            </button>

            <Link href="/transactions" className="hover:text-white transition-colors">
              Activity Explorer
            </Link>

            <a
              href="https://docs.unifyvault.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center space-x-1"
            >
              <span>Documentation</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Collapsible Contract Addresses Disclosure Panel */}
        {panelOpen && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800 font-sans">
              <div className="flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-white text-xs">
                  Verified Deployed Contracts ({activeChainName})
                </span>
              </div>
              <Link
                href="/contracts"
                className="text-[11px] text-accent-blue hover:underline flex items-center space-x-1"
              >
                <span>View Full /contracts Directory</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              {footerContracts.map((c) => {
                const isCopied = copiedAddr === c.address;
                const explorerUrl = `${explorerBaseUrl}/address/${c.address}`;

                return (
                  <div
                    key={c.name}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-sans">
                      <span className="font-bold text-slate-200 truncate">{c.name}</span>
                      {c.isErc20 && (
                        <AddTokenToWallet
                          address={c.address as `0x${string}`}
                          symbol={c.symbol}
                          decimals={c.decimals}
                          compact
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-slate-400 pt-0.5">
                      <span title={c.address} className="cursor-help">
                        {shortAddr(c.address)}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleCopy(c.address)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title={`Copy ${c.name} address`}
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-slate-800 text-accent-blue transition-colors"
                          title="View on BaseScan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
