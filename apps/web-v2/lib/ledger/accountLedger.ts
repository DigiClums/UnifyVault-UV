/**
 * Deterministic Off-Chain Account Ledger Engine
 *
 * Enforces strict domain separation between:
 * 1. Vault Portfolio Accounting (Vault deposits, redemptions, NAV, CostBasisManager)
 * 2. P2P Available Inventory (P2P-origin UVBE, acquisition cost basis, P2P P&L)
 * 3. P2P Escrow-Locked Inventory (UVBE locked in P2PEscrowV2 during FUNDED, PAYMENT_SUBMITTED, DISPUTED)
 *
 * CRITICAL RULES:
 * - Never use raw ERC20 balanceOf(user) directly as portfolio shares.
 * - balanceOf(user) is only TOTAL WALLET TOKEN BALANCE / informational balance.
 * - Escrow locks do NOT change Vault NAV, cost basis, or ROI, and do NOT create phantom P&L.
 * - Escrow releases dispose seller inventory correctly and credit buyer P2P inventory.
 * - Escrow refunds restore inventory to seller without P&L realization.
 * - 1% P2P settlement fee belongs strictly to P2P domain.
 */

import { formatShares, formatUSD, formatPnLUSD, formatPnLPercent } from '../math';

export type EscrowTradeOrigin = 'VAULT' | 'P2P' | 'UNKNOWN';

export interface LedgerEvent {
  id: string;
  type:
    | 'VAULT_DEPOSIT'
    | 'VAULT_REDEEM'
    | 'P2P_BUY'
    | 'P2P_SELL'
    | 'P2P_ESCROW_LOCK'
    | 'P2P_REFUND'
    | 'P2P_DISPUTE'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT';
  timestamp: number;
  blockNumber?: number;
  sharesRaw: bigint;
  usdValue?: number;
  tradeId?: number;
  origin?: EscrowTradeOrigin;
  metadata?: Record<string, unknown>;
}

export interface EscrowLockedPosition {
  tradeId: number;
  seller: string;
  buyer: string;
  amount: bigint;
  amountFormatted: string;
  origin: EscrowTradeOrigin;
  state: number; // 2: FUNDED, 3: PAYMENT_SUBMITTED, 4: DISPUTED
  stateLabel: string;
  role: 'SELLER' | 'BUYER';
  fiatAmount?: bigint;
  fiatCurrency?: string;
  fiatValueUSD?: number;
  lockedValueUSD: number;
  formattedLockedValueUSD: string;
}

export interface P2PEscrowLockedAccounting {
  lockedSharesRaw: bigint;
  lockedSharesFormatted: string;
  lockedValueUSD: number;
  formattedLockedValueUSD: string;
  lockedPositionsCount: number;
  lockedPositions: EscrowLockedPosition[];
  hasLockedInventory: boolean;
}

export interface VaultPortfolioAccounting {
  portfolioSharesRaw: bigint;
  portfolioSharesFormatted: string;
  portfolioInvestedCapitalUSD: number;
  portfolioCostBasisUSD: number;
  portfolioPositionValueUSD: number;
  portfolioPnLUSD: number;
  portfolioUnrealizedPnLUSD: number;
  portfolioRealizedPnLUSD: number;
  portfolioROI: number; // percentage (-100 to +infinity)
  isProfitable: boolean;
  averageEntryPriceUSD: number;
  formattedInvestedUSD: string;
  formattedPositionValueUSD: string;
  formattedPnLUSD: string;
  formattedROI: string;
}

export interface P2PTradingAccounting {
  activeP2PSharesRaw: bigint;
  activeP2PSharesFormatted: string;
  p2pAcquiredCostUSD: number;
  p2pCurrentValueUSD: number;
  p2pUnrealizedPnLUSD: number;
  p2pRealizedPnLUSD: number;
  p2pTradesCount: number;
  hasP2PActivity: boolean;
  formattedP2PShares: string;
  formattedP2PCostUSD: string;
  formattedP2PCurrentValueUSD: string;
  formattedP2PUnrealizedPnLUSD: string;
  formattedP2PRealizedPnLUSD: string;
}

