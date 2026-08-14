'use client';

import React from 'react';
import { TransferForm } from '../../components/transfer/TransferForm';

export default function TransferPage() {
  return (
    <div className="py-5 sm:py-6 space-y-4 sm:space-y-5 max-w-2xl mx-auto">
      <div className="text-center space-y-1 px-4">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          UVBE Wallet-to-Wallet Transfer
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Transfer UVBE vault shares directly to another wallet. Gas is sponsored via Account
          Abstraction.
        </p>
      </div>
      <TransferForm />
    </div>
  );
}
