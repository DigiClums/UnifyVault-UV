'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import {
  X,
  Plus,
  Loader2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

interface CreateMarketplaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMarketplaceOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateMarketplaceOrderModalProps) {
  const { address: userAddress } = useAccount();
  const { createBuyOrder, createSellOrder, isSubmitting } = useMarketplaceActions();

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [priceStr, setPriceStr] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [minLimitStr, setMinLimitStr] = useState('');
  const [maxLimitStr, setMaxLimitStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  import { getTokenDecimals, getTokenSymbol } from '../../lib/explorer/eventRegistry';
  import { getChainTokens, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

  const defaultAsset = DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken;
  const [selectedAsset, setSelectedAsset] = useState<`0x${string}`>(defaultAsset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    const priceNum = parseFloat(priceStr);
    const amountNum = parseFloat(amountStr);
    const minLimitNum = minLimitStr ? parseFloat(minLimitStr) : 0;
    const maxLimitNum = maxLimitStr ? parseFloat(maxLimitStr) : amountNum;

    if (!priceNum || priceNum <= 0) {
      setError('Please enter a valid price in INR.');
      return;
    }

    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid crypto amount.');
      return;
    }

    if (minLimitNum > amountNum) {
      setError('Minimum limit cannot exceed total order amount.');
      return;
    }

    try {
      setError(null);
      const decimals = getTokenDecimals(selectedAsset);
      const amountBigInt = parseUnits(amountStr.trim(), decimals);
      const priceBigInt = BigInt(Math.floor(priceNum));
      const minLimitBigInt = parseUnits(minLimitStr ? minLimitStr.trim() : '0', decimals);
      const maxLimitBigInt = parseUnits(
        maxLimitStr ? maxLimitStr.trim() : amountStr.trim(),
        decimals,
      );

      if (side === 'BUY') {
        await createBuyOrder({
          asset: selectedAsset,
          amount: amountBigInt,
          price: priceBigInt,
          fiatCurrency: 'INR',
          minLimit: minLimitBigInt,
          maxLimit: maxLimitBigInt,
        });
      } else {
        await createSellOrder({
          asset: selectedAsset,
          amount: amountBigInt,
          price: priceBigInt,
          fiatCurrency: 'INR',
          minLimit: minLimitBigInt,
          maxLimit: maxLimitBigInt,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Order creation error:', err);
      setError(err?.message || 'Transaction failed or was rejected by user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-6 space-y-5 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#BFFF00] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]">
              <Plus className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground font-sans">
                Create Non-Custodial Limit Order
              </h3>
              <p className="text-xs text-muted-foreground">
                No counterparty required upfront • Non-custodial orderbook
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side Selector Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border-2 ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white border-black shadow-[3px_3px_0_#000]'
                : 'bg-background text-muted-foreground border-black/20 hover:bg-accent'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>BUY ORDER</span>
          </button>

          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border-2 ${
              side === 'SELL'
                ? 'bg-rose-600 text-white border-black shadow-[3px_3px_0_#000]'
                : 'bg-background text-muted-foreground border-black/20 hover:bg-accent'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>SELL ORDER</span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Order Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          {/* Asset Selection */}
          <div className="space-y-1">
            <label className="font-bold text-muted-foreground uppercase tracking-wider">
              Asset
            </label>
            <div className="p-3 rounded-xl border-2 border-black/10 dark:border-white/20 bg-accent/20 font-mono font-bold flex items-center justify-between">
              <span>UVBTCETH (Vault Basket Token)</span>
              <span className="text-[10px] bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded">
                Base Sepolia
              </span>
            </div>
          </div>

          {/* Unit Price Input */}
          <div className="space-y-1">
            <label className="font-bold text-muted-foreground uppercase tracking-wider">
              Unit Price (INR per UVBE)
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 500"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              required
            />
          </div>

          {/* Total Amount Input */}
          <div className="space-y-1">
            <label className="font-bold text-muted-foreground uppercase tracking-wider">
              Total Order Amount (UVBE)
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 100"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              required
            />
          </div>

          {/* Min & Max Limits Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-muted-foreground uppercase tracking-wider">
                Min Partial Limit
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 10"
                value={minLimitStr}
                onChange={(e) => setMinLimitStr(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-muted-foreground uppercase tracking-wider">
                Max Partial Limit
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 100"
                value={maxLimitStr}
                onChange={(e) => setMaxLimitStr(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              />
            </div>
          </div>

          {/* Non-Custodial Safety Note */}
          <div className="p-3 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#BFFF00] shrink-0" />
            <span>
              Order creation is non-custodial and does NOT lock collateral until a trade match
              occurs.
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !priceStr || !amountStr}
              className={`px-6 py-2.5 rounded-xl text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 min-h-[44px] flex items-center gap-2 ${
                side === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Order...</span>
                </>
              ) : (
                <span>{side === 'BUY' ? 'CREATE BUY ORDER' : 'CREATE SELL ORDER'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
