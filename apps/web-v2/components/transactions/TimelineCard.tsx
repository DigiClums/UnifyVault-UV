'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Settings,
  ExternalLink,
  ChevronDown,
  Clock,
  Layers,
  Activity,
  FileText,
  Box,
  ArrowRightLeft,
  Shield,
  Coins,
} from 'lucide-react';
import type { TransactionGroup, DecodedTimelineEvent } from '../../hooks/useTransactionExplorer';
import { formatUnits } from 'viem';
import { getTokenSymbol, getTokenDecimals, formatAmount } from '../../lib/explorer';

// ─── Helpers ────────────────────────────────────────────────────────────────

function short(addr?: string): string {
  if (!addr || addr.length < 10) return addr ?? '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatGasPrice(gasPriceWei: bigint): string {
  const gwei = Number(gasPriceWei) / 1e9;
  if (gwei < 0.001) return '<0.001 Gwei';
  if (gwei < 1) return `${gwei.toFixed(3)} Gwei`;
  return `${gwei.toFixed(1)} Gwei`;
}

function formatETH(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return '0';
  if (eth < 0.000001) return eth.toExponential(3);
  return eth.toFixed(9);
}

// ─── Action Badge ───────────────────────────────────────────────────────────

function ActionBadge({ type }: { type: string }) {
  switch (type) {
    case 'deposit':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ArrowUpRight className="w-3 h-3" /> Deposit
        </span>
      );
    case 'redeem':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <ArrowDownLeft className="w-3 h-3" /> Redeem
        </span>
      );
    case 'fee':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <DollarSign className="w-3 h-3" /> Fee
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Settings className="w-3 h-3" /> Admin
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <Activity className="w-3 h-3" /> Unknown
        </span>
      );
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 className="w-2.5 h-2.5" /> Success
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400">
      <AlertTriangle className="w-2.5 h-2.5" /> Failed
    </span>
  );
}

// ─── Contract Icon ──────────────────────────────────────────────────────────

function getContractIcon(contractName: string) {
  switch (contractName) {
    case 'UnifyVaultController':
      return <Activity className="w-4 h-4 text-accent-blue" />;
    case 'CustodyVault':
      return <Shield className="w-4 h-4 text-accent-emerald" />;
    case 'Treasury':
      return <Coins className="w-4 h-4 text-accent-amber" />;
    case 'UVBTCETHToken':
      return <Box className="w-4 h-4 text-accent-violet" />;
    case 'StrategyManager':
      return <Layers className="w-4 h-4 text-accent-cyan" />;
    default:
      return <FileText className="w-4 h-4 text-slate-400" />;
  }
}

function getContractColor(contractName: string): string {
  switch (contractName) {
    case 'UnifyVaultController':
      return 'border-l-accent-blue';
    case 'CustodyVault':
      return 'border-l-accent-emerald';
    case 'Treasury':
      return 'border-l-accent-amber';
    case 'UVBTCETHToken':
      return 'border-l-accent-violet';
    case 'StrategyManager':
      return 'border-l-accent-cyan';
    default:
      return 'border-l-slate-500';
  }
}

// ─── Timeline Step ──────────────────────────────────────────────────────────

function TimelineStep({
  event,
  explorerUrl,
}: {
  event: DecodedTimelineEvent;
  explorerUrl?: string;
}) {
  const { contractName, displayName, args } = event;
  const borderColor = getContractColor(contractName);

  // Render arg details based on event type
  const details = renderEventDetails(contractName, event.eventName, args);

  return (
    <div className={`flex gap-3 pl-4 border-l-2 ${borderColor} py-2`}>
      <div className="flex-shrink-0 mt-0.5">{getContractIcon(contractName)}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{displayName}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            {contractName}
          </span>
        </div>
        <div className="text-xs text-slate-400 space-y-0.5">{details}</div>
      </div>
    </div>
  );
}

