'use client';

import React from 'react';
import { RedeemForm } from '../../components/redeem/RedeemForm';

export default function RedeemPage() {
  return (
    <div className="py-6 space-y-6 max-w-2xl mx-auto">
      {/* Hero Header */}
      <div className="text-center space-y-1.5 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Share Redemption & Collateral Payout
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Burn UVBE index shares to receive USDC payout. Multi-asset vault collateral is unwound
          automatically via DEX router.
        </p>
      </div>

      {/* Redeem Execution Form */}
      <RedeemForm />
    </div>
  );
}
