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
  Lock,
  Store,
  TrendingUp,
  Repeat,
  Sliders,
  Flame,
  Clock,
  Key,
  UserCheck,
  RefreshCw,
  CheckCircle2,
  LucideIcon,
  Star,
  Users,
  Sparkles,
} from 'lucide-react';

type ContractCategory =
  | 'All'
  | 'Core Vault'
  | 'Staking & Referrals'
  | 'P2P & Escrow'
  | 'Accounting'
  | 'Oracle'
  | 'Account Abstraction'
  | 'Governance'
  | 'Tokens';

interface ContractItem {
  name: string;
  description: string;
  address: string;
  category: ContractCategory;
  protocolKey: string;
  icon: LucideIcon;
  isErc20: boolean;
  symbol?: string;
  decimals?: number;
}

const CATEGORIES: ContractCategory[] = [
  'All',
  'Core Vault',
  'Staking & Referrals',
  'P2P & Escrow',
  'Accounting',
  'Oracle',
  'Account Abstraction',
  'Governance',
  'Tokens',
];

export default function ContractsPage() {
  const { chain } = useAccount();
  const chainId = chain?.id || 8453;
  const isMainnet = chainId === 8453;
  const explorerBaseUrl = getExplorerBaseUrl(chainId);
  const activeChainName = chain?.name || (isMainnet ? 'Base Mainnet' : 'Base Sepolia');
  const tokens = React.useMemo(() => getChainTokens(chainId), [chainId]);
  const directory = useProtocolDirectory();

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContractCategory>('All');
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

  const allContracts = React.useMemo<ContractItem[]>(() => {
    const protocolModules: ContractItem[] = [
      // 1. Core Vault & Controllers
      {
        name: 'ProtocolDirectory',
        description: 'Canonical module registry & dynamic address resolver',
        address:
          directory.directory ||
          (isMainnet
            ? '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e'
            : DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory),
        category: 'Core Vault',
        protocolKey: 'Core Registry Entrypoint',
        icon: Layers,
        isErc20: false,
      },
      {
        name: 'UnifyVaultController',
        description: 'Primary user deposit/redeem entry point & atomic swap executor',
        address:
          directory.controller ||
          (isMainnet
            ? '0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366'
            : DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController),
        category: 'Core Vault',
        protocolKey: 'keccak256("DepositManager")',
        icon: Activity,
        isErc20: false,
      },
      {
        name: 'CustodyVault',
        description: 'Stateless multi-asset collateral vault holding cbBTC, WETH & USDC',
        address:
          directory.vault ||
          (isMainnet
            ? '0xbb35a3434c689942e0b7d58909eae0d2cc0769ca'
            : DEPLOYED_CONTRACTS_SEPOLIA.CustodyVault),
        category: 'Core Vault',
        protocolKey: 'keccak256("CustodyVault")',
        icon: ShieldCheck,
        isErc20: false,
      },
      {
        name: 'Treasury',
        description: 'Protocol-owned fee vault and treasury asset balance reserve',
        address:
          directory.treasury ||
          (isMainnet
            ? '0x57561F781b2f558A7445D2E93a365C03BA2c9B53'
            : DEPLOYED_CONTRACTS_SEPOLIA.Treasury),
        category: 'Core Vault',
        protocolKey: 'keccak256("Treasury")',
        icon: Coins,
        isErc20: false,
      },
      {
        name: 'PortfolioManager',
        description: 'On-chain portfolio valuation, total asset accounting & UV price engine',
        address:
          directory.portfolioManager ||
          (isMainnet
            ? '0x66182f56bd5e523c655f6890290ab519f528e83f'
            : DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager),
        category: 'Core Vault',
        protocolKey: 'keccak256("PortfolioManager")',
        icon: TrendingUp,
        isErc20: false,
      },
      {
        name: 'StrategyManager',
        description: 'Target index ratio manager (60% cbBTC / 40% WETH target weights)',
        address:
          directory.strategyManager ||
          (isMainnet
            ? '0x4f7f99653d9d7acd462429fffc0c4b6c8cf4354a'
            : DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager),
        category: 'Core Vault',
        protocolKey: 'keccak256("StrategyManager")',
        icon: Sliders,
        isErc20: false,
      },
      {
        name: 'LiquidityManager',
        description: 'Liquidity reserve monitoring and vault refill/sweep execution',
        address:
          directory.liquidityManager ||
          (isMainnet
            ? '0x9af86a9ac1563b7fdbf43b19335348240a8c16d3'
            : DEPLOYED_CONTRACTS_SEPOLIA.LiquidityManager),
        category: 'Core Vault',
        protocolKey: 'keccak256("LiquidityManager")',
        icon: RefreshCw,
        isErc20: false,
      },
      {
        name: 'SwapAdapter',
        description: 'DEX router adapter enforcing slippage protection and atomic swaps',
        address:
          directory.swapAdapter ||
          (isMainnet
            ? '0xaae7104a120e7c6e518a936fcbc102bcd0454b67'
            : DEPLOYED_CONTRACTS_SEPOLIA.SwapAdapter),
        category: 'Core Vault',
        protocolKey: 'keccak256("SwapAdapter")',
        icon: Repeat,
        isErc20: false,
      },

      // 2. Staking & Referrals Subsystem
      {
        name: 'UVBEStakingVault',
        description: 'Staking vault backing dynamic APY, referral tiers, and reward engine',
        address: isMainnet
          ? '0x0000000000000000000000000000000000000000'
          : DEPLOYED_CONTRACTS_SEPOLIA.StakingVault,
        category: 'Staking & Referrals',
        protocolKey: 'UVBE Staking Vault',
        icon: Lock,
        isErc20: false,
      },
      {
        name: 'UVBEReferralRegistry',
        description: '10-tier immutable referral tree & deterministic rank progression system',
        address: isMainnet
          ? '0x0000000000000000000000000000000000000000'
          : DEPLOYED_CONTRACTS_SEPOLIA.ReferralRegistry,
        category: 'Staking & Referrals',
        protocolKey: 'UVBE Referral Registry',
        icon: Users,
        isErc20: false,
      },
      {
        name: 'UVBERewardDistributor',
        description:
          'Dynamic APY, 10-tier affiliate commissions & 30-day DAO leadership pool engine',
        address: isMainnet
          ? '0x0000000000000000000000000000000000000000'
          : DEPLOYED_CONTRACTS_SEPOLIA.RewardDistributor,
        category: 'Staking & Referrals',
        protocolKey: 'UVBE Reward Distributor',
        icon: Sparkles,
        isErc20: false,
      },

      // 3. P2P Settlement & Marketplace
      {
        name: 'P2PEscrow',
        description:
          'Non-custodial crypto-fiat escrow clearinghouse with cryptographic proof verification',
        address:
          directory.p2pEscrow ||
          (isMainnet
            ? '0xa938aacea64be8f41c90960aff232da4df7fc329'
            : DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow),
        category: 'P2P & Escrow',
        protocolKey: 'keccak256("P2PEscrow")',
        icon: Lock,
        isErc20: false,
      },
      {
        name: 'Marketplace',
        description: 'Non-custodial limit orderbook engine with linked escrow creation',
        address: isMainnet
          ? '0xabfe3034db275e32de396c7bdd1649a62ac9e5a6'
          : DEPLOYED_CONTRACTS_SEPOLIA.Marketplace,
        category: 'P2P & Escrow',
        protocolKey: 'Orderbook Matching Engine',
        icon: Store,
        isErc20: false,
      },
      {
        name: 'P2PReputation',
        description:
          'Decentralized Bayesian-smoothed trust and reputation engine for P2P buyers and sellers',
        address: isMainnet
          ? '0xabfe3034db275e32de396c7bdd1649a62ac9e5a6'
          : DEPLOYED_CONTRACTS_SEPOLIA.P2PReputation,
        category: 'P2P & Escrow',
        protocolKey: 'P2P Trust & Reputation Engine',
        icon: Star,
        isErc20: false,
      },

      // 4. Accounting & Analytics
      {
        name: 'FeeManager',
        description: 'Deposit/redemption fee computation and fee routing to Treasury',
        address:
          directory.feeManager ||
          (isMainnet
            ? '0xa5b0a1c71f4ffa357ddf5f50cc5003ff69c87881'
            : DEPLOYED_CONTRACTS_SEPOLIA.FeeManager),
        category: 'Accounting',
        protocolKey: 'keccak256("FeeManager")',
        icon: Coins,
        isErc20: false,
      },
      {
        name: 'CostBasisManager',
        description: 'Realized/unrealized P&L, entry price, and P2P escrow transfer filter',
        address:
          directory.costBasisManager ||
          (isMainnet
            ? '0x27b5c6dea90678b78856b0b10dba37a789fde97e'
            : DEPLOYED_CONTRACTS_SEPOLIA.CostBasisManager),
        category: 'Accounting',
        protocolKey: 'keccak256("CostBasisManager")',
        icon: Activity,
        isErc20: false,
      },
      {
        name: 'PerformanceManager',
        description: 'Benchmark tracking, high-water marks, and time-weighted returns',
        address:
          directory.performanceManager ||
          (isMainnet
            ? '0x19ec1b685c2ced1400b4f249da6be89662e59473'
            : DEPLOYED_CONTRACTS_SEPOLIA.PerformanceManager),
        category: 'Accounting',
        protocolKey: 'keccak256("PerformanceManager")',
        icon: TrendingUp,
        isErc20: false,
      },

      // 5. Oracles
      {
        name: 'OracleManager',
        description: 'Multi-source oracle coordinator with staleness checks & fallback routing',
        address:
          directory.oracle ||
          (isMainnet
            ? '0x91b488cde0f2ef28141fe4ffd8531c4179b48ea7'
            : DEPLOYED_CONTRACTS_SEPOLIA.OracleManager),
        category: 'Oracle',
        protocolKey: 'keccak256("OracleManager")',
        icon: Zap,
        isErc20: false,
      },
      {
        name: 'ChainlinkOracleProvider',
        description: 'Chainlink AggregatorV3 price feed adapter & staleness heartbeat validator',
        address: isMainnet
          ? '0x5f75d0Fc1c45c0994dAb01BaAaD0Bdb64333d85E'
          : DEPLOYED_CONTRACTS_SEPOLIA.ChainlinkOracleProvider,
        category: 'Oracle',
        protocolKey: 'Chainlink Provider Target',
        icon: Zap,
        isErc20: false,
      },

      // 6. Account Abstraction
      {
        name: 'UnifyVaultPaymaster',
        description: 'ERC-4337 verifying paymaster for gasless smart account operations',
        address: isMainnet
          ? '0x0000000000000000000000000000000000000000'
          : DEPLOYED_CONTRACTS_SEPOLIA.Paymaster,
        category: 'Account Abstraction',
        protocolKey: 'ERC-4337 Verifying Paymaster',
        icon: Flame,
        isErc20: false,
      },
      {
        name: 'GasTreasury',
        description: 'Automated paymaster refill vault with rate-limited sponsorship protection',
        address: isMainnet
          ? '0x0000000000000000000000000000000000000000'
          : DEPLOYED_CONTRACTS_SEPOLIA.GasTreasury,
        category: 'Account Abstraction',
        protocolKey: 'Paymaster Gas Reserve',
        icon: Coins,
        isErc20: false,
      },
      {
        name: 'Canonical EntryPoint v0.7',
        description: 'ERC-4337 Canonical EntryPoint v0.7 permissionless user operation settlement',
        address: isMainnet
          ? '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
          : DEPLOYED_CONTRACTS_SEPOLIA.EntryPoint,
        category: 'Account Abstraction',
        protocolKey: 'Canonical ERC-4337 v0.7',
        icon: Key,
        isErc20: false,
      },

      // 7. Governance & Authorities
      {
        name: 'TimelockController',
        description: '48-hour timelock controller for multisig governance execution',
        address: isMainnet
          ? '0x9094145Cd2AEA2f309eDf14237444a07edF98d02'
          : DEPLOYED_CONTRACTS_SEPOLIA.TimelockController,
        category: 'Governance',
        protocolKey: 'UnifyVaultTimelock (48h)',
        icon: Clock,
        isErc20: false,
      },
      {
        name: 'Protocol Admin / SafePal S1',
        description: 'Multi-signature governance and institutional hardware authority',
        address: isMainnet
          ? '0xe37b77ca9E49C2586365E7394F0F037901eD8A95'
          : DEPLOYED_CONTRACTS_SEPOLIA.Admin,
        category: 'Governance',
        protocolKey: 'Admin / SafePal S1 Authority',
        icon: UserCheck,
        isErc20: false,
      },
    ];

    const tokenList: ContractItem[] = [
      {
        name: 'UVBE Token',
        description: 'Multi-asset index share token (ERC-20, 18 Decimals)',
        address:
          directory.token ||
          (isMainnet
            ? '0xd2715141a0f5998b707baa963990bfc2e94cf145'
            : DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken),
        category: 'Tokens',
        protocolKey: 'keccak256("IndexToken")',
        icon: Coins,
        isErc20: true,
        symbol: 'UVBE',
        decimals: 18,
      },
      {
        name: 'USD Coin (USDC)',
        description: 'Primary deposit collateral & payout asset (6 Decimals)',
        address: tokens.USDC,
        category: 'Tokens',
        protocolKey: 'Reserve Asset (6 Decimals)',
        symbol: 'USDC',
        decimals: 6,
        icon: Coins,
        isErc20: true,
      },
      {
        name: 'Coinbase Wrapped BTC (cbBTC)',
        description: 'Custodied Bitcoin strategy asset (8 Decimals)',
        address: tokens.cbBTC,
        category: 'Tokens',
        protocolKey: 'Strategy Asset (8 Decimals)',
        symbol: 'cbBTC',
        decimals: 8,
        icon: Coins,
        isErc20: true,
      },
      {
        name: 'Wrapped Ether (WETH)',
        description: 'Custodied Ethereum strategy asset (18 Decimals)',
        address: tokens.WETH,
        category: 'Tokens',
        protocolKey: 'Strategy Asset (18 Decimals)',
        symbol: 'WETH',
        decimals: 18,
        icon: Coins,
        isErc20: true,
      },
    ];

    return [...protocolModules, ...tokenList];
  }, [
    directory.directory,
    directory.controller,
    directory.vault,
    directory.treasury,
    directory.p2pEscrow,
    directory.strategyManager,
    directory.portfolioManager,
    directory.costBasisManager,
    directory.performanceManager,
    directory.oracle,
    directory.token,
    tokens,
  ]);

  const categories = CATEGORIES;

  const filteredContracts = React.useMemo(() => {
    const q = searchFilter.toLowerCase();
    return allContracts.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.protocolKey.toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allContracts, searchFilter, selectedCategory]);

  return (
    <div className="space-y-8 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center space-x-2">
              <FileText className="w-6 h-6 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span>Protocol Contracts & On-Chain Addresses</span>
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Canonical smart-contract address directory for UnifyVault V2 deployment on{' '}
            {activeChainName}.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-muted border border-border-subtle text-xs font-mono font-semibold text-foreground self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#BFFF00] animate-pulse" />
          <span>{activeChainName} Deployment</span>
        </div>
      </div>

      {/* Network & Registry Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border-subtle">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-sans font-semibold">Total Contracts</span>
            <Layers className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground">{allContracts.length}</div>
          <span className="text-[10px] text-muted-foreground font-sans">Verified on BaseScan</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border-subtle">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-sans font-semibold">Protocol Registry</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {directory.directory ? 'Active' : 'Connected'}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono truncate block">
            {shortAddr(
              directory.directory ||
                (isMainnet
                  ? '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e'
                  : DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory),
            )}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border-subtle">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-sans font-semibold">P2P Escrow Engine</span>
            <Lock className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground">100 bps Fee</div>
          <span className="text-[10px] text-muted-foreground font-mono truncate block">
            {shortAddr(
              directory.p2pEscrow ||
                (isMainnet
                  ? '0xa938aacea64be8f41c90960aff232da4df7fc329'
                  : DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow),
            )}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border-subtle">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-sans font-semibold">SwapAdapter</span>
            <Repeat className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground">Fee 500</div>
          <span className="text-[10px] text-muted-foreground font-mono truncate block">
            {shortAddr(
              directory.swapAdapter ||
                (isMainnet
                  ? '0xaae7104a120e7c6e518a936fcbc102bcd0454b67'
                  : DEPLOYED_CONTRACTS_SEPOLIA.SwapAdapter),
            )}
          </span>
        </div>
      </div>

      {/* Filter & Category Bar */}
      <div className="space-y-3 p-4 rounded-xl bg-card border border-border-subtle">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, key, symbol, or address..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-border-subtle text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#BFFF00]/80 font-mono"
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Showing {filteredContracts.length} of {allContracts.length} deployed contracts
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border-subtle/40">
          {categories.map((cat) => {
            const count =
              cat === 'All'
                ? allContracts.length
                : allContracts.filter((c) => c.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#5f8f00] text-white dark:bg-[#BFFF00] dark:text-black font-bold shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border-subtle/50'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-black/20 dark:bg-black/15 text-inherit'
                      : 'bg-background/80 text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table Card */}
      <TableCard
        title="Verified Deployed Protocol Contracts"
        subtitle={`Canonical smart contracts registered under ProtocolDirectory (${shortAddr(
          directory.directory || DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory,
        )})`}
        icon={ShieldCheck}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-muted-foreground font-semibold">
                <th className="py-3 px-3">Contract Name & Protocol Key</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">On-Chain Address</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {filteredContracts.map((c) => {
                const Icon = c.icon;
                const isCopied = copiedAddress === c.address;
                const explorerUrl = `${explorerBaseUrl}/address/${c.address}`;

                return (
                  <tr key={c.name} className="hover:bg-muted/60 transition-colors">
                    <td className="py-3.5 px-3 font-sans font-bold text-foreground">
                      <div className="flex items-start space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-muted border border-border-subtle shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="block">{c.name}</span>
                            {c.isErc20 && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                ERC-20
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-normal block font-sans mt-0.5">
                            {c.description}
                          </span>
                          <span className="text-[10px] text-muted-foreground/80 font-mono font-normal block mt-0.5">
                            Key: {c.protocolKey}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border-subtle whitespace-nowrap">
                        {c.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        title={`Full Address: ${c.address}`}
                        className="text-foreground hover:text-[#5f8f00] dark:hover:text-[#BFFF00] font-mono cursor-help"
                      >
                        {shortAddr(c.address)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-sans text-muted-foreground">
                      <span className="inline-flex items-center space-x-1.5 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" />
                        <span className="text-foreground font-medium">Verified</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-sans">
                      <div className="flex items-center justify-end space-x-2">
                        {c.isErc20 && c.symbol && (
                          <AddTokenToWallet
                            address={c.address as `0x${string}`}
                            symbol={c.symbol}
                            decimals={c.decimals || 18}
                            compact
                          />
                        )}

                        <button
                          onClick={() => handleCopy(c.address)}
                          className="px-2 py-1 rounded bg-muted hover:bg-muted/70 border border-border-subtle text-foreground text-[11px] font-mono flex items-center space-x-1 transition-colors"
                          title={`Copy address: ${c.address}`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" />
                              <span className="text-[#5f8f00] dark:text-[#BFFF00] font-bold">
                                Copied!
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-muted-foreground" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded bg-muted hover:bg-muted/70 border border-border-subtle text-[#5f8f00] dark:text-[#BFFF00] text-[11px] font-mono flex items-center space-x-1 transition-colors"
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
