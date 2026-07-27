'use client';

import React from 'react';
import { RedeemForm } from '../../components/redeem/RedeemForm';

export default function RedeemPage() {
  return (
    <div className="py-6 space-y-6">
      <div className="text-center max-w-lg mx-auto space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Share Redemption & Collateral Payout
        </h1>
        <p className="text-xs text-slate-400">
          Burn UVBTCETH shares to receive USDC payout. Vault assets are automatically unwound via
          DEX router.
        </p>
      </div>
      <RedeemForm />
    </div>
  );
}
