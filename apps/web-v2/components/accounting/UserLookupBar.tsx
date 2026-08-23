'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { Search, User, ShieldCheck, X, AlertCircle } from 'lucide-react';

export interface UserLookupBarProps {
  currentAddress: string;
  onSelectAddress: (address: string) => void;
}

export function UserLookupBar({ currentAddress, onSelectAddress }: UserLookupBarProps) {
  const { address: connectedAddress } = useAccount();
  const [inputValue, setInputValue] = useState<string>(currentAddress || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    const clean = inputValue.trim();
    if (!clean) {
      setValidationError('Please enter a valid 20-byte EVM wallet address.');
      return;
    }

    if (!isAddress(clean)) {
      setValidationError('Invalid address format. Must be a 42-character hex address (0x...).');
      return;
    }

    const checksummed = getAddress(clean);
    onSelectAddress(checksummed);
  };

  const handleInspectConnected = () => {
    if (connectedAddress) {
      setInputValue(connectedAddress);
      setValidationError(null);
      onSelectAddress(connectedAddress);
    }
  };

  const handleInspectAdmin = () => {
    const adminAddr = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '';
    if (adminAddr) {
      setInputValue(adminAddr);
      setValidationError(null);
      onSelectAddress(adminAddr);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setValidationError(null);
  };

  return (
    <div className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/50 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">User Accounting Inspector</h2>
            <p className="text-[11px] text-muted-foreground">
              Query on-chain cost basis, realized/unrealized PnL, and performance analytics for any
              wallet.
            </p>
          </div>
        </div>

        {/* Quick Inspector Actions */}
        <div className="flex items-center space-x-2">
          {connectedAddress && (
            <button
              type="button"
              onClick={handleInspectConnected}
              className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted border border-border-subtle text-[11px] font-semibold text-foreground transition-colors flex items-center space-x-1.5"
            >
              <User className="w-3 h-3 text-purple-400" />
              <span>Inspect My Wallet</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleInspectAdmin}
            className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted border border-border-subtle text-[11px] font-semibold text-foreground transition-colors flex items-center space-x-1.5"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Inspect Admin</span>
          </button>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSearch} className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter EVM wallet address (0x...)"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (validationError) setValidationError(null);
              }}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all pr-10"
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-glow flex items-center justify-center space-x-2 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Inspect Accounting</span>
          </button>
        </div>

        {validationError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}
      </form>
    </div>
  );
}
