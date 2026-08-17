/**
 * Complete event ABI registry for all protocol contracts and known tokens.
 *
 * Maps every contract address to its ABI for receipt log decoding.
 * Includes: Controller, Vault, Treasury, Token, StrategyManager,
 *           SwapAdapter, USDC, cbBTC, WETH, CostBasisManager.
 */
import { type Address, parseAbi, formatUnits } from 'viem';
import type { ContractEventRegistry } from './types';

// ─── Individual Event ABIs ──────────────────────────────────────────────────

const CONTROLLER_EVENT_ABI = parseAbi([
  'event DepositExecuted(address indexed user, uint256 depositAmount, uint256 fee, address[] targetAssets, uint256[] assetsBought, uint256 sharesMinted, uint256 navAfter)',
  'event DepositCompleted(address indexed receiver, address indexed asset, uint256 grossDeposit, uint256 protocolFee, uint256 netDeposit, uint256 sharesMinted)',
  'event RedeemExecuted(address indexed user, uint256 sharesBurned, address[] targetAssets, uint256[] assetsSold, uint256 fee, uint256 usdcReturned, uint256 navAfter)',
  'event RedeemCompleted(address indexed owner, address indexed receiver, address indexed asset, uint256 sharesBurned, uint256 grossAssets, uint256 protocolFee, uint256 netAssets)',
  'event ProtocolFeeCollected(address indexed payer, address indexed asset, uint256 feeAmount)',
  'event EmergencyPaused(address indexed caller)',
  'event EmergencyResumed(address indexed caller)',
]);

const VAULT_EVENT_ABI = parseAbi([
  'event DepositExecuted(address indexed asset, address indexed from, uint256 amount, address indexed caller)',
  'event WithdrawalExecuted(address indexed asset, address indexed to, uint256 amount, address indexed caller)',
]);

const TREASURY_EVENT_ABI = parseAbi([
  'event FeeCollected(address indexed asset, address indexed from, uint256 amount)',
  'event TreasuryWithdrawal(address indexed asset, address indexed recipient, uint256 amount, address indexed caller)',
  'event NativeWithdrawn(address indexed recipient, uint256 amount, address indexed caller)',
]);

const TOKEN_EVENT_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);

const STRATEGY_EVENT_ABI = parseAbi([
  'event StrategyRebalanced(address indexed caller, address[] assets, uint256[] newWeights)',
]);

const COST_BASIS_EVENT_ABI = parseAbi([
  'event CostBasisUpdated(address indexed user, uint256 newCostBasis)',
]);

// ─── Human-Readable Display Names & Token Helpers ────────────────────────────

type EventKey = string;

export const EVENT_DISPLAY_NAMES: Record<EventKey, string> = {
  'UnifyVaultController:DepositExecuted': 'Deposit Executed',
  'UnifyVaultController:DepositCompleted': 'Deposit Completed',
  'UnifyVaultController:RedeemExecuted': 'Redeem Executed',
  'UnifyVaultController:RedeemCompleted': 'Redeem Completed',
  'UnifyVaultController:ProtocolFeeCollected': 'Protocol Fee Collected',
  'UnifyVaultController:EmergencyPaused': 'Emergency Paused',
  'UnifyVaultController:EmergencyResumed': 'Emergency Resumed',
  'CustodyVault:DepositExecuted': 'Custody Deposit',
  'CustodyVault:WithdrawalExecuted': 'Custody Withdrawal',
  'Treasury:FeeCollected': 'Fee Sent To Treasury',
  'Treasury:TreasuryWithdrawal': 'Treasury Withdrawal',
  'Treasury:NativeWithdrawn': 'Native (ETH) Withdrawn',
  'UVBTCETHToken:Transfer': 'Shares Transfer',
  'UVBTCETHToken:Approval': 'Shares Approval',
  'StrategyManager:StrategyRebalanced': 'Strategy Rebalanced',
  'CostBasisManager:CostBasisUpdated': 'Cost Basis Updated',
  'PortfolioManager:PortfolioRebalanced': 'Portfolio Rebalanced',
};

export function getEventDisplayName(contractName: string, eventName: string): string {
  return EVENT_DISPLAY_NAMES[`${contractName}:${eventName}`] ?? `${contractName}: ${eventName}`;
}

export const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  // Base Mainnet
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6 },
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': { symbol: 'cbBTC', decimals: 8 },
  '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  // Base Sepolia
  '0x036cbd53842c5426634e7929541ec2318f3dcf7e': { symbol: 'USDC', decimals: 6 },
  '0xb0b47f113bcab2b0e49fd5d3bd2cc0e9aa408b29': { symbol: 'cbBTC', decimals: 8 },
  '0xd116ab1c943cf15904ec4c8dd701086f175fa323': { symbol: 'WETH', decimals: 18 },
  '0x006c5df13c716e5224b33956651c4356bb90dec0': { symbol: 'UVBE', decimals: 18 },
};

