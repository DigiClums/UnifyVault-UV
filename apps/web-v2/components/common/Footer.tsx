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
      name: 'UVBE Token',
      address: directory.token || DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
      isErc20: true,
      symbol: 'UVBE',
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
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 mt-16 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Main Footer Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00] shrink-0" />
            <span className="font-semibold text-foreground">UnifyVault V2 Protocol</span>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-[11px] text-muted-foreground">
              Production Smart Contracts Audited & Verified
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-medium">
            <Link
              href="/contracts"
              className="text-muted-foreground hover:text-[#5f8f00] dark:hover:text-[#BFFF00] transition-colors flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span>Contracts Directory</span>
            </Link>

            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center space-x-1 hover:text-[#5f8f00] dark:hover:text-[#BFFF00] transition-colors font-mono text-[11px] px-2.5 py-1 rounded-lg bg-card border border-border-subtle text-foreground shadow-2xs"
            >
              <span>On-Chain Addresses</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  panelOpen ? 'rotate-180 text-[#5f8f00] dark:text-[#BFFF00]' : ''
                }`}
              />
            </button>

            <Link
              href="/transactions"
              className="text-muted-foreground hover:text-[#5f8f00] dark:hover:text-[#BFFF00] transition-colors"
            >
              Activity Explorer
            </Link>

            <a
              href="https://docs.unifyvault.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-[#5f8f00] dark:hover:text-[#BFFF00] transition-colors flex items-center space-x-1"
            >
              <span>Documentation</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Collapsible Contract Addresses Disclosure Panel */}
        {panelOpen && (
          <div className="mt-4 p-4 rounded-xl bg-card border border-border-subtle space-y-3 font-mono shadow-xs animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle font-sans">
              <div className="flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
                <span className="font-bold text-foreground text-xs">
                  Verified Deployed Contracts ({activeChainName})
                </span>
              </div>
              <Link
                href="/contracts"
                className="text-[11px] text-[#5f8f00] dark:text-[#BFFF00] hover:underline flex items-center space-x-1"
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
                    className="p-2.5 rounded-lg bg-background border border-border-subtle space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-sans">
                      <span className="font-bold text-foreground truncate">{c.name}</span>
                      {c.isErc20 && (
                        <AddTokenToWallet
                          address={c.address as `0x${string}`}
                          symbol={c.symbol}
                          decimals={c.decimals}
                          compact
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground pt-0.5">
                      <span title={c.address} className="cursor-help font-mono font-semibold">
                        {shortAddr(c.address)}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleCopy(c.address)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title={`Copy ${c.name} address`}
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-muted text-[#5f8f00] dark:text-[#BFFF00] transition-colors"
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
