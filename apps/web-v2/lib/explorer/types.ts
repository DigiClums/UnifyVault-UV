import type { Address, Hex, Log } from 'viem';

/**
 * Safe maximum block range for Base RPC eth_getLogs queries.
 * Must never exceed 2000 blocks. Using 1500 for safety margin.
 */
export const MAX_BLOCK_WINDOW = 1500n;

/** Classification of a protocol transaction */
export type ProtocolActionType =
  | 'deposit'
  | 'redeem'
  | 'fee'
  | 'admin'
  | 'p2p_settlement'
  | 'wallet_transfer'
  | 'other'
  | 'unknown';

/** Explorer state machine */
export type ExplorerState = 'loading' | 'ready' | 'error' | 'unsupported' | 'syncing';

/** Sync status for live indicator */
export type SyncStatus = 'live' | 'syncing' | 'stale' | 'offline';

// ─── Contract Registry ──────────────────────────────────────────────────────

export type ProtocolContractName =
  | 'UnifyVaultController'
  | 'CustodyVault'
  | 'Treasury'
  | 'UVBEToken'
  | 'UVBE'
  | 'UVBTCETHToken'
  | 'StrategyManager'
  | 'PortfolioManager'
  | 'CostBasisManager'
  | 'PerformanceManager'
  | 'P2PEscrow'
  | 'P2PMarketplace';

export interface ContractEventRegistry {
  name: string;
  abi: readonly object[];
}

// ─── Decoded Timeline Event ─────────────────────────────────────────────────

export interface DecodedTimelineEvent {
  /** Unique: `${txHash}-${logIndex}` */
  id: string;
  /** Contract that emitted this event */
  contractName: string;
  /** Raw ABI event name */
  eventName: string;
  /** Human-readable label */
  displayName: string;
  /** Decoded event args */
  args: Record<string, unknown>;
  /** Position in receipt (chronological) */
  logIndex: number;
  /** Raw log reference */
  log: Log;
}

// ─── Transaction Group ─────────────────────────────────────────────────────

export interface TransactionGroup {
  /** Transaction hash (unique key) */
  transactionHash: Hex;
  /** Block number */
  blockNumber: bigint;
  /** Block timestamp (seconds since epoch) */
  timestamp: number;
  /** All decoded events, ordered by logIndex */
  events: DecodedTimelineEvent[];
  /** High-level action classification */
  actionType: ProtocolActionType;
  /** Decoded function name (e.g. 'deposit', 'redeem') */
  method: string;
  /** Primary wallet (user who initiated / receiver) */
  wallet?: Address;
  /** Direct transaction sender (tx.from) */
  from?: Address;
  /** Direct transaction target (tx.to) */
  to?: Address;
  /** All address entities participating in this transaction/logs */
  allAddresses?: Address[];
  /** Symbols of all tokens involved in this transaction (e.g. ['USDC', 'UVBE']) */
  involvedTokens?: string[];
  /** Transaction status */
  status: 'success' | 'failed';
  /** Gas used */
  gasUsed?: bigint;
  /** Gas price in wei (effectiveGasPrice from receipt) */
  gasPrice?: bigint;
  /** Total gas fee in wei (gasUsed × gasPrice) */
  gasFeeWei?: bigint;
  /** Summary display amount */
  summaryAmount?: string;
  /** Summary display asset */
  summaryAsset?: string;
  /** Event count */
  eventCount: number;
  /** Unique contract count */
  contractCount: number;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface BlockWindow {
  fromBlock: bigint;
  toBlock: bigint;
  pageIndex: number;
}

export interface ExplorerPageData {
  transactions: TransactionGroup[];
  currentWindow: BlockWindow;
  latestBlock: bigint;
  hasMore: boolean;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface ExplorerStats {
  total: number;
  deposits: number;
  redeems: number;
  fees: number;
  admin: number;
}
