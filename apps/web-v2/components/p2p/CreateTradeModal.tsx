'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, isAddress, type Address } from 'viem';
import { ShieldCheck, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useP2PActions } from '../../hooks/useP2PEscrow';
import { getChainTokens, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

interface CreateTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTradeModal({ isOpen, onClose, onSuccess }: CreateTradeModalProps) {
  const { address: userAddress, chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const { createTrade, isPending, userError, setUserError } = useP2PActions();

  const [buyer, setBuyer] = useState('');
  const [assetType, setAssetType] = useState<'ETH' | 'USDC' | 'WETH' | 'cbBTC' | 'UVBTCETH'>(
    'USDC',
  );
  const [amount, setAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [paymentWindowMinutes, setPaymentWindowMinutes] = useState('15');

  if (!isOpen) return null;

  const getAssetAddress = (): Address => {
    if (assetType === 'ETH') return '0x0000000000000000000000000000000000000000' as Address;
    if (assetType === 'USDC') return tokens.USDC;
    if (assetType === 'WETH') return tokens.WETH;
    if (assetType === 'cbBTC') return tokens.cbBTC;
    if (assetType === 'UVBTCETH')
      return (tokens.UVBTCETH || DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken) as Address;
    return tokens.USDC;
  };

  const getDecimals = (): number => {
    if (assetType === 'USDC') return 6;
    if (assetType === 'cbBTC') return 8;
    return 18;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    if (!userAddress) {
      setUserError('Please connect your Web3 wallet first.');
      return;
    }

    if (!isAddress(buyer)) {
      setUserError('Invalid buyer Ethereum wallet address.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setUserError('Crypto amount must be greater than zero.');
      return;
    }

    if (!fiatAmount || Number(fiatAmount) <= 0) {
      setUserError('Fiat amount must be greater than zero.');
      return;
    }

    try {
      const decimals = getDecimals();
      const cryptoAmountBigInt = parseUnits(amount, decimals);
      const fiatAmountBigInt = parseUnits(fiatAmount, 2);
      const assetAddress = getAssetAddress();
      const paymentWindowSeconds = Math.max(300, Number(paymentWindowMinutes) * 60);

      const isEth = assetType === 'ETH';

      await createTrade({
        buyer: buyer as Address,
        seller: userAddress,
        asset: assetAddress,
        amount: cryptoAmountBigInt,
        fiatAmount: fiatAmountBigInt,
        fiatCurrency,
        paymentWindowSeconds,
        valueEth: isEth ? cryptoAmountBigInt : 0n,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed creating trade:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000] p-6 space-y-5">
        <div className="flex items-center justify-between border-b pb-4 border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#BFFF00] border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground">
                Create Escrow Order
              </h3>
              <p className="text-xs text-muted-foreground">
                Non-custodial smart contract trade lock
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {userError && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{userError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Buyer Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Crypto Asset
              </label>
              <select
                value={assetType}
                onChange={(e) =>
                  setAssetType(e.target.value as 'ETH' | 'USDC' | 'WETH' | 'cbBTC' | 'UVBTCETH')
                }
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              >
                <option value="USDC">USDC</option>
                <option value="ETH">ETH (Native)</option>
                <option value="WETH">WETH</option>
                <option value="cbBTC">cbBTC</option>
                <option value="UVBTCETH">UVBTCETH (Index Shares)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Crypto Amount
              </label>
              <input
                type="number"
                step="any"
                placeholder="100.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Fiat Currency
              </label>
              <select
                value={fiatCurrency}
                onChange={(e) => setFiatCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Fiat Expected
              </label>
              <input
                type="number"
                step="any"
                placeholder="100.00"
                value={fiatAmount}
                onChange={(e) => setFiatAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Payment Window (Minutes)
            </label>
            <select
              value={paymentWindowMinutes}
              onChange={(e) => setPaymentWindowMinutes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
            >
              <option value="5">5 Minutes</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/10 font-bold text-xs hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isPending ? 'Creating Order...' : 'Create & Fund Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
