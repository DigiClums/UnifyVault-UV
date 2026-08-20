'use client';

import React from 'react';
import { DepositForm } from '../../components/deposit/DepositForm';

export default function DepositPage() {
  return (
    <div className="py-5 sm:py-6 space-y-4 sm:space-y-5 max-w-2xl mx-auto">
      <div className="text-center space-y-1 px-4">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Deposit USDC
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Deposit USDC to receive index portfolio shares. Your deposit is automatically allocated
          between BTC and ETH based on current target weights.
        </p>
      </div>
      <DepositForm />
    </div>
  );
}
