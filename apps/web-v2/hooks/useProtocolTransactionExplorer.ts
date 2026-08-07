'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decodeEventLog,
  decodeFunctionData,
  formatUnits,
  type Address,
  type Hex,
  type Log,
} from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTROLLER_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';
import {
  buildAddressToABIMap,
  classifyTransaction,
  getEventDisplayName,
  type ContractEventRegistry,
  type ProtocolActionType,
  type ProtocolContractName,
} from '../lib/contracts/events-registry';

/** Keep requests comfortably below public Base RPC log-range limits. */
export const TRANSACTION_BLOCK_WINDOW = 1_500n;

export type TransactionSource = 'rpc';
export type ExplorerState = 'loading' | 'ready' | 'error' | 'unsupported';

// ─── Decoded Timeline Event ─────────────────────────────────────────────────

export interface DecodedTimelineEvent {
  /** Unique identifier: `${txHash}-${logIndex}` */
  id: string;
  /** The contract that emitted this event */
  contractName: string;
  /** The raw event name from the ABI */
  eventName: string;
  /** Human-readable display name */
  displayName: string;
  /** Decoded event arguments */
  args: Record<string, unknown>;
  /** Position in the receipt (chronological order) */
  logIndex: number;
  /** Raw log for reference */
  log: Log;
}

// ─── Transaction Group ──────────────────────────────────────────────────────

export interface TransactionGroup {
  /** Transaction hash (unique key) */
  transactionHash: Hex;
  /** Block number */
  blockNumber: bigint;
  /** Block timestamp (seconds) */
  timestamp: number;
  /** All decoded events from the receipt, ordered by logIndex */
  events: DecodedTimelineEvent[];
  /** The high-level action type */
  actionType: ProtocolActionType;
  /** The decoded function name from calldata (e.g. 'deposit', 'redeem') */
  method: string;
  /** The primary wallet involved (user who initiated) */
  wallet?: Address;
  /** Transaction receipt status */
  status: 'success' | 'failed';
  /** Gas used */
  gasUsed?: bigint;
  /** Total gas fee in wei */
  gasFeeWei?: bigint;
  /** Summary amount (for display in collapsed row) */
  summaryAmount?: string;
  /** Summary asset (for display in collapsed row) */
  summaryAsset?: string;
}

// ─── Flat Event (backward compat with admin page) ───────────────────────────

export interface ProtocolTransaction {
  id: string;
  transactionHash: Hex;
  blockNumber: bigint;
  timestamp: number;
  logIndex: number;
  eventName: string;
  method: string;
  wallet?: Address;
  asset?: Address;
  assetSymbol?: string;
  assetDecimals?: number;
  amount?: bigint;
  amountDisplay?: string;
  usdValue?: undefined;
  status: 'success' | 'failed';
  gasUsed?: bigint;
  gasFeeWei?: bigint;
}

// ─── Decoding Utilities ─────────────────────────────────────────────────────

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function tryDecodeLog(
  log: Log,
  registry: Map<Address, ContractEventRegistry>,
): DecodedTimelineEvent | null {
  const emitter = (log.address as string).toLowerCase() as Address;
  const entry = registry.get(emitter);
  if (!entry) return null;

  try {
    const decoded = decodeEventLog({
      abi: entry.abi,
      data: log.data,
      topics: log.topics,
    });

    const eventName = decoded.eventName;
    // Filter out noise — only decode named events with our known ABIs
    if (!eventName) return null;

    return {
      id: `${log.transactionHash}-${log.logIndex ?? 0}`,
      contractName: entry.name,
      eventName,
      displayName: getEventDisplayName(entry.name, eventName),
      args: decoded.args as unknown as Record<string, unknown>,
      logIndex: log.logIndex ?? 0,
      log,
    };
  } catch {
    return null;
  }
}

async function readTokenMetadata(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  asset?: Address,
) {
  if (!asset) return undefined;
  try {
    const [symbol, decimals] = await Promise.all([
      client.readContract({
        address: asset,
        abi: [
          {
            type: 'function',
            name: 'symbol',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'string' }],
          },
        ],
        functionName: 'symbol',
      }),
      client.readContract({
        address: asset,
        abi: [
          {
            type: 'function',
            name: 'decimals',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'uint8' }],
          },
        ],
        functionName: 'decimals',
      }),
    ]);
    return { symbol: String(symbol), decimals: Number(decimals) };
  } catch {
    return undefined;
  }
}

/**
 * Build a summary for the transaction group based on the decoded events.
 * Extracts the main amount and asset from Controller events.
 */