export function getTokenSymbol(addrOrSymbol?: string): string {
  if (!addrOrSymbol) return '—';
  const lower = addrOrSymbol.toLowerCase();
  if (KNOWN_TOKENS[lower]) return KNOWN_TOKENS[lower].symbol;
  if (addrOrSymbol.startsWith('0x') && addrOrSymbol.length === 42) {
    return `${addrOrSymbol.slice(0, 6)}…${addrOrSymbol.slice(-4)}`;
  }
  return addrOrSymbol;
}

export function getTokenDecimals(addrOrSymbol?: string): number {
  if (!addrOrSymbol) return 18;
  const lower = addrOrSymbol.toLowerCase();
  if (KNOWN_TOKENS[lower]) return KNOWN_TOKENS[lower].decimals;
  const sym = getTokenSymbol(addrOrSymbol).toLowerCase();
  if (sym.includes('cbbtc')) return 8;
  if (sym.includes('usdc')) return 6;
  if (sym.includes('weth')) return 18;
  return 18;
}

export function formatAmount(value: bigint | undefined, decimals: number = 18): string {
  if (value === undefined || value === 0n) return '0';
  return formatUnits(value, decimals);
}

// ─── Address → Registry Map Builder ─────────────────────────────────────────

export interface ProtocolAddresses {
  controller?: Address;
  vault?: Address;
  treasury?: Address;
  token?: Address;
  strategyManager?: Address;
  costBasisManager?: Address;
  performanceManager?: Address;
  swapAdapter?: Address;
}

/**
 * Build a complete runtime map: address → { name, abi }.
 * Includes protocol contracts AND known tokens (USDC, cbBTC, WETH).
 */
export function buildEventRegistry(
  addresses: ProtocolAddresses,
  usdc: Address,
  cbBTC: Address,
  weth: Address,
): Map<Address, ContractEventRegistry> {
  const map = new Map<Address, ContractEventRegistry>();

  const add = (addr: Address | undefined, name: string, abi: readonly object[]) => {
    if (addr) map.set(addr.toLowerCase() as Address, { name, abi });
  };

  // Protocol contracts
  add(addresses.controller, 'UnifyVaultController', CONTROLLER_EVENT_ABI);
  add(addresses.vault, 'CustodyVault', VAULT_EVENT_ABI);
  add(addresses.treasury, 'Treasury', TREASURY_EVENT_ABI);
  add(addresses.token, 'UVBEToken', TOKEN_EVENT_ABI);
  add(addresses.token, 'UVBTCETHToken', TOKEN_EVENT_ABI);
  add(addresses.strategyManager, 'StrategyManager', STRATEGY_EVENT_ABI);
  add(addresses.costBasisManager, 'CostBasisManager', COST_BASIS_EVENT_ABI);

  // Known ERC20 tokens
  add(usdc, 'USDC', TOKEN_EVENT_ABI);
  add(cbBTC, 'cbBTC', TOKEN_EVENT_ABI);
  add(weth, 'WETH', TOKEN_EVENT_ABI);

  // SwapAdapter (generic events)
  add(addresses.swapAdapter, 'SwapAdapter', []);

  return map;
}

// ─── Action Classification ──────────────────────────────────────────────────

/**
 * Classify a transaction based on its decoded event names.
 * Priority: deposit > redeem > fee > admin > other
 */
export function classifyTransaction(eventNames: string[]): string {
  for (const name of eventNames) {
    if (name === 'DepositExecuted' || name === 'DepositCompleted') return 'deposit';
  }
  for (const name of eventNames) {
    if (name === 'RedeemExecuted' || name === 'RedeemCompleted') return 'redeem';
  }
  for (const name of eventNames) {
    if (
      name === 'ProtocolFeeCollected' ||
      name === 'FeeCollected' ||
      name === 'TreasuryWithdrawal' ||
      name === 'NativeWithdrawn' ||
      name === 'CostBasisUpdated'
    )
      return 'fee';
  }
  for (const name of eventNames) {
    if (name === 'EmergencyPaused' || name === 'EmergencyResumed' || name === 'StrategyRebalanced')
      return 'admin';
  }
  if (eventNames.includes('Transfer')) {
    return 'wallet_transfer';
  }
  // Any transaction involving protocol contracts is "other" (never discard)
  if (eventNames.length > 0) return 'other';
  return 'unknown';
}
