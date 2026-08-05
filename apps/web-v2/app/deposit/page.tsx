'use client';

import React from 'react';
import { DepositForm } from '../../components/deposit/DepositForm';

export default function DepositPage() {
  return (
    <div className="py-6 space-y-6">
      <div className="text-center max-w-lg mx-auto space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Vault Deposit & Share Minting
        </h1>
        <p className="text-xs text-slate-400">
          Deposit USDC collateral to mint index ownership shares. Atomic DEX swaps allocate
          collateral according to active StrategyManager target weights.
        </p>
      </div>
      <DepositForm />
    </div>
  );
}