function buildSummary(group: TransactionGroup) {
  // Try to find the primary amount from controller events
  for (const evt of group.events) {
    if (evt.contractName === 'UnifyVaultController' && evt.eventName === 'DepositExecuted') {
      const amount = evt.args.depositAmount as bigint | undefined;
      if (amount) {
        group.summaryAmount = formatUnits(amount, 6);
        group.summaryAsset = 'USDC';
        return;
      }
    }
    if (evt.contractName === 'UnifyVaultController' && evt.eventName === 'RedeemExecuted') {
      const amount = evt.args.usdcReturned as bigint | undefined;
      if (amount) {
        group.summaryAmount = formatUnits(amount, 6);
        group.summaryAsset = 'USDC';
        return;
      }
    }
    if (evt.contractName === 'UnifyVaultController' && evt.eventName === 'DepositCompleted') {
      const amount = evt.args.grossDeposit as bigint | undefined;
      if (amount) {
        group.summaryAmount = formatUnits(amount, 6);
        group.summaryAsset = 'USDC';
        return;
      }
    }
    if (evt.contractName === 'UnifyVaultController' && evt.eventName === 'RedeemCompleted') {
      const amount = evt.args.netAssets as bigint | undefined;
      if (amount) {
        group.summaryAmount = formatUnits(amount, 6);
        group.summaryAsset = 'USDC';
        return;
      }
    }
    if (evt.contractName === 'UnifyVaultController' && evt.eventName === 'ProtocolFeeCollected') {
      const amount = evt.args.feeAmount as bigint | undefined;
      if (amount) {
        group.summaryAmount = formatUnits(amount, 6);
        group.summaryAsset = 'USDC';
        return;
      }
    }
  }

  // Fallback: look for the largest Transfer event with USDC
  for (const evt of group.events) {
    if (evt.contractName === 'UVBTCETHToken' && evt.eventName === 'Transfer') {
      const from = evt.args.from as string;
      const to = evt.args.to as string;
      if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
        // mint/burn of shares — use the decoded value
        const value = evt.args.value as bigint | undefined;
        if (value) {
          group.summaryAmount = formatUnits(value, 18);
          group.summaryAsset = 'Shares';
          return;
        }
      }
    }
  }
}

/**
 * Flatten transaction groups back into individual ProtocolTransaction entries
 * for backward compatibility with the admin page.
 */