function renderEventDetails(
  contractName: string,
  eventName: string,
  args: Record<string, unknown>,
): React.ReactNode[] {
  const rows: React.ReactNode[] = [];

  // ERC20 Transfer (all tokens including UVBTCETHToken, USDC, cbBTC, WETH)
  if (
    eventName === 'Transfer' &&
    (contractName === 'UVBTCETHToken' ||
      contractName === 'USDC' ||
      contractName === 'cbBTC' ||
      contractName === 'WETH' ||
      args.from !== undefined)
  ) {
    const from = args.from as string;
    const to = args.to as string;
    const value = args.value as bigint | undefined;
    if (from && to) {
      const isMint = from === '0x0000000000000000000000000000000000000000';
      const isBurn = to === '0x0000000000000000000000000000000000000000';
      const label = isMint ? 'Mint to' : isBurn ? 'Burn from' : 'Transfer';
      rows.push(
        <span key="dir" className="text-slate-500">
          {label}:{' '}
          <span className="text-slate-300 font-mono">
            {isMint ? short(to) : isBurn ? short(from) : `${short(from)} → ${short(to)}`}
          </span>
        </span>,
      );
      if (value !== undefined) {
        const decimals = getTokenDecimals(contractName);
        const symbol = contractName === 'UVBTCETHToken' ? 'Shares' : contractName;
        rows.push(
          <span key="val" className="text-slate-500">
            Amount:{' '}
            <span className="text-white font-mono">
              {formatAmount(value, decimals)} {symbol}
            </span>
          </span>,
        );
      }
    }
    return rows;
  }

  // Controller DepositExecuted
  if (contractName === 'UnifyVaultController' && eventName === 'DepositExecuted') {
    const user = args.user as string;
    const depositAmount = args.depositAmount as bigint | undefined;
    const fee = args.fee as bigint | undefined;
    const sharesMinted = args.sharesMinted as bigint | undefined;
    const targetAssets = args.targetAssets as string[] | undefined;
    const assetsBought = args.assetsBought as bigint[] | undefined;

    if (user)
      rows.push(
        <span key="u" className="text-slate-500">
          User: <span className="text-slate-300 font-mono">{short(user)}</span>
        </span>,
      );
    if (depositAmount !== undefined)
      rows.push(
        <span key="da" className="text-slate-500">
          Deposit:{' '}
          <span className="text-white font-mono">{formatAmount(depositAmount, 6)} USDC</span>
        </span>,
      );
    if (fee !== undefined && fee > 0n)
      rows.push(
        <span key="f" className="text-slate-500">
          Fee: <span className="text-amber-400 font-mono">{formatAmount(fee, 6)} USDC</span>
        </span>,
      );
    if (sharesMinted !== undefined)
      rows.push(
        <span key="sm" className="text-slate-500">
          Shares Minted:{' '}
          <span className="text-white font-mono">{formatAmount(sharesMinted, 18)}</span>
        </span>,
      );

    if (targetAssets && assetsBought && targetAssets.length === assetsBought.length) {
      const swapInfo = targetAssets
        .map(
          (asset, i) =>
            `${formatAmount(assetsBought[i], getTokenDecimals(asset))} ${getTokenSymbol(asset)}`,
        )
        .join(', ');
      rows.push(
        <span key="sw" className="text-slate-500">
          Swapped to: <span className="text-white font-mono">{swapInfo}</span>
        </span>,
      );
    }
    return rows;
  }

  // Controller RedeemExecuted
  if (contractName === 'UnifyVaultController' && eventName === 'RedeemExecuted') {
    const user = args.user as string;
    const sharesBurned = args.sharesBurned as bigint | undefined;
    const fee = args.fee as bigint | undefined;
    const usdcReturned = args.usdcReturned as bigint | undefined;
    const targetAssets = args.targetAssets as string[] | undefined;
    const assetsSold = args.assetsSold as bigint[] | undefined;

    if (user)
      rows.push(
        <span key="u" className="text-slate-500">
          User: <span className="text-slate-300 font-mono">{short(user)}</span>
        </span>,
      );
    if (sharesBurned !== undefined)
      rows.push(
        <span key="sb" className="text-slate-500">
          Shares Burned:{' '}
          <span className="text-white font-mono">{formatAmount(sharesBurned, 18)}</span>
        </span>,
      );
    if (usdcReturned !== undefined)
      rows.push(
        <span key="ur" className="text-slate-500">
          USDC Returned:{' '}
          <span className="text-white font-mono">{formatAmount(usdcReturned, 6)} USDC</span>
        </span>,
      );
    if (fee !== undefined && fee > 0n)
      rows.push(
        <span key="f" className="text-slate-500">
          Fee: <span className="text-amber-400 font-mono">{formatAmount(fee, 6)} USDC</span>
        </span>,
      );

    if (targetAssets && assetsSold && targetAssets.length === assetsSold.length) {
      const swapInfo = targetAssets
        .map(
          (asset, i) =>
            `${formatAmount(assetsSold[i], getTokenDecimals(asset))} ${getTokenSymbol(asset)}`,
        )
        .join(', ');
      rows.push(
        <span key="sw" className="text-slate-500">
          Swapped from: <span className="text-white font-mono">{swapInfo}</span>
        </span>,
      );
    }
    return rows;
  }

  // Controller DepositCompleted
  if (contractName === 'UnifyVaultController' && eventName === 'DepositCompleted') {
    const receiver = args.receiver as string;
    const asset = args.asset as string;
    const grossDeposit = args.grossDeposit as bigint | undefined;
    const netDeposit = args.netDeposit as bigint | undefined;
    const sharesMinted = args.sharesMinted as bigint | undefined;

    if (receiver)
      rows.push(
        <span key="r" className="text-slate-500">
          Receiver: <span className="text-slate-300 font-mono">{short(receiver)}</span>
        </span>,
      );
    if (asset)
      rows.push(
        <span key="a" className="text-slate-500">
          Asset: <span className="text-slate-300 font-mono">{getTokenSymbol(asset)}</span>
        </span>,
      );
    if (grossDeposit !== undefined)
      rows.push(
        <span key="gd" className="text-slate-500">
          Gross: <span className="text-white font-mono">{formatAmount(grossDeposit, 6)} USDC</span>
        </span>,
      );
    if (netDeposit !== undefined)
      rows.push(
        <span key="nd" className="text-slate-500">
          Net: <span className="text-white font-mono">{formatAmount(netDeposit, 6)} USDC</span>
        </span>,
      );
    if (sharesMinted !== undefined)
      rows.push(
        <span key="sm" className="text-slate-500">
          Shares Minted:{' '}
          <span className="text-white font-mono">{formatAmount(sharesMinted, 18)}</span>
        </span>,
      );
    return rows;
  }

  // Controller RedeemCompleted
  if (contractName === 'UnifyVaultController' && eventName === 'RedeemCompleted') {
    const owner = args.owner as string;
    const receiver = args.receiver as string;
    const asset = args.asset as string;
    const sharesBurned = args.sharesBurned as bigint | undefined;
    const netAssets = args.netAssets as bigint | undefined;
    const protocolFee = args.protocolFee as bigint | undefined;

    if (owner)
      rows.push(
        <span key="o" className="text-slate-500">
          Owner: <span className="text-slate-300 font-mono">{short(owner)}</span>
        </span>,
      );
    if (receiver)
      rows.push(
        <span key="r" className="text-slate-500">
          Receiver: <span className="text-slate-300 font-mono">{short(receiver)}</span>
        </span>,
      );
    if (asset)
      rows.push(
        <span key="a" className="text-slate-500">
          Asset: <span className="text-slate-300 font-mono">{getTokenSymbol(asset)}</span>
        </span>,
      );
    if (sharesBurned !== undefined)
      rows.push(
        <span key="sb" className="text-slate-500">
          Shares Burned:{' '}
          <span className="text-white font-mono">{formatAmount(sharesBurned, 18)}</span>
        </span>,
      );
    if (netAssets !== undefined)
      rows.push(
        <span key="na" className="text-slate-500">
          Net: <span className="text-white font-mono">{formatAmount(netAssets, 6)} USDC</span>
        </span>,
      );
    if (protocolFee !== undefined && protocolFee > 0n)
      rows.push(
        <span key="pf" className="text-slate-500">
          Fee: <span className="text-amber-400 font-mono">{formatAmount(protocolFee, 6)} USDC</span>
        </span>,
      );
    return rows;
  }

  // CustodyVault events
  if (
    contractName === 'CustodyVault' &&
    (eventName === 'DepositExecuted' || eventName === 'WithdrawalExecuted')
  ) {
    const asset = args.asset as string;
    const counterparty = (args.from ?? args.to) as string;
    const amount = args.amount as bigint | undefined;
    const caller = args.caller as string;

    if (asset)
      rows.push(
        <span key="a" className="text-slate-500">
          Asset: <span className="text-slate-300 font-mono">{getTokenSymbol(asset)}</span>
        </span>,
      );
    if (counterparty)
      rows.push(
        <span key="cp" className="text-slate-500">
          {eventName === 'DepositExecuted' ? 'From' : 'To'}:{' '}
          <span className="text-slate-300 font-mono">{short(counterparty)}</span>
        </span>,
      );
    if (amount !== undefined)
      rows.push(
        <span key="amt" className="text-slate-500">
          Amount:{' '}
          <span className="text-white font-mono">
            {formatAmount(amount, getTokenDecimals(asset))} {getTokenSymbol(asset ?? '')}
          </span>
        </span>,
      );
    if (caller)
      rows.push(
        <span key="c" className="text-slate-500">
          Caller: <span className="text-slate-300 font-mono">{short(caller)}</span>
        </span>,
      );
    return rows;
  }

  // Treasury events
  if (contractName === 'Treasury') {
    const asset = args.asset as string;
    const from = args.from as string;
    const recipient = args.recipient as string;
    const amount = args.amount as bigint | undefined;
    const caller = args.caller as string;

    if (eventName === 'TreasuryWithdrawal') {
      if (asset)
        rows.push(
          <span key="a" className="text-slate-500">
            Asset: <span className="text-slate-300 font-mono">{getTokenSymbol(asset)}</span>
          </span>,
        );
      if (recipient)
        rows.push(
          <span key="r" className="text-slate-500">
            Recipient: <span className="text-slate-300 font-mono">{short(recipient)}</span>
          </span>,
        );
      if (caller)
        rows.push(
          <span key="c" className="text-slate-500">
            Caller: <span className="text-slate-300 font-mono">{short(caller)}</span>
          </span>,
        );
      if (amount !== undefined)
        rows.push(
          <span key="amt" className="text-slate-500">
            Amount: <span className="text-white font-mono">{formatAmount(amount, 6)} USDC</span>
          </span>,
        );
      return rows;
    }

    if (eventName === 'NativeWithdrawn') {
      if (recipient)
        rows.push(
          <span key="r" className="text-slate-500">
            Recipient: <span className="text-slate-300 font-mono">{short(recipient)}</span>
          </span>,
        );
      if (caller)
        rows.push(
          <span key="c" className="text-slate-500">
            Caller: <span className="text-slate-300 font-mono">{short(caller)}</span>
          </span>,
        );
      if (amount !== undefined)
        rows.push(
          <span key="amt" className="text-slate-500">
            Amount: <span className="text-white font-mono">{formatAmount(amount, 18)} ETH</span>
          </span>,
        );
      return rows;
    }

    // FeeCollected (default)
    if (asset)
      rows.push(
        <span key="a" className="text-slate-500">
          Asset: <span className="text-slate-300 font-mono">{getTokenSymbol(asset)}</span>
        </span>,
      );
    if (from)
      rows.push(
        <span key="f" className="text-slate-500">
          From: <span className="text-slate-300 font-mono">{short(from)}</span>
        </span>,
      );
    if (amount !== undefined)
      rows.push(
        <span key="amt" className="text-slate-500">
          Amount: <span className="text-white font-mono">{formatAmount(amount, 6)} USDC</span>
        </span>,
      );
    if (rows.length === 0) {
      rows.push(
        <span key="raw" className="text-slate-500 font-mono text-[10px]">
          {JSON.stringify(args)}
        </span>,
      );
    }
    return rows;
  }

  // Controller ProtocolFeeCollected
  if (contractName === 'UnifyVaultController' && eventName === 'ProtocolFeeCollected') {
    const payer = args.payer as string;
    const asset = args.asset as string;
    const feeAmount = args.feeAmount as bigint | undefined;

    if (payer)
      rows.push(
        <span key="p" className="text-slate-500">
          Payer: <span className="text-slate-300 font-mono">{short(payer)}</span>
        </span>,
      );
    if (asset)
      rows.push(
        <span key="a" className="text-slate-500">
          Asset: <span className="text-slate-300 font-mono">{getTokenSymbol(asset)}</span>
        </span>,
      );
    if (feeAmount !== undefined)
      rows.push(
        <span key="fa" className="text-slate-500">
          Amount: <span className="text-white font-mono">{formatAmount(feeAmount, 6)} USDC</span>
        </span>,
      );
    return rows;
  }

  // Pause / Resume
  if (
    contractName === 'UnifyVaultController' &&
    (eventName === 'EmergencyPaused' || eventName === 'EmergencyResumed')
  ) {
    const caller = args.caller as string;
    if (caller)
      rows.push(
        <span key="c" className="text-slate-500">
          Caller: <span className="text-slate-300 font-mono">{short(caller)}</span>
        </span>,
      );
    return rows;
  }

  // StrategyManager
  if (contractName === 'StrategyManager' && eventName === 'StrategyRebalanced') {
    const assets = args.assets as string[] | undefined;
    const newWeights = args.newWeights as bigint[] | undefined;
    if (assets && newWeights && assets.length === newWeights.length) {
      const info = assets
        .map((a, i) => `${getTokenSymbol(a)}: ${Number(newWeights[i]) / 100}%`)
        .join(', ');
      rows.push(
        <span key="w" className="text-slate-500">
          Weights: <span className="text-white font-mono">{info}</span>
        </span>,
      );
    }
    return rows;
  }

  // Generic fallback: show all non-indexed args
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'bigint') {
      rows.push(
        <span key={key} className="text-slate-500">
          {key}: <span className="text-white font-mono">{value.toString()}</span>
        </span>,
      );
    } else if (
      typeof value === 'string' &&
      (value as string).startsWith('0x') &&
      (value as string).length === 42
    ) {
      rows.push(
        <span key={key} className="text-slate-500">
          {key}: <span className="text-slate-300 font-mono">{short(value)}</span>
        </span>,
      );
    } else if (Array.isArray(value)) {
      rows.push(
        <span key={key} className="text-slate-500">
          {key}: <span className="text-slate-300 font-mono">[{value.length} items]</span>
        </span>,
      );
    } else {
      rows.push(
        <span key={key} className="text-slate-500">
          {key}: <span className="text-slate-300">{String(value)}</span>
        </span>,
      );
    }
  }

  return rows;
}

