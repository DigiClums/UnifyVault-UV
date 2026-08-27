'use client';

import React from 'react';
import { TransferForm } from '../../components/transfer/TransferForm';

export default function TransferPage() {
  return (
    <div className="w-full max-w-2xl mx-auto py-3 sm:py-6 px-1 sm:px-4 space-y-3 sm:space-y-5 box-border">
      <div className="text-center space-y-1 px-2">
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Transfer UVBE
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Send UVBE index shares directly to any wallet address. Gas fees can be sponsored for smart
          accounts.
        </p>
      </div>
      <TransferForm />
    </div>
  );
}