function flattenToEvents(groups: TransactionGroup[]): ProtocolTransaction[] {
  const out: ProtocolTransaction[] = [];
  for (const g of groups) {
    for (const evt of g.events) {
      if (evt.contractName !== 'UnifyVaultController') continue;
      out.push({
        id: evt.id,
        transactionHash: g.transactionHash,
        blockNumber: g.blockNumber,
        timestamp: g.timestamp,
        logIndex: evt.logIndex,
        eventName: evt.eventName,
        method: g.method,
        wallet: g.wallet,
        amountDisplay: g.summaryAmount ? `${g.summaryAmount} ${g.summaryAsset ?? ''}` : undefined,
        status: g.status,
        gasUsed: g.gasUsed,
        gasFeeWei: g.gasFeeWei,
      });
    }
  }
  return out;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProtocolTransactionExplorer(page: number) {
  const { chain } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const {
    controller,
    vault,
    treasury,
    token,
    strategyManager,
    isLoading: isDirectoryLoading,
    isError: isDirectoryError,
  } = useProtocolDirectory();
  const chainId = chain?.id;
  const supported = Boolean(chainId && publicClient && controller);

  // Build address→ABI map once directory resolves
  const eventRegistry = useMemo(() => {
    if (!vault && !treasury && !token && !strategyManager) return null;
    return buildAddressToABIMap({
      UnifyVaultController: controller,
      CustodyVault: vault,
      Treasury: treasury,
      UVBTCETHToken: token,
      StrategyManager: strategyManager,
    } as Record<ProtocolContractName, Address | undefined>);
  }, [controller, vault, treasury, token, strategyManager]);

  const query = useQuery({
    queryKey: ['protocol-transactions-v2', chainId, controller, page],
    enabled: supported,
    staleTime: 15_000,
    retry: 1,
    queryFn: async (): Promise<{
      transactions: TransactionGroup[];
      events: ProtocolTransaction[];
      fromBlock: bigint;
      toBlock: bigint;
    }> => {
      if (!publicClient || !controller)
        throw new Error('Protocol controller is unavailable for this network.');

      const latestBlock = await publicClient.getBlockNumber();
      const toBlock = latestBlock - BigInt(page) * TRANSACTION_BLOCK_WINDOW;
      if (toBlock < 0n) return { transactions: [], events: [], fromBlock: 0n, toBlock: 0n };

      const fromBlock =
        toBlock >= TRANSACTION_BLOCK_WINDOW - 1n ? toBlock - TRANSACTION_BLOCK_WINDOW + 1n : 0n;

      // 1. Fetch controller events
      const logs = await publicClient.getContractEvents({
        address: controller,
        abi: CONTROLLER_ABI,
        fromBlock,
        toBlock,
      });

      // 2. Deduplicate transaction hashes
      const txHashes = new Set<Hex>();
      for (const log of logs) {
        if (log.transactionHash) txHashes.add(log.transactionHash);
      }

      // 3. Fetch receipt + transaction for each unique tx hash
      const txDetails = await Promise.all(
        Array.from(txHashes).map(async (hash) => {
          const [receipt, tx] = await Promise.all([
            publicClient.getTransactionReceipt({ hash }).catch(() => null),
            publicClient.getTransaction({ hash }).catch(() => null),
          ]);
          return { hash, receipt, tx };
        }),
      );

      // 4. Build registry if not yet available (should be, but safety)
      const registry =
        eventRegistry ??
        buildAddressToABIMap({
          UnifyVaultController: controller,
        } as Record<ProtocolContractName, Address | undefined>);

      // 5. Decode all logs, group by transaction
      const blockTimestamps = new Map<bigint, number>();
      const groups: TransactionGroup[] = [];

      for (const { hash, receipt, tx } of txDetails) {
        if (!receipt || !tx) continue;

        // Decode every log in the receipt
        const decodedEvents: DecodedTimelineEvent[] = [];
        for (const log of receipt.logs) {
          const decoded = tryDecodeLog(log as Log, registry);
          if (decoded) decodedEvents.push(decoded);
        }

        // Sort by logIndex (chronological order)
        decodedEvents.sort((a, b) => a.logIndex - b.logIndex);

        // Determine method name from calldata
        let method = 'unknown';
        try {
          method = decodeFunctionData({
            abi: CONTROLLER_ABI,
            data: tx.input,
          }).functionName;
        } catch {
          // Internal operation or non-controller call
        }

        // Get block timestamp
        let timestamp = 0;
        if (tx.blockNumber) {
          if (blockTimestamps.has(tx.blockNumber)) {
            timestamp = blockTimestamps.get(tx.blockNumber)!;
          } else {
            try {
              const block = await publicClient.getBlock({
                blockNumber: tx.blockNumber,
              });
              timestamp = Number(block.timestamp);
              blockTimestamps.set(tx.blockNumber, timestamp);
            } catch {
              timestamp = Math.floor(Date.now() / 1000);
            }
          }
        }

        // Classify action type
        const eventNames = decodedEvents.map((e) => e.eventName);
        const actionType = classifyTransaction(eventNames);

        // Extract primary wallet
        let wallet: Address | undefined;
        for (const evt of decodedEvents) {
          if (evt.contractName === 'UnifyVaultController') {
            wallet =
              (evt.args.user as Address) ??
              (evt.args.receiver as Address) ??
              (evt.args.owner as Address) ??
              (evt.args.payer as Address) ??
              (evt.args.caller as Address) ??
              wallet;
            if (wallet) break;
          }
        }

        const group: TransactionGroup = {
          transactionHash: hash,
          blockNumber: tx.blockNumber ?? 0n,
          timestamp,
          events: decodedEvents,
          actionType,
          method,
          wallet,
          status: receipt.status === 'success' ? 'success' : 'failed',
          gasUsed: receipt.gasUsed,
          gasFeeWei: tx.gasPrice && receipt.gasUsed ? receipt.gasUsed * tx.gasPrice : undefined,
        };

        buildSummary(group);
        groups.push(group);
      }

      // Sort groups by blockNumber desc, then by first logIndex
      groups.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) return Number(b.blockNumber - a.blockNumber);
        const aFirst = a.events[0]?.logIndex ?? 0;
        const bFirst = b.events[0]?.logIndex ?? 0;
        return bFirst - aFirst;
      });

      return {
        transactions: groups,
        events: flattenToEvents(groups),
        fromBlock,
        toBlock,
      };
    },
  });

  // Live watcher
  useEffect(() => {
    if (!publicClient || !controller || !chainId) return;
    return publicClient.watchContractEvent({
      address: controller,
      abi: CONTROLLER_ABI,
      onLogs: () =>
        queryClient.invalidateQueries({
          queryKey: ['protocol-transactions-v2', chainId, controller],
        }),
      onError: () =>
        queryClient.invalidateQueries({
          queryKey: ['protocol-transactions-v2', chainId, controller],
        }),
    });
  }, [chainId, controller, publicClient, queryClient]);

  const state: ExplorerState = useMemo(() => {
    if (!chainId || !publicClient || !controller)
      return isDirectoryLoading ? 'loading' : 'unsupported';
    if (query.isLoading) return 'loading';
    if (query.isError || isDirectoryError) return 'error';
    return 'ready';
  }, [
    chainId,
    controller,
    isDirectoryError,
    isDirectoryLoading,
    publicClient,
    query.isError,
    query.isLoading,
  ]);

  return {
    ...query,
    state,
    controller,
    chainId,
    source: 'rpc' as TransactionSource,
  };
}
