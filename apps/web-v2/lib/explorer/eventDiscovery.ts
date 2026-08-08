/**
 * Event discovery service – queries ALL protocol contracts for events,
 * not just the Controller. Discovers events from Controller, Vault, Treasury,
 * Token, StrategyManager, etc.
 */
import {
  type Address,
  type PublicClient,
  type Hex,
  type Log,
  decodeEventLog,
  decodeFunctionData,
  formatUnits,
} from 'viem';
import type {
  ContractEventRegistry,
  DecodedTimelineEvent,
  TransactionGroup,
  BlockWindow,
} from './types';
import {
  type ProtocolAddresses,
  buildEventRegistry,
  classifyTransaction,
  getEventDisplayName,
} from './eventRegistry';
import { getBlockWindow, validateBlockRange } from './blockRange';
import { CONTROLLER_ABI } from '../contracts/controller';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// ─── Log Decoding ───────────────────────────────────────────────────────────

function tryDecodeLog(
  log: Log,
  registry: Map<Address, ContractEventRegistry>,
): DecodedTimelineEvent | null {
  const emitter = (log.address as string).toLowerCase() as Address;
  const entry = registry.get(emitter);
  if (!entry || entry.abi.length === 0) return null;

  try {
    const decoded = decodeEventLog({
      abi: entry.abi,
      data: log.data,
      topics: log.topics,
    });
    if (!decoded.eventName) return null;

    return {
      id: `${log.transactionHash}-${log.logIndex ?? 0}`,
      contractName: entry.name,
      eventName: decoded.eventName,
      displayName: getEventDisplayName(entry.name, decoded.eventName),
      args: (decoded.args as Record<string, unknown>) ?? {},
      logIndex: log.logIndex ?? 0,
      log,
    };
  } catch {
    return null;
  }
}

// ─── Summary Builder ────────────────────────────────────────────────────────

