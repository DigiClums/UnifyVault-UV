'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { CUSTODY_VAULT_ABI, ORACLE_MANAGER_ABI } from '../../../lib/contracts';
import { getChainTokens, getExplorerBaseUrl, getDefaultChainId } from '../../../constants';
import { useProtocolDirectory } from '../../../hooks/useProtocolDirectory';
import { formatUSD } from '../../../lib/math';
import { getTransactionNonce } from '../../../lib/utils/getTransactionNonce';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TableCard } from '../../../components/ui/TableCard';
import { prefetchBlockTimestamps } from '../../../lib/utils/blockTimestamp';
import {
  Vault,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  History,
  RefreshCw,
  ExternalLink,
  Layers,
  Wallet,
} from 'lucide-react';

export interface CustodyEventLog {
  id: string;
  blockNumber: bigint;
  timestamp?: number;
  type: 'WithdrawalExecuted' | 'DepositExecuted';
  asset: string;
  recipientOrFrom: string;
  amountFormatted: string;
  caller: string;
  transactionHash: string;
  logIndex: number;
}

export default function AdminCustodyPage() {
  const { address: connectedAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const tokens = useMemo(() => getChainTokens(chain?.id), [chain?.id]);
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { vault, oracle } = useProtocolDirectory();

  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [assetAddress, setAssetAddress] = useState<string>('');

  useEffect(() => {
    if (tokens.USDC && !assetAddress) {
      setAssetAddress(tokens.USDC);
    }
  }, [tokens.USDC, assetAddress]);

  const [custodyLogs, setCustodyLogs] = useState<CustodyEventLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState<boolean>(true);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const fetchCustodyLogs = useCallback(async () => {
    if (!vault || !publicClient) return;
    setIsRefreshingLogs(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock >= 1999n ? latestBlock - 1999n : 0n;

      const logs = await publicClient.getContractEvents({
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        fromBlock,
        toBlock: latestBlock,
      });

      // Phase E3: Prefetch unique block timestamps in a single batched deduplicated request
      const blockNumbers = logs.map((l) => l.blockNumber);
      const timestampMap = await prefetchBlockTimestamps(publicClient, chainId, blockNumbers);

      const valid: CustodyEventLog[] = [];

      for (const log of logs) {
        if (!log.blockNumber || !log.transactionHash) continue;
        const ts = timestampMap.get(log.blockNumber);
        const logIndex = log.logIndex ?? 0;
        const id = `${log.transactionHash}-${logIndex}`;

        const eventLog = log as unknown as {
          eventName: CustodyEventLog['type'];
          args: Record<string, unknown>;
        };

        const eventName = eventLog.eventName;
        const args = eventLog.args || {};

        let assetSymbol = 'USDC';
        let amountFormatted = '0.00';
        let recOrFrom: string = '0x0000000000000000000000000000000000000000';
        const caller: string =
          (args.caller as string) || '0x0000000000000000000000000000000000000000';

        const assetAddr = (args.asset as string)?.toLowerCase() || '';

        if (assetAddr === tokens.cbBTC.toLowerCase()) {
          assetSymbol = 'cbBTC';
        } else if (assetAddr === tokens.WETH.toLowerCase()) {
          assetSymbol = 'WETH';
        } else {
          assetSymbol = 'USDC';
        }

        const decimals = assetSymbol === 'cbBTC' ? 8 : assetSymbol === 'WETH' ? 18 : 6;

        if (eventName === 'WithdrawalExecuted') {
          recOrFrom = (args.to as string) || recOrFrom;
          amountFormatted = args.amount
            ? `${Number(formatUnits(args.amount as bigint, decimals)).toFixed(4)} ${assetSymbol}`
            : `0.00 ${assetSymbol}`;
        } else if (eventName === 'DepositExecuted') {
          recOrFrom = (args.from as string) || recOrFrom;
          amountFormatted = args.amount
            ? `${Number(formatUnits(args.amount as bigint, decimals)).toFixed(4)} ${assetSymbol}`
            : `0.00 ${assetSymbol}`;
        } else {
          continue;
        }

        valid.push({
          id,
          blockNumber: log.blockNumber,
          timestamp: ts,
          type: eventName,
          asset: assetSymbol,
          recipientOrFrom: recOrFrom,
          amountFormatted,
          caller,
          transactionHash: log.transactionHash,
          logIndex,
        });
      }

      valid.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return b.blockNumber > a.blockNumber ? 1 : -1;
        }
        return b.logIndex - a.logIndex;
      });

      setCustodyLogs(valid);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Custody log fetch error:', err);
    } finally {
      setIsLogsLoading(false);
      setIsRefreshingLogs(false);
    }
  }, [vault, publicClient, tokens, chainId]);

  useEffect(() => {
    if (!vault || !publicClient) return;
    fetchCustodyLogs();

    const unwatch = publicClient.watchContractEvent({
      address: vault,
      abi: CUSTODY_VAULT_ABI,
      onLogs: () => {
        fetchCustodyLogs();
      },
    });

    return () => {
      unwatch();
    };
  }, [vault, publicClient, fetchCustodyLogs]);

  // Read CustodyVault collateral balances & Oracle asset prices
  const { data: vaultData } = useReadContracts({
    contracts: [
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.USDC],
      },
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.cbBTC],
      },
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.WETH],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.cbBTC],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.WETH],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.USDC],
      },
    ],
    query: {
      enabled: !!vault && !!oracle,
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const usdcBalRaw = (vaultData?.[0]?.result as bigint) || 0n;
  const wbtcBalRaw = (vaultData?.[1]?.result as bigint) || 0n;
  const wethBalRaw = (vaultData?.[2]?.result as bigint) || 0n;
  const btcPriceRaw = (vaultData?.[3]?.result as bigint) || 0n;
  const ethPriceRaw = (vaultData?.[4]?.result as bigint) || 0n;
  const usdcPriceRaw = (vaultData?.[5]?.result as bigint) || 0n;

  const btcPrice = Number(formatUnits(btcPriceRaw, 18));
  const ethPrice = Number(formatUnits(ethPriceRaw, 18));
  const usdcPrice = Number(formatUnits(usdcPriceRaw, 18));

  const usdcUSD = Number(formatUnits(usdcBalRaw, 6)) * usdcPrice;
  const wbtcUSD = Number(formatUnits(wbtcBalRaw, 8)) * btcPrice;
  const wethUSD = Number(formatUnits(wethBalRaw, 18)) * ethPrice;
  const totalCustodyValUSD = usdcUSD + wbtcUSD + wethUSD;

  const selectedAssetDecimals = useMemo(() => {
    if (assetAddress.toLowerCase() === tokens.cbBTC.toLowerCase()) return 8;
    if (assetAddress.toLowerCase() === tokens.WETH.toLowerCase()) return 18;
    return 6;
  }, [assetAddress, tokens]);

  const selectedAssetBalanceRaw = useMemo(() => {
    if (assetAddress.toLowerCase() === tokens.cbBTC.toLowerCase()) return wbtcBalRaw;
    if (assetAddress.toLowerCase() === tokens.WETH.toLowerCase()) return wethBalRaw;
    return usdcBalRaw;
  }, [assetAddress, tokens, wbtcBalRaw, wethBalRaw, usdcBalRaw]);

  const selectedAssetSymbol = useMemo(() => {
    if (assetAddress.toLowerCase() === tokens.cbBTC.toLowerCase()) return 'cbBTC';
    if (assetAddress.toLowerCase() === tokens.WETH.toLowerCase()) return 'WETH';
    return 'USDC';
  }, [assetAddress, tokens]);

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !recipient ||
      !amount ||
      parseFloat(amount) <= 0 ||
      !vault ||
      !connectedAddress ||
      !publicClient
    )
      return;

    const amountRaw = parseUnits(amount, selectedAssetDecimals);
    const nonce = await getTransactionNonce(publicClient, connectedAddress);

    writeContract({
      address: vault,
      abi: CUSTODY_VAULT_ABI,
      functionName: 'withdraw',
      args: [assetAddress as `0x${string}`, recipient as `0x${string}`, amountRaw],
      nonce,
    });
  };

  const handleSetMaxAmount = () => {
    const formatted = formatUnits(selectedAssetBalanceRaw, selectedAssetDecimals);
    setAmount(formatted);
  };

  const handleUseMyWallet = () => {
    if (connectedAddress) {
      setRecipient(connectedAddress);
    }
  };

  const getFriendlyErrorMessage = (err: unknown): string => {
    if (!err) return '';
    console.error('[Developer Logs - CustodyVault Error]:', err);
    return 'CustodyVault withdrawal failed. Ensure connected account holds authorized Admin/Governance Role and contract reserves are sufficient.';
  };

  const vaultShort = vault ? `${vault.slice(0, 6)}...${vault.slice(-4)}` : 'Connecting...';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              CustodyVault Admin Wallet Release
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Directly release custodied vault reserve assets into authorized admin/governance wallet
            addresses on-chain.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {lastSyncTime && (
            <span className="text-[11px] text-slate-400 font-mono">
              Synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchCustodyLogs}
            disabled={isRefreshingLogs || !vault}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin text-purple-400' : ''}`}
            />
            <span>{isRefreshingLogs ? 'Syncing...' : 'Sync Log'}</span>
          </button>
        </div>
      </div>

      {/* Total Custody Value Summary Card */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-2">
        <span className="text-xs font-semibold text-purple-400 tracking-wider uppercase">
          Total CustodyVault Portfolio Value
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
          {formatUSD(totalCustodyValUSD)}
        </div>
        <p className="text-xs text-slate-400">
          Aggregated collateral asset reserves held inside CustodyVault ({vaultShort}) on Base
          Mainnet.
        </p>
      </div>

      {/* Custody Asset Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="USDC Collateral Balance"
          value={formatUSD(usdcUSD)}
          subtitle={`${formatUnits(usdcBalRaw, 6)} USDC`}
          icon={Vault}
          glowColor="blue"
        />
        <StatCard
          title="cbBTC Collateral Balance"
          value={`${formatUnits(wbtcBalRaw, 8)} BTC`}
          subtitle={`≈ ${formatUSD(wbtcUSD)}`}
          icon={DollarSign}
          glowColor="emerald"
        />
        <StatCard
          title="WETH Collateral Balance"
          value={`${formatUnits(wethBalRaw, 18)} ETH`}
          subtitle={`≈ ${formatUSD(wethUSD)}`}
          icon={ShieldCheck}
          glowColor="purple"
        />
      </div>

      {/* Custody Withdrawal Form & Security Safeguards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Custody Withdrawal Form */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-border-subtle/40 pb-3">
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Withdraw Custody Funds to Wallet
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              STATE-MUTATING ACTION
            </span>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-slate-400 font-semibold">Select Asset</label>
                <span className="text-[11px] font-mono text-slate-400">
                  Available: {formatUnits(selectedAssetBalanceRaw, selectedAssetDecimals)}{' '}
                  {selectedAssetSymbol}
                </span>
              </div>
              <select
                value={assetAddress}
                onChange={(e) => setAssetAddress(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
              >
                <option value={tokens.USDC}>USDC (USD Coin - 6 Decimals)</option>
                <option value={tokens.cbBTC}>cbBTC (Coinbase Wrapped BTC - 8 Decimals)</option>
                <option value={tokens.WETH}>WETH (Wrapped ETH - 18 Decimals)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-slate-400 font-semibold">
                  Recipient Wallet Address
                </label>
                {connectedAddress && (
                  <button
                    type="button"
                    onClick={handleUseMyWallet}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center space-x-1"
                  >
                    <Wallet className="w-3 h-3" />
                    <span>Use Connected Wallet</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-slate-400 font-semibold">Withdraw Amount</label>
                <button
                  type="button"
                  onClick={handleSetMaxAmount}
                  className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider"
                >
                  [ MAX ]
                </button>
              </div>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isWritePending || isTxWaiting || !vault}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all focus:ring-2 focus:ring-purple-500/50"
            >
              {(isWritePending || isTxWaiting) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isWritePending
                  ? 'Confirming in Wallet...'
                  : isTxWaiting
                    ? 'Broadcasting Tx...'
                    : 'Withdraw Custody Funds'}
              </span>
            </button>
          </form>

          {isTxSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>CustodyVault funds successfully withdrawn to wallet on Base Mainnet!</span>
            </div>
          )}

          {writeError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{getFriendlyErrorMessage(writeError)}</span>
            </div>
          )}
        </div>

        {/* CustodyVault Security Safeguards */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-5">
          <div className="flex items-center space-x-2 text-white font-bold text-base border-b border-border-subtle/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-accent-blue" />
            <span>CustodyVault Architecture & Governance</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">CustodyVault Contract</span>
              </div>
              <span className="font-mono text-accent-blue font-bold">{vaultShort}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Authorized Roles</span>
              </div>
              <span className="font-mono text-purple-400 font-bold">Admin & Governance</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">SafeERC20 Protection</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">Active (Non-custodial)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Network Environment</span>
              </div>
              <span className="font-mono text-slate-300 font-bold">Base Mainnet L2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custody Releases & Activity Log Table */}
      <TableCard
        title="CustodyVault On-Chain Activity Log"
        subtitle="Auditable log of collateral withdrawals and deposits executed on CustodyVault"
        icon={History}
      >
        {isLogsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm font-medium">Syncing live CustodyVault release log...</p>
          </div>
        ) : custodyLogs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Layers className="w-10 h-10 text-slate-500" />
            <h3 className="text-base font-bold text-white">No custody releases logged yet</h3>
            <p className="text-xs text-slate-400 max-w-sm text-center">
              On-chain custody withdrawals and deposit executions will be listed here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Block</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Recipient / From</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {custodyLogs.map((log) => {
                  const dateStr = log.timestamp
                    ? new Date(log.timestamp * 1000).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Timestamp unavailable';

                  const isWithdrawal = log.type === 'WithdrawalExecuted';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Block Number */}
                      <td className="py-3 px-4 text-slate-300">
                        #{log.blockNumber.toString()}
                        <div className="text-[10px] text-slate-500 font-sans">{dateStr}</div>
                      </td>

                      {/* Event Type Badge */}
                      <td className="py-3 px-4 font-sans">
                        {isWithdrawal ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Custody Release</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <DollarSign className="w-3 h-3" />
                            <span>Vault Deposit</span>
                          </span>
                        )}
                      </td>

                      {/* Asset */}
                      <td className="py-3 px-4 font-bold text-white">{log.asset}</td>

                      {/* Recipient */}
                      <td className="py-3 px-4 text-slate-300">
                        {log.recipientOrFrom !== '0x0000000000000000000000000000000000000000' ? (
                          <a
                            href={`${explorerBaseUrl}/address/${log.recipientOrFrom}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-purple-400 transition-colors"
                            title={log.recipientOrFrom}
                          >
                            {log.recipientOrFrom.slice(0, 6)}...{log.recipientOrFrom.slice(-4)}
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-100">
                        {log.amountFormatted}
                      </td>

                      {/* Explorer Link */}
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`${explorerBaseUrl}/tx/${log.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors hover:underline"
                          title="View on BaseScan"
                        >
                          <span>
                            {log.transactionHash.slice(0, 6)}...{log.transactionHash.slice(-4)}
                          </span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