export interface UserDecoupledPortfolio {
  userAddress?: `0x${string}`;
  totalWalletSharesRaw: bigint;
  totalWalletSharesFormatted: string;
  vaultPortfolio: VaultPortfolioAccounting;
  p2pTrading: P2PTradingAccounting;
  escrowLocked: P2PEscrowLockedAccounting;
  hasP2PShares: boolean;
  hasVaultShares: boolean;
  hasLockedShares: boolean;
  sharePriceUSD: number;
}

export interface P2PTradeData {
  tradeId: number;
  buyer: string;
  seller: string;
  amount: bigint;
  fiatAmount: bigint;
  fiatCurrency: string;
  state: number; // 0=NONE, 1=CREATED, 2=FUNDED, 3=PAYMENT_SUBMITTED, 4=DISPUTED, 5=RELEASED, 6=REFUNDED, 7=CANCELLED
  fundingTimestamp?: number;
  paymentTimestamp?: number;
  origin?: EscrowTradeOrigin;
  feeAmount?: bigint;
}

export interface ReconcileLedgerParams {
  userAddress?: `0x${string}`;
  totalWalletSharesRaw: bigint;
  onChainCostBasisRaw: bigint;
  currentSharePriceUSD: number;
  onChainPerformance?: unknown;
  events?: LedgerEvent[];
  p2pTrades?: P2PTradeData[];
}

export const TRADE_STATE_LABELS: Record<number, string> = {
  0: 'Uninitialized',
  1: 'Created (Unfunded)',
  2: 'Escrow Funded (Awaiting Payment)',
  3: 'Payment Claimed (Buyer Submitted)',
  4: 'Under Dispute',
  5: 'Released & Completed',
  6: 'Refunded to Seller',
  7: 'Cancelled',
};

/**
 * Normalizes fiat currency and amount into USD equivalent
 */
export function normalizeFiatToUSD(fiatAmount: bigint | number, fiatCurrency: string): number {
  const fiatNum = typeof fiatAmount === 'bigint' ? Number(fiatAmount) : fiatAmount;
  let curr = (fiatCurrency || '').trim().toUpperCase();

  // If hex encoded bytes32 string (e.g. 0x494e5200...)
  if (curr.startsWith('0x')) {
    try {
      const hex = curr.slice(2);
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substring(i, i + 2), 16);
        if (code === 0) break;
        str += String.fromCharCode(code);
      }
      curr = str.toUpperCase();
    } catch {
      // fallback
    }
  }

  if (curr.includes('INR')) {
    return fiatNum > 100 ? fiatNum / 88.0 : fiatNum;
  }
  return fiatNum;
}

/**
 * Reconciles the deterministic off-chain ledger across all 3 accounting domains:
 * 1. Vault Portfolio Accounting
 * 2. P2P Available Inventory
 * 3. P2P Escrow-Locked Inventory
 */