// ─── Timeline Card ──────────────────────────────────────────────────────────

interface TimelineCardProps {
  tx: TransactionGroup;
  explorerUrl: string;
}

function HumanReadableExecutionSummary({ tx }: { tx: TransactionGroup }) {
  const depExecutedEvent = tx.events.find(
    (e) => e.contractName === 'UnifyVaultController' && e.eventName === 'DepositExecuted',
  );
  const depCompletedEvent = tx.events.find(
    (e) => e.contractName === 'UnifyVaultController' && e.eventName === 'DepositCompleted',
  );

  const redExecutedEvent = tx.events.find(
    (e) => e.contractName === 'UnifyVaultController' && e.eventName === 'RedeemExecuted',
  );
  const redCompletedEvent = tx.events.find(
    (e) => e.contractName === 'UnifyVaultController' && e.eventName === 'RedeemCompleted',
  );

  const feeCollectedEvent = tx.events.find(
    (e) => e.contractName === 'UnifyVaultController' && e.eventName === 'ProtocolFeeCollected',
  );

  if (tx.actionType === 'deposit' && (depExecutedEvent || depCompletedEvent)) {
    const grossDeposit =
      (depCompletedEvent?.args.grossDeposit as bigint | undefined) ??
      (depExecutedEvent?.args.depositAmount as bigint | undefined);

    const fee =
      (depCompletedEvent?.args.protocolFee as bigint | undefined) ??
      (depExecutedEvent?.args.fee as bigint | undefined) ??
      (feeCollectedEvent?.args.feeAmount as bigint | undefined);

    const netDeposit =
      (depCompletedEvent?.args.netDeposit as bigint | undefined) ??
      (grossDeposit !== undefined && fee !== undefined ? grossDeposit - fee : undefined);

    const targetAssets = depExecutedEvent?.args.targetAssets as string[] | undefined;
    const assetsBought = depExecutedEvent?.args.assetsBought as bigint[] | undefined;

    const sharesMinted =
      (depCompletedEvent?.args.sharesMinted as bigint | undefined) ??
      (depExecutedEvent?.args.sharesMinted as bigint | undefined);

    const rows: { key: string; label: string; value: React.ReactNode }[] = [];

    rows.push({
      key: 'gross',
      label: 'User deposited',
      value: (
        <strong className="text-white">
          {grossDeposit !== undefined ? formatAmount(grossDeposit, 6) : tx.summaryAmount} USDC
        </strong>
      ),
    });

    if (fee !== undefined && fee > 0n) {
      rows.push({
        key: 'fee',
        label: 'Protocol fee',
        value: <span className="text-amber-400">{formatAmount(fee, 6)} USDC</span>,
      });
    }

    if (netDeposit !== undefined) {
      rows.push({
        key: 'net',
        label: 'Net deposited',
        value: <strong className="text-white">{formatAmount(netDeposit, 6)} USDC</strong>,
      });
    }

    if (targetAssets && assetsBought && targetAssets.length === assetsBought.length) {
      rows.push({
        key: 'swapped',
        label: 'Swapped to',
        value: (
          <span className="text-cyan-300">
            {targetAssets
              .map(
                (a, i) =>
                  `${formatAmount(assetsBought[i], getTokenDecimals(a))} ${getTokenSymbol(a)}`,
              )
              .join(', ')}
          </span>
        ),
      });
    }

    if (sharesMinted !== undefined) {
      rows.push({
        key: 'shares',
        label: 'Shares minted',
        value: <strong className="text-white">{formatAmount(sharesMinted, 18)} UVBTCETH</strong>,
      });
    }

    return (
      <div className="mb-4 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-1.5">
        <div className="font-sans font-bold text-slate-200 text-xs flex items-center justify-between pb-1.5 border-b border-slate-800">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deposit Execution Summary</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Success
          </span>
        </div>
        <div className="space-y-1 pt-1 text-slate-300">
          {rows.map((r, idx) => (
            <div key={r.key} className="flex items-center space-x-2">
              <span className="text-slate-500">{idx === rows.length - 1 ? '└─' : '├─'}</span>
              <span>
                {r.label}: {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tx.actionType === 'redeem' && (redExecutedEvent || redCompletedEvent)) {
    const sharesBurned =
      (redCompletedEvent?.args.sharesBurned as bigint | undefined) ??
      (redExecutedEvent?.args.sharesBurned as bigint | undefined);

    const targetAssets = redExecutedEvent?.args.targetAssets as string[] | undefined;
    const assetsSold = redExecutedEvent?.args.assetsSold as bigint[] | undefined;

    const fee =
      (redCompletedEvent?.args.protocolFee as bigint | undefined) ??
      (redExecutedEvent?.args.fee as bigint | undefined) ??
      (feeCollectedEvent?.args.feeAmount as bigint | undefined);

    const netAssets =
      (redCompletedEvent?.args.netAssets as bigint | undefined) ??
      (redExecutedEvent?.args.usdcReturned as bigint | undefined);

    const rows: { key: string; label: string; value: React.ReactNode }[] = [];

    if (sharesBurned !== undefined) {
      rows.push({
        key: 'shares',
        label: 'Shares burned',
        value: <strong className="text-white">{formatAmount(sharesBurned, 18)} UVBTCETH</strong>,
      });
    }

    if (targetAssets && assetsSold && targetAssets.length === assetsSold.length) {
      rows.push({
        key: 'swapped',
        label: 'Swapped from',
        value: (
          <span className="text-cyan-300">
            {targetAssets
              .map(
                (a, i) =>
                  `${formatAmount(assetsSold[i], getTokenDecimals(a))} ${getTokenSymbol(a)}`,
              )
              .join(', ')}
          </span>
        ),
      });
    }

    if (fee !== undefined && fee > 0n) {
      rows.push({
        key: 'fee',
        label: 'Protocol fee',
        value: <span className="text-amber-400">{formatAmount(fee, 6)} USDC</span>,
      });
    }

    if (netAssets !== undefined) {
      rows.push({
        key: 'net',
        label: 'USDC payout',
        value: <strong className="text-white">{formatAmount(netAssets, 6)} USDC</strong>,
      });
    }

    return (
      <div className="mb-4 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-1.5">
        <div className="font-sans font-bold text-slate-200 text-xs flex items-center justify-between pb-1.5 border-b border-slate-800">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Redeem Execution Summary</span>
          </span>
          <span className="text-[10px] text-purple-400 font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
            Success
          </span>
        </div>
        <div className="space-y-1 pt-1 text-slate-300">
          {rows.map((r, idx) => (
            <div key={r.key} className="flex items-center space-x-2">
              <span className="text-slate-500">{idx === rows.length - 1 ? '└─' : '├─'}</span>
              <span>
                {r.label}: {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export function TimelineCard({ tx, explorerUrl }: TimelineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTechnicalEvents, setShowTechnicalEvents] = useState(false);

  const txShort = `${tx.transactionHash.slice(0, 8)}…${tx.transactionHash.slice(-6)}`;
  const time = new Date(tx.timestamp * 1000);
  const timeStr = time.toLocaleString();

  const eventCount = tx.events.length;
  const contractCount = new Set(tx.events.map((e) => e.contractName)).size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden hover:border-slate-700/80 transition-colors"
    >
      {/* ── Summary Row (always visible) ────────────────────────────── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-slate-800/30 transition-colors group"
      >
        {/* Expand chevron */}
        <ChevronDown
          className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${
            expanded ? 'rotate-0' : '-rotate-90'
          }`}
        />

        {/* Action badge */}
        <div className="flex-shrink-0 min-w-[90px]">
          <ActionBadge type={tx.actionType} />
        </div>

        {/* Method name */}
        <div className="flex-shrink-0 min-w-[80px]">
          <span className="text-sm font-semibold text-slate-200 font-mono">{tx.method}</span>
        </div>

        {/* Summary amount */}
        {tx.summaryAmount && (
          <div className="flex-shrink-0 hidden sm:block">
            <span className="text-sm font-bold text-white font-mono">
              {tx.summaryAmount} {tx.summaryAsset}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Meta info */}
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 font-mono flex-shrink-0">
          <StatusBadge status={tx.status} />
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {eventCount} event{eventCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {contractCount} contract{contractCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeStr}
          </span>
        </div>

        {/* Block + Tx link */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-500 font-mono">#{tx.blockNumber.toString()}</span>
          <a
            href={`${explorerUrl}/tx/${tx.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent-blue hover:underline font-mono text-xs flex items-center gap-1"
            title="View on block explorer"
          >
            {txShort}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </button>

      {/* ── Expanded Timeline ──────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-800/80 px-4 py-3 bg-slate-950/40">
              {/* Header bar with gas and status info */}
              <div className="flex items-center gap-4 mb-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <StatusBadge status={tx.status} />
                </span>
                <span className="flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3" />
                  Gas Used: {tx.gasUsed ? tx.gasUsed.toLocaleString() : '—'}
                </span>
                {tx.gasPrice !== undefined && tx.gasPrice > 0n && (
                  <span className="flex items-center gap-1 text-slate-500">
                    Gas Price: {formatGasPrice(tx.gasPrice)}
                  </span>
                )}
                {tx.gasFeeWei !== undefined && tx.gasFeeWei > 0n && (
                  <span className="flex items-center gap-1 text-slate-500">
                    Tx Fee: {formatETH(tx.gasFeeWei)} ETH
                  </span>
                )}
                {tx.wallet && (
                  <a
                    href={`${explorerUrl}/address/${tx.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-accent-blue hover:underline font-mono"
                  >
                    <span className="text-slate-500">User:</span>
                    {short(tx.wallet)}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {/* Human Readable Execution Summary First */}
              <HumanReadableExecutionSummary tx={tx} />

              {/* Toggle for Raw Technical On-Chain Events */}
              <div className="mt-2 mb-3">
                <button
                  onClick={() => setShowTechnicalEvents(!showTechnicalEvents)}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showTechnicalEvents ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                  <span>
                    {showTechnicalEvents
                      ? 'Hide Technical Events'
                      : `Show Technical Events (${eventCount} events)`}
                  </span>
                </button>
              </div>

              {/* Raw Technical Events Timeline */}
              {showTechnicalEvents && (
                <div className="space-y-0 ml-1 border-t border-slate-800/60 pt-3">
                  {tx.events.map((evt) => (
                    <TimelineStep key={evt.id} event={evt} explorerUrl={explorerUrl} />
                  ))}
                </div>
              )}

              {/* Legend */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap gap-3 text-[10px] text-slate-500">
                {[
                  { name: 'UnifyVaultController', color: 'bg-accent-blue' },
                  { name: 'CustodyVault', color: 'bg-accent-emerald' },
                  { name: 'Treasury', color: 'bg-accent-amber' },
                  { name: 'UVBTCETHToken', color: 'bg-accent-violet' },
                  { name: 'StrategyManager', color: 'bg-accent-cyan' },
                ].map((c) => (
                  <span key={c.name} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${c.color}`} />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