function buildSummary(group: TransactionGroup): void {
  for (const evt of group.events) {
    if (evt.contractName === 'UnifyVaultController') {
      if (evt.eventName === 'DepositExecuted') {
        const amount = evt.args.depositAmount as bigint | undefined;
        if (amount) {
          group.summaryAmount = formatUnits(amount, 6);
          group.summaryAsset = 'USDC';
          return;
        }
      }
      if (evt.eventName === 'DepositCompleted') {
        const amount = evt.args.grossDeposit as bigint | undefined;
        if (amount) {
          group.summaryAmount = formatUnits(amount, 6);
          group.summaryAsset = 'USDC';
          return;
        }
      }
      if (evt.eventName === 'RedeemExecuted') {
        const amount = evt.args.usdcReturned as bigint | undefined;
        if (amount) {
          group.summaryAmount = formatUnits(amount, 6);
          group.summaryAsset = 'USDC';
          return;
        }
      }
      if (evt.eventName === 'RedeemCompleted') {
        const amount = evt.args.netAssets as bigint | undefined;
        if (amount) {
          group.summaryAmount = formatUnits(amount, 6);
          group.summaryAsset = 'USDC';
          return;
        }
      }
      if (evt.eventName === 'ProtocolFeeCollected') {
        const amount = evt.args.feeAmount as bigint | undefined;
        if (amount) {
          group.summaryAmount = formatUnits(amount, 6);
          group.summaryAsset = 'USDC';
          return;
        }
      }
    }
  }

  // Fallback: mint/burn from Token
  for (const evt of group.events) {
    if (evt.contractName === 'UVBTCETHToken' && evt.eventName === 'Transfer') {
      const from = evt.args.from as string;
      const to = evt.args.to as string;
      if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
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

// ─── Wallet Extraction ─────────────────────────────────────────────────────

function extractWallet(events: DecodedTimelineEvent[]): Address | undefined {
  for (const evt of events) {
    if (evt.contractName === 'UnifyVaultController') {
      return (
        (evt.args.user as Address) ??
        (evt.args.receiver as Address) ??
        (evt.args.owner as Address) ??
        (evt.args.payer as Address) ??
        (evt.args.caller as Address)
      );
    }
  }
  return undefined;
}

// ─── Main Discovery Function ────────────────────────────────────────────────

/**
 * Discover all protocol transactions in a block window.
 *
 * Strategy:
 * 1. Query Controller events (primary event source)
 * 2. Query Treasury standalone events (fees, withdrawals)
 * 3. Query Vault standalone events
 * 4. Deduplicate by transaction hash
 * 5. Fetch full receipt for each unique tx
 * 6. Decode ALL receipt logs against complete ABI map
 * 7. Group, classify, and sort
 */
export async function discoverTransactions(
  client: PublicClient,
  controller: Address,
  addresses: ProtocolAddresses,
  usdc: Address,
  cbBTC: Address,
  weth: Address,
  latestBlock: bigint,
  pageIndex: number,
): Promise<{
  groups: TransactionGroup[];
  window: BlockWindow;
  hasMore: boolean;
}> {
  const window = getBlockWindow(latestBlock, pageIndex);

  if (window.toBlock <= 0n) {
    return { groups: [], window, hasMore: false };
  }

  validateBlockRange(window.fromBlock, window.toBlock);

  // Build event registry for all contracts + tokens
  const registry = buildEventRegistry(addresses, usdc, cbBTC, weth);

  // Collect all unique transaction hashes from protocol contract events
  const txHashes = new Set<Hex>();

  // 1. Controller events
  try {
    const controllerLogs = await client.getContractEvents({
      address: controller,
      abi: CONTROLLER_ABI,
      fromBlock: window.fromBlock,
      toBlock: window.toBlock,
    });
    for (const log of controllerLogs) {
      if (log.transactionHash) txHashes.add(log.transactionHash);
    }
  } catch {
    // Controller query failed – continue with other sources
  }

  // 2. Treasury standalone events
  if (addresses.treasury) {
    try {
      const treasuryLogs = await client.getContractEvents({
        address: addresses.treasury,
        abi: [
          {
            type: 'event',
            name: 'FeeCollected',
            inputs: [
              { indexed: true, name: 'asset', type: 'address' },
              { indexed: true, name: 'from', type: 'address' },
              { indexed: false, name: 'amount', type: 'uint256' },
            ],
          },
          {
            type: 'event',
            name: 'TreasuryWithdrawal',
            inputs: [
              { indexed: true, name: 'asset', type: 'address' },
              { indexed: true, name: 'recipient', type: 'address' },
              { indexed: false, name: 'amount', type: 'uint256' },
              { indexed: true, name: 'caller', type: 'address' },
            ],
          },
        ] as const,
        fromBlock: window.fromBlock,
        toBlock: window.toBlock,
      });
      for (const log of treasuryLogs) {
        if (log.transactionHash) txHashes.add(log.transactionHash);
      }
    } catch {
      // Continue
    }
  }

  // 3. Vault standalone events
  if (addresses.vault) {
    try {
      const vaultLogs = await client.getContractEvents({
        address: addresses.vault,
        abi: [
          {
            type: 'event',
            name: 'DepositExecuted',
            inputs: [
              { indexed: true, name: 'asset', type: 'address' },
              { indexed: true, name: 'from', type: 'address' },
              { indexed: false, name: 'amount', type: 'uint256' },
              { indexed: true, name: 'caller', type: 'address' },
            ],
          },
          {
            type: 'event',
            name: 'WithdrawalExecuted',
            inputs: [
              { indexed: true, name: 'asset', type: 'address' },
              { indexed: true, name: 'to', type: 'address' },
              { indexed: false, name: 'amount', type: 'uint256' },
              { indexed: true, name: 'caller', type: 'address' },
            ],
          },
        ] as const,
        fromBlock: window.fromBlock,
        toBlock: window.toBlock,
      });
      for (const log of vaultLogs) {
        if (log.transactionHash) txHashes.add(log.transactionHash);
      }
    } catch {
      // Continue
    }
  }

  // 4. Fetch receipt + transaction for each unique hash
  const blockTimestamps = new Map<bigint, number>();
  const groups: TransactionGroup[] = [];

  for (const hash of txHashes) {
    try {
      const [receipt, tx] = await Promise.all([
        client.getTransactionReceipt({ hash }),
        client.getTransaction({ hash }),
      ]);

      if (!receipt || !tx) continue;

      // Decode ALL receipt logs
      const decodedEvents: DecodedTimelineEvent[] = [];
      for (const log of receipt.logs) {
        const decoded = tryDecodeLog(log as Log, registry);
        if (decoded) decodedEvents.push(decoded);
      }

      // Sort chronologically
      decodedEvents.sort((a, b) => a.logIndex - b.logIndex);

      // Method name from calldata
      let method = 'unknown';
      try {
        method = decodeFunctionData({
          abi: CONTROLLER_ABI,
          data: tx.input,
        }).functionName;
      } catch {
        // Non-controller call
      }

      // Block timestamp (cache)
      let timestamp = 0;
      if (tx.blockNumber) {
        if (blockTimestamps.has(tx.blockNumber)) {
          timestamp = blockTimestamps.get(tx.blockNumber)!;
        } else {
          try {
            const block = await client.getBlock({ blockNumber: tx.blockNumber });
            timestamp = Number(block.timestamp);
            blockTimestamps.set(tx.blockNumber, timestamp);
          } catch {
            timestamp = Math.floor(Date.now() / 1000);
          }
        }
      }

      const eventNames = decodedEvents.map((e) => e.eventName);
      const actionType = classifyTransaction(eventNames);

      const effectiveGasPrice = receipt.effectiveGasPrice ?? tx.gasPrice;
      const gasPrice = effectiveGasPrice ?? 0n;

      const group: TransactionGroup = {
        transactionHash: hash,
        blockNumber: tx.blockNumber ?? 0n,
        timestamp,
        events: decodedEvents,
        actionType: actionType as TransactionGroup['actionType'],
        method,
        wallet: extractWallet(decodedEvents),
        status: receipt.status === 'success' ? 'success' : 'failed',
        gasUsed: receipt.gasUsed,
        gasPrice,
        gasFeeWei: receipt.gasUsed ? receipt.gasUsed * gasPrice : undefined,
        eventCount: decodedEvents.length,
        contractCount: new Set(decodedEvents.map((e) => e.contractName)).size,
      };

      buildSummary(group);
      groups.push(group);
    } catch {
      // Skip this transaction if receipt is unavailable
    }
  }

  // Sort by blockNumber desc, then by first logIndex
  groups.sort((a, b) => {
    if (b.blockNumber !== a.blockNumber) return Number(b.blockNumber - a.blockNumber);
    const aFirst = a.events[0]?.logIndex ?? 0;
    const bFirst = b.events[0]?.logIndex ?? 0;
    return bFirst - aFirst;
  });

  const hasMore = window.toBlock > 1500n && window.fromBlock > 0n;

  return { groups, window, hasMore };
}
