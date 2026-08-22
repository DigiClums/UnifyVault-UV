'use client';

import React, { useState } from 'react';
import { Copy, Check, Download, ExternalLink, FileCode, CheckCircle2, Zap } from 'lucide-react';
import type { DeployedContractsMap } from '../../lib/deployment/types';

interface DeployedManifestViewProps {
  deployedContracts: DeployedContractsMap;
  onExportJson: () => string;
  onExportEnv: () => string;
  onBindContracts?: () => Promise<void>;
  isBinding?: boolean;
}

const CONTRACT_DEFINITIONS: { key: keyof DeployedContractsMap; name: string; role: string }[] = [
  {
    key: 'ProtocolDirectory',
    name: 'ProtocolDirectory',
    role: 'Central registry for all protocol modules',
  },
  {
    key: 'OracleManager',
    name: 'OracleManager',
    role: 'Multi-source pricing aggregator & circuit breaker',
  },
  {
    key: 'ChainlinkOracleProvider',
    name: 'ChainlinkOracleProvider',
    role: 'Chainlink feed wrapper with staleness checks',
  },
  { key: 'Treasury', name: 'Treasury', role: 'Protocol fee and reserve asset treasury' },
  {
    key: 'FeeManager',
    name: 'FeeManager',
    role: 'Dynamic fee routing and deposit/redeem calculations',
  },
  { key: 'CustodyVault', name: 'CustodyVault', role: 'Segregated collateral custody vault' },
  { key: 'LiquidityManager', name: 'LiquidityManager', role: 'Rebalancing and liquidity router' },
  { key: 'UVBEV2', name: 'UVBEV2 (UVBE)', role: 'ERC-20 Index Share Token (18 decimals)' },
  { key: 'SwapAdapter', name: 'SwapAdapter', role: 'Uniswap V3 router swap adapter' },
  { key: 'StrategyManager', name: 'StrategyManager', role: '60/40 BTC-ETH Target Allocator' },
  {
    key: 'PortfolioManager',
    name: 'PortfolioManager',
    role: 'Live NAV and UVBE share price calculation',
  },
  {
    key: 'UnifyVaultController',
    name: 'UnifyVaultController',
    role: 'Atomic deposit, mint, and redeem controller',
  },
  {
    key: 'CostBasisManagerV2',
    name: 'CostBasisManagerV2',
    role: 'User cost-basis and tax accounting ledger',
  },
  {
    key: 'P2PEscrowV2',
    name: 'P2PEscrowV2',
    role: 'Peer-to-peer escrow engine with 1% protocol fee',
  },
  {
    key: 'PerformanceManager',
    name: 'PerformanceManager',
    role: 'Performance analytics and benchmark module',
  },
  {
    key: 'Marketplace',
    name: 'Marketplace',
    role: 'Non-custodial P2P order book & matching engine',
  },
];

export function DeployedManifestView({
  deployedContracts,
  onExportJson,
  onExportEnv,
  onBindContracts,
  isBinding = false,
}: DeployedManifestViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedBulk, setCopiedBulk] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyBulk = (type: 'json' | 'env') => {
    const text = type === 'json' ? onExportJson() : onExportEnv();
    navigator.clipboard.writeText(text);
    setCopiedBulk(type);
    setTimeout(() => setCopiedBulk(null), 2000);
  };

  const handleDownload = () => {
    const jsonStr = onExportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unifyvault-base-sepolia-manifest-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deployedCount = Object.values(deployedContracts).filter(Boolean).length;

  return (
    <div className="rounded-2xl border-2 border-black dark:border-white/10 bg-card p-5 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-black text-foreground">Deployed Contracts Manifest</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#BFFF00] text-black">
              {deployedCount} / {CONTRACT_DEFINITIONS.length} Deployed
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Live on-chain contract addresses captured from transaction receipts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCopyBulk('env')}
            className="px-2.5 py-1.5 rounded-xl bg-background hover:bg-muted text-xs font-semibold border border-border flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            {copiedBulk === 'env' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <FileCode className="w-3.5 h-3.5" />
            )}
            <span>{copiedBulk === 'env' ? 'Copied .env' : 'Copy .env'}</span>
          </button>

          <button
            onClick={() => handleCopyBulk('json')}
            className="px-2.5 py-1.5 rounded-xl bg-background hover:bg-muted text-xs font-semibold border border-border flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            {copiedBulk === 'json' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedBulk === 'json' ? 'Copied JSON' : 'Copy JSON'}</span>
          </button>

          {onBindContracts && deployedCount > 0 && (
            <button
              onClick={onBindContracts}
              disabled={isBinding}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0_#000] flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-[#BFFF00] ${isBinding ? 'animate-spin' : ''}`} />
              <span>{isBinding ? 'Binding...' : '⚡ Bind to Frontend'}</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="px-2.5 py-1.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-bold border border-black shadow-[1px_1px_0_#000] flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {CONTRACT_DEFINITIONS.map((def) => {
          const addr = deployedContracts[def.key];
          const isDeployed = Boolean(addr);

          return (
            <div
              key={def.key}
              className={`p-3 rounded-xl border transition-all ${
                isDeployed
                  ? 'bg-muted/20 border-border hover:border-[#BFFF00]/40'
                  : 'bg-muted/5 border-border/40 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center space-x-1.5">
                  {isDeployed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  <span>{def.name}</span>
                </span>
                {isDeployed && addr && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleCopy(def.key, addr)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Copy Address"
                    >
                      {copiedKey === def.key ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`https://sepolia.basescan.org/address/${addr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="View on BaseScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-1 font-mono text-[11px]">
                {isDeployed && addr ? (
                  <span className="text-emerald-400 break-all">{addr}</span>
                ) : (
                  <span className="text-muted-foreground italic">Pending deployment...</span>
                )}
              </div>

              <div className="mt-1 text-[10px] text-muted-foreground">{def.role}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