export function reconcileAccountLedger(params: ReconcileLedgerParams): UserDecoupledPortfolio {
  const {
    userAddress,
    totalWalletSharesRaw,
    onChainCostBasisRaw,
    currentSharePriceUSD,
    onChainPerformance,
    events = [],
    p2pTrades = [],
  } = params;

  const normalizedUser = userAddress?.toLowerCase() || '';
  const sharePrice = currentSharePriceUSD > 0 ? currentSharePriceUSD : 1.0;
  const onChainCostBasisUSD = Number(onChainCostBasisRaw) / 1e18;

  // ── 1. Identify Escrow-Locked Positions and Chronological Events ──
  const chronologicalEvents: LedgerEvent[] = [...events];
  const lockedPositions: EscrowLockedPosition[] = [];
  let sellerLockedSharesRaw = 0n;

  if (normalizedUser && p2pTrades.length > 0) {
    for (const trade of p2pTrades) {
      const isBuyer = trade.buyer.toLowerCase() === normalizedUser;
      const isSeller = trade.seller.toLowerCase() === normalizedUser;

      if (!isBuyer && !isSeller) continue;

      const state = trade.state;

      // ── ESCROW-LOCKED STATES: 2 (FUNDED), 3 (PAYMENT_SUBMITTED), 4 (DISPUTED) ──
      if (state === 2 || state === 3 || state === 4) {
        if (isSeller) {
          sellerLockedSharesRaw += trade.amount;
          const lockedValueUSD = (Number(trade.amount) / 1e18) * sharePrice;
          const origin: EscrowTradeOrigin =
            trade.origin || (onChainCostBasisRaw > 0n ? 'VAULT' : 'P2P');

          lockedPositions.push({
            tradeId: trade.tradeId,
            seller: trade.seller,
            buyer: trade.buyer,
            amount: trade.amount,
            amountFormatted: formatShares(trade.amount),
            origin,
            state,
            stateLabel: TRADE_STATE_LABELS[state] || 'Escrow Locked',
            role: 'SELLER',
            fiatAmount: trade.fiatAmount,
            fiatCurrency: trade.fiatCurrency,
            fiatValueUSD: normalizeFiatToUSD(trade.fiatAmount, trade.fiatCurrency),
            lockedValueUSD,
            formattedLockedValueUSD: formatUSD(lockedValueUSD),
          });
        } else if (isBuyer) {
          // Track incoming locked position for buyer visibility (does NOT grant available shares to buyer)
          const lockedValueUSD = (Number(trade.amount) / 1e18) * sharePrice;
          lockedPositions.push({
            tradeId: trade.tradeId,
            seller: trade.seller,
            buyer: trade.buyer,
            amount: trade.amount,
            amountFormatted: formatShares(trade.amount),
            origin: trade.origin || 'P2P',
            state,
            stateLabel: TRADE_STATE_LABELS[state] || 'Escrow Locked',
            role: 'BUYER',
            fiatAmount: trade.fiatAmount,
            fiatCurrency: trade.fiatCurrency,
            fiatValueUSD: normalizeFiatToUSD(trade.fiatAmount, trade.fiatCurrency),
            lockedValueUSD,
            formattedLockedValueUSD: formatUSD(lockedValueUSD),
          });
        }
      }

      // ── RELEASED STATE: 5 ──
      if (state === 5) {
        if (isBuyer) {
          const alreadyPresent = chronologicalEvents.some(
            (e) => e.type === 'P2P_BUY' && e.tradeId === trade.tradeId,
          );
          if (!alreadyPresent) {
            const costUSD = normalizeFiatToUSD(trade.fiatAmount, trade.fiatCurrency);
            chronologicalEvents.push({
              id: `p2p-buy-${trade.tradeId}`,
              type: 'P2P_BUY',
              timestamp: trade.paymentTimestamp || trade.fundingTimestamp || 0,
              sharesRaw: trade.amount,
              usdValue: costUSD,
              tradeId: trade.tradeId,
              origin: trade.origin || 'P2P',
            });
          }
        }

        if (isSeller) {
          const alreadyPresent = chronologicalEvents.some(
            (e) => e.type === 'P2P_SELL' && e.tradeId === trade.tradeId,
          );
          if (!alreadyPresent) {
            const revenueUSD = normalizeFiatToUSD(trade.fiatAmount, trade.fiatCurrency);
            chronologicalEvents.push({
              id: `p2p-sell-${trade.tradeId}`,
              type: 'P2P_SELL',
              timestamp: trade.paymentTimestamp || trade.fundingTimestamp || 0,
              sharesRaw: trade.amount,
              usdValue: revenueUSD,
              tradeId: trade.tradeId,
              origin: trade.origin,
            });
          }
        }
      }

      // ── REFUNDED STATE: 6 ──
      if (state === 6 && isSeller) {
        const alreadyPresent = chronologicalEvents.some(
          (e) => e.type === 'P2P_REFUND' && e.tradeId === trade.tradeId,
        );
        if (!alreadyPresent) {
          chronologicalEvents.push({
            id: `p2p-refund-${trade.tradeId}`,
            type: 'P2P_REFUND',
            timestamp: trade.paymentTimestamp || trade.fundingTimestamp || 0,
            sharesRaw: trade.amount,
            tradeId: trade.tradeId,
            origin: trade.origin,
          });
        }
      }
    }
  }

  // Sort events chronologically (oldest to newest)
  chronologicalEvents.sort((a, b) => a.timestamp - b.timestamp);

  // ── 2. Run Deterministic State Machine ──
  let vaultSharesRaw = 0n;
  let vaultCumulativeMintedRaw = 0n;
  let p2pActiveSharesRaw = 0n;
  let p2pCumulativeCostUSD = 0;
  let p2pRealizedPnLUSD = 0;
  let p2pTradesCount = 0;
  let p2pSoldFromVaultRaw = 0n;

  for (const evt of chronologicalEvents) {
    switch (evt.type) {
      case 'VAULT_DEPOSIT':
        vaultSharesRaw += evt.sharesRaw;
        vaultCumulativeMintedRaw += evt.sharesRaw;
        break;

      case 'VAULT_REDEEM':
        vaultSharesRaw = vaultSharesRaw >= evt.sharesRaw ? vaultSharesRaw - evt.sharesRaw : 0n;
        break;

      case 'P2P_BUY':
        p2pActiveSharesRaw += evt.sharesRaw;
        p2pCumulativeCostUSD += evt.usdValue ?? 0;
        p2pTradesCount++;
        break;

      case 'P2P_SELL':
        p2pTradesCount++;
        // If explicit origin is VAULT, or if seller has no P2P shares, sell from Vault
        if ((evt.origin === 'VAULT' || p2pActiveSharesRaw === 0n) && vaultSharesRaw > 0n) {
          const soldFromVault = vaultSharesRaw >= evt.sharesRaw ? evt.sharesRaw : vaultSharesRaw;
          p2pSoldFromVaultRaw += soldFromVault;
          vaultSharesRaw -= soldFromVault;
        } else if (p2pActiveSharesRaw >= evt.sharesRaw) {
          // Sold entirely from P2P available inventory (Weighted Average Cost)
          const shareFraction =
            p2pActiveSharesRaw > 0n ? Number(evt.sharesRaw) / Number(p2pActiveSharesRaw) : 0;
          const costBasisOfSold = p2pCumulativeCostUSD * shareFraction;
          const revenue = evt.usdValue ?? 0;
          p2pRealizedPnLUSD += revenue - costBasisOfSold;
          p2pCumulativeCostUSD = Math.max(0, p2pCumulativeCostUSD - costBasisOfSold);
          p2pActiveSharesRaw -= evt.sharesRaw;
        } else {
          // Sold from P2P first, remainder from Vault inventory
          const remainder = evt.sharesRaw - p2pActiveSharesRaw;
          if (vaultSharesRaw > 0n) {
            const soldFromVault = vaultSharesRaw >= remainder ? remainder : vaultSharesRaw;
            p2pSoldFromVaultRaw += soldFromVault;
            vaultSharesRaw -= soldFromVault;
          }
          if (p2pActiveSharesRaw > 0n) {
            const shareFractionP2P = Number(p2pActiveSharesRaw) / Number(evt.sharesRaw);
            const revenueP2P = (evt.usdValue ?? 0) * shareFractionP2P;
            p2pRealizedPnLUSD += revenueP2P - p2pCumulativeCostUSD;
            p2pCumulativeCostUSD = 0;
            p2pActiveSharesRaw = 0n;
          }
        }
        break;

      case 'P2P_REFUND':
        // Refund restores shares to active inventory without realizing any P&L
        break;

      case 'TRANSFER_IN':
        p2pActiveSharesRaw += evt.sharesRaw;
        break;

      case 'TRANSFER_OUT':
        if (p2pActiveSharesRaw >= evt.sharesRaw) {
          p2pActiveSharesRaw -= evt.sharesRaw;
        } else {
          const rem = evt.sharesRaw - p2pActiveSharesRaw;
          if (vaultSharesRaw > 0n) {
            const soldFromVault = vaultSharesRaw >= rem ? rem : vaultSharesRaw;
            p2pSoldFromVaultRaw += soldFromVault;
            vaultSharesRaw -= soldFromVault;
          }
          p2pActiveSharesRaw = 0n;
        }
        break;
    }
  }

  // ── 3. Reconcile with On-Chain Wallet Balance & CostBasisManager ──
  if (chronologicalEvents.length === 0 || vaultCumulativeMintedRaw === 0n) {
    if (onChainCostBasisRaw > 0n) {
      // User has on-chain cost basis from Vault deposits
      if (p2pActiveSharesRaw > 0n) {
        vaultSharesRaw =
          totalWalletSharesRaw >= p2pActiveSharesRaw
            ? totalWalletSharesRaw - p2pActiveSharesRaw
            : totalWalletSharesRaw;
      } else {
        vaultSharesRaw = totalWalletSharesRaw;
      }
    } else {
      // No on-chain vault cost basis: If user has P2P trades, all shares are P2P
      if (p2pActiveSharesRaw > 0n) {
        vaultSharesRaw = 0n;
        p2pActiveSharesRaw = totalWalletSharesRaw;
      } else {
        vaultSharesRaw = totalWalletSharesRaw;
      }
    }
  }

  // Cap shares safely to current actual wallet balance
  if (vaultSharesRaw + p2pActiveSharesRaw > totalWalletSharesRaw) {
    if (p2pActiveSharesRaw > totalWalletSharesRaw) {
      p2pActiveSharesRaw = totalWalletSharesRaw;
      vaultSharesRaw = 0n;
    } else {
      vaultSharesRaw = totalWalletSharesRaw - p2pActiveSharesRaw;
    }
  }

  // ── 4. Calculate Vault Portfolio Metrics (Domain 1) ──
  const vaultSharesNum = Number(vaultSharesRaw) / 1e18;
  let vaultPositionValueUSD = vaultSharesNum * sharePrice;

  // Derive Vault Cost Basis:
  // Scale down proportionally ONLY when Vault shares were disposed through P2P or secondary transfers
  // and the ledger had active deposit events reconstructing that specific vault position lifecycle.
  let vaultCostBasisUSD = onChainCostBasisUSD;
  if (
    vaultCumulativeMintedRaw > 0n &&
    p2pSoldFromVaultRaw > 0n &&
    vaultSharesRaw + p2pSoldFromVaultRaw > 0n
  ) {
    const fraction = Number(vaultSharesRaw) / Number(vaultSharesRaw + p2pSoldFromVaultRaw);
    vaultCostBasisUSD = onChainCostBasisUSD * fraction;
  } else if (
    vaultSharesRaw === 0n &&
    onChainCostBasisUSD > 0 &&
    p2pActiveSharesRaw === totalWalletSharesRaw
  ) {
    vaultCostBasisUSD = 0;
  }

  // Handle explicit on-chain performance struct if supplied and no P2P trade override
  if (
    onChainPerformance &&
    typeof onChainPerformance === 'object' &&
    (!p2pTrades || p2pTrades.length === 0)
  ) {
    if ('investedCapitalUSD' in onChainPerformance) {
      const perf = onChainPerformance as {
        investedCapitalUSD: bigint;
        currentValueUSD: bigint;
        unrealizedPnL: bigint;
      };
      vaultCostBasisUSD = Number(perf.investedCapitalUSD) / 1e18;
      vaultPositionValueUSD = Number(perf.currentValueUSD) / 1e18;
    } else if ('costBasisUSD' in onChainPerformance) {
      const cbm = onChainPerformance as { costBasisUSD: bigint; currentValueUSD: bigint };
      vaultCostBasisUSD = Number(cbm.costBasisUSD) / 1e18;
      vaultPositionValueUSD = Number(cbm.currentValueUSD) / 1e18;
    } else if (Array.isArray(onChainPerformance) && onChainPerformance.length >= 7) {
      vaultPositionValueUSD = Number(onChainPerformance[0]) / 1e18;
      vaultCostBasisUSD = Number(onChainPerformance[1]) / 1e18;
    } else if (Array.isArray(onChainPerformance) && onChainPerformance.length >= 4) {
      vaultCostBasisUSD = Number(onChainPerformance[0]) / 1e18;
      vaultPositionValueUSD = Number(onChainPerformance[1]) / 1e18;
    }
  }

  const vaultPnLUSD = vaultPositionValueUSD - vaultCostBasisUSD;
  const vaultROI = vaultCostBasisUSD >= 0.001 ? (vaultPnLUSD / vaultCostBasisUSD) * 100 : 0;
  const isProfitable = vaultPnLUSD >= 0;
  const avgEntryPriceUSD =
    vaultSharesNum > 0 && vaultCostBasisUSD > 0 ? vaultCostBasisUSD / vaultSharesNum : 0;

  // ── 5. Calculate P2P Trading Metrics (Domain 2) ──
  const p2pSharesNum = Number(p2pActiveSharesRaw) / 1e18;
  const p2pCurrentValueUSD = p2pSharesNum * sharePrice;
  const p2pUnrealizedPnLUSD = p2pCurrentValueUSD - p2pCumulativeCostUSD;

  // ── 6. Calculate P2P Escrow-Locked Inventory Metrics (Domain 3) ──
  const lockedSharesNum = Number(sellerLockedSharesRaw) / 1e18;
  const lockedValueUSD = lockedSharesNum * sharePrice;

  return {
    userAddress,
    totalWalletSharesRaw,
    totalWalletSharesFormatted: formatShares(totalWalletSharesRaw),
    vaultPortfolio: {
      portfolioSharesRaw: vaultSharesRaw,
      portfolioSharesFormatted: formatShares(vaultSharesRaw),
      portfolioInvestedCapitalUSD: vaultCostBasisUSD,
      portfolioCostBasisUSD: vaultCostBasisUSD,
      portfolioPositionValueUSD: vaultPositionValueUSD,
      portfolioPnLUSD: vaultPnLUSD,
      portfolioUnrealizedPnLUSD: vaultPnLUSD,
      portfolioRealizedPnLUSD: 0,
      portfolioROI: vaultROI,
      isProfitable,
      averageEntryPriceUSD: avgEntryPriceUSD,
      formattedInvestedUSD: formatUSD(vaultCostBasisUSD),
      formattedPositionValueUSD: formatUSD(vaultPositionValueUSD),
      formattedPnLUSD: formatPnLUSD(vaultPnLUSD),
      formattedROI: formatPnLPercent(vaultROI),
    },
    p2pTrading: {
      activeP2PSharesRaw: p2pActiveSharesRaw,
      activeP2PSharesFormatted: formatShares(p2pActiveSharesRaw),
      p2pAcquiredCostUSD: p2pCumulativeCostUSD,
      p2pCurrentValueUSD: p2pCurrentValueUSD,
      p2pUnrealizedPnLUSD: p2pUnrealizedPnLUSD,
      p2pRealizedPnLUSD: p2pRealizedPnLUSD,
      p2pTradesCount,
      hasP2PActivity: p2pTradesCount > 0 || p2pActiveSharesRaw > 0n,
      formattedP2PShares: formatShares(p2pActiveSharesRaw),
      formattedP2PCostUSD: formatUSD(p2pCumulativeCostUSD),
      formattedP2PCurrentValueUSD: formatUSD(p2pCurrentValueUSD),
      formattedP2PUnrealizedPnLUSD: formatPnLUSD(p2pUnrealizedPnLUSD),
      formattedP2PRealizedPnLUSD: formatPnLUSD(p2pRealizedPnLUSD),
    },
    escrowLocked: {
      lockedSharesRaw: sellerLockedSharesRaw,
      lockedSharesFormatted: formatShares(sellerLockedSharesRaw),
      lockedValueUSD,
      formattedLockedValueUSD: formatUSD(lockedValueUSD),
      lockedPositionsCount: lockedPositions.length,
      lockedPositions,
      hasLockedInventory: lockedPositions.length > 0 || sellerLockedSharesRaw > 0n,
    },
    hasP2PShares: p2pActiveSharesRaw > 0n,
    hasVaultShares: vaultSharesRaw > 0n,
    hasLockedShares: lockedPositions.length > 0 || sellerLockedSharesRaw > 0n,
    sharePriceUSD: sharePrice,
  };
}
